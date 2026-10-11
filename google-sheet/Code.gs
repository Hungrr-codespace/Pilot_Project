/**
 * Hungrr – Google Sheet backend (Apps Script web app)
 *
 * Paste this whole file into the sheet's Extensions → Apps Script editor and deploy it as a web app
 * (see google-sheet/SETUP.md). The website then:
 *   GET  <web app URL>?action=menu   → reads Settings, Clusters, Restaurants, Dishes and QuickPicks
 *   GET  <web app URL>?action=status → opening hours and the pause switch (Settings: opens_at, closes_at,
 *                                      orders_paused, pause_message), checked again while a page is open
 *   POST {"action":"order","order":{...}}    → the order in Orders as "Awaiting payment" (customer details,
 *                                              dishes and totals) and its dishes in OrderItems
 *   POST {"action":"payment","order":{...}}  → the same order with its 12-digit UPI reference number, as
 *                                              "Payment to verify", and an alert to the team (Alerts tab)
 *   POST {"action":"track","order_id":"HG-…","phone":"98765…"} → the order's status and dishes for the
 *                                              tracking page, only if the phone number matches the order
 *
 * After pasting a new version, run setup() once from the editor (choose setup in the toolbar, then Run): it
 * asks for the permissions alerts need, adds anything new to the sheet, and sends a test alert.
 *
 * Each order keeps one row: sending it again updates that row. A payment never moves an order back, and a
 * status you have set by hand (Paid, Preparing…) is never overwritten.
 * Prices and totals are recalculated here from the sheet, so an order row never trusts the browser's numbers.
 * Columns are found by their name in row 1, so you can reorder them or add your own; missing ones are added.
 */

const MENU_TABS = ['Settings', 'Clusters', 'Restaurants', 'Dishes', 'QuickPicks'];
const ORDER_HEAD = ['order_id', 'created_at', 'status', 'status_at', 'customer_name', 'phone', 'address', 'upi_ref', 'paid_at',
  'restaurants', 'clusters', 'riders', 'items', 'item_total', 'gst', 'delivery', 'grand_total', 'site_total',
  'total_check', 'device', 'notes'];
const ITEM_HEAD = ['order_id', 'created_at', 'restaurant', 'dish_id', 'dish', 'qty', 'price', 'line_total'];
const STATUSES = ['Awaiting payment', 'Payment to verify', 'Paid', 'Preparing', 'Out for delivery', 'Delivered',
  'Cancelled'];
const CACHE_SECONDS = 60;   // the website sees sheet edits within about a minute
const STATUS_CACHE_SECONDS = 20;
const ID_PATTERN = /^HG-\d{6}-[A-Z0-9]{4}$/;
const NEW_SETTINGS = [   // added by setup() when missing
  ['opens_at', '11:00 AM', 'When orders open each day (Indian time)'],
  ['closes_at', '8:30 PM', 'Last time to place an order'],
  ['orders_paused', false, 'Tick to stop new orders right away (rain, rush, exams). Untick to open again.'],
  ['pause_message', '', 'Optional: shown to customers while paused, e.g. Back at 6 PM after the rain.']
];
const ALERT_SETTINGS = [
  ['alert_emails', '', 'Email addresses for alerts, separated by commas'],
  ['alert_on_new_order', false, 'Tick to also get an alert when an order is placed (before payment)'],
  ['telegram_bot_token', '', 'Optional: token of your Telegram bot (from @BotFather)'],
  ['telegram_chat_id', '', 'Optional: the chat or group the bot posts to']
];

// ------------------------------------------------------------------ menu (GET)
function doGet(e) {
  const p = (e && e.parameter) || {};
  if (p.action === 'status') return status_();
  if ((p.action || 'menu') !== 'menu') return json_({ ok: false, error: 'Unknown action' });
  const cache = CacheService.getScriptCache();
  if (!p.fresh) {
    const hit = cache.get('menu');
    if (hit) return text_(hit);
  }
  const body = JSON.stringify(readMenu_());
  try { cache.put('menu', body, CACHE_SECONDS); } catch (err) { /* menus over 100 KB are simply not cached */ }
  return text_(body);
}

function readMenu_() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const menu = { updated_at: new Date().toISOString() };
  MENU_TABS.forEach(function (name) { menu[name] = rows_(ss.getSheetByName(name)); });
  return menu;
}

// Opening hours and the pause switch, for the website's quick check.
function status_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('status');
  if (hit) return text_(hit);
  const set = settings_(SpreadsheetApp.getActiveSpreadsheet());
  const body = JSON.stringify({ ok: true, opens_at: set.opens_at || '', closes_at: set.closes_at || '',
    orders_paused: set.orders_paused === true || /^(true|yes|y|1)$/i.test(String(set.orders_paused || '')),
    pause_message: String(set.pause_message || '').slice(0, 160) });
  try { cache.put('status', body, STATUS_CACHE_SECONDS); } catch (err) { /* ignore */ }
  return text_(body);
}

// Runs by itself whenever someone edits the sheet by hand:
//  - the website sees the change straight away (cached menu and status are cleared)
//  - changing an order's status in Orders stamps the time in status_at ("Updated 5 min ago" when tracking)
function onEdit(e) {
  try {
    const cache = CacheService.getScriptCache();
    cache.remove('menu');
    cache.remove('status');
  } catch (err) { /* ignore */ }
  try {
    const range = e && e.range;
    if (!range || range.getSheet().getName() !== 'Orders') return;
    const sheet = range.getSheet();
    const head = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(function (h) { return String(h).trim(); });
    const statusCol = head.indexOf('status') + 1;
    const atCol = head.indexOf('status_at') + 1;
    if (!statusCol || !atCol || statusCol < range.getColumn() || statusCol > range.getLastColumn()) return;
    const first = Math.max(2, range.getRow());
    const last = range.getLastRow();
    if (last < first) return;
    const now = new Date();
    const stamps = [];
    for (let r = first; r <= last; r++) stamps.push([now]);
    sheet.getRange(first, atCol, stamps.length, 1).setValues(stamps);
  } catch (err) { /* never block an edit */ }
}

// ------------------------------------------------------------------ orders (POST)
function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'Bad request' }); }
  const action = body && body.action;
  if (action === 'track') return json_(track_(body));
  if ((action !== 'order' && action !== 'payment') || !body.order) return json_({ ok: false, error: 'Unknown action' });
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return json_(saveOrder_(body.order, action === 'payment'));
  } finally {
    lock.releaseLock();
  }
}

function saveOrder_(o, isPayment) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const id = String(o.order_id || '').trim().slice(0, 40);
  if (!/^HG-[A-Z0-9-]+$/i.test(id)) return { ok: false, error: 'Missing order ID' };
  const upiRef = String(o.upi_ref || '').replace(/\D/g, '');
  if (isPayment && !/^\d{12}$/.test(upiRef)) return { ok: false, error: 'The UPI reference number must be 12 digits' };

  const set = settings_(ss);
  const gstRate = num_(set.gst_percent, 5);
  const perRider = num_(set.delivery_charge_per_rider, 50);
  const dishes = index_(rows_(ss.getSheetByName('Dishes')), 'dish_id');
  const rests = index_(rows_(ss.getSheetByName('Restaurants')), 'restaurant_id');
  const clusters = index_(rows_(ss.getSheetByName('Clusters')), 'cluster_id');

  const lines = [];
  const notes = [];
  (Array.isArray(o.items) ? o.items : []).slice(0, 100).forEach(function (it) {
    const qty = Math.max(0, Math.min(99, Math.floor(num_(it.qty, 0))));
    if (!qty) return;
    const d = dishes[String(it.dish_id || '').trim()];
    if (!d) { notes.push('Not on the menu: ' + String(it.dish || it.dish_id || '?').slice(0, 60)); return; }
    const r = rests[String(d.restaurant_id).trim()] || {};
    const price = num_(d.price, 0);
    if (it.price !== undefined && num_(it.price, price) !== price) notes.push('Price changed for ' + d.name + ' (site ' + it.price + ', sheet ' + price + ')');
    lines.push({ dishId: String(d.dish_id), dish: String(d.name), restaurant: String(r.name || d.restaurant_id),
      cluster: String(r.cluster_id || ''), qty: qty, price: price });
  });
  if (!lines.length) return { ok: false, error: 'No items' };

  // Same maths as the website: GST on the item total, one rider (and one delivery charge) per cluster.
  const itemTotal = lines.reduce(function (s, l) { return s + l.qty * l.price; }, 0);
  const gst = Math.round(itemTotal * gstRate) / 100;
  const clusterIds = unique_(lines.map(function (l) { return l.cluster; }).filter(String));
  const riders = Math.max(1, clusterIds.length);
  const delivery = perRider * riders;
  const grand = Math.round((itemTotal + gst + delivery) * 100) / 100;
  const siteTotal = num_(o.grand_total, NaN);
  const check = isNaN(siteTotal) ? '' : (Math.abs(siteTotal - grand) < 0.01 ? 'OK' : 'CHECK: site showed ' + siteTotal);

  const orders = sheet_(ss, 'Orders', ORDER_HEAD);
  const col = columns_(orders, ORDER_HEAD);
  ensureStatusList_(orders, col.status);
  const rowNum = findRow_(orders, col.order_id, id);
  const width = orders.getLastColumn();
  const row = rowNum ? orders.getRange(rowNum, 1, 1, width).getValues()[0] : blankRow_(width);
  const current = function (name) { return row[col[name] - 1]; };

  // Status only moves forward: Awaiting payment → Payment to verify. Anything you set by hand stays.
  const status = String(current('status') || '').trim();
  const nextStatus = (!status || status === 'Awaiting payment') ? (isPayment ? 'Payment to verify' : 'Awaiting payment') : status;
  const isNewPayment = isPayment && (!status || status === 'Awaiting payment');
  const ref = isPayment ? upiRef : String(current('upi_ref') || '').replace(/\D/g, '');
  if (isPayment) {
    const usedOn = findRow_(orders, col.upi_ref, upiRef, rowNum);
    if (usedOn) notes.push('UPI ref also used on ' + orders.getRange(usedOn, col.order_id).getValue());
  }
  const customer = o.customer || {};
  const phone = String(customer.phone || '').replace(/\D/g, '').slice(-10);
  const now = new Date();
  const createdAt = current('created_at') || now;

  const values = {
    order_id: id,
    created_at: createdAt,
    status: nextStatus,
    status_at: nextStatus !== status ? now : current('status_at'),
    customer_name: safe_(customer.name),
    phone: phone ? "'+91 " + phone.slice(0, 5) + ' ' + phone.slice(5) : '',   // ' keeps it as text
    address: safe_(customer.address),
    upi_ref: ref ? "'" + ref : '',                                            // 12 digits as text, not 4.1E+11
    paid_at: isPayment ? now : current('paid_at'),
    restaurants: unique_(lines.map(function (l) { return l.restaurant; })).join(', '),
    clusters: clusterIds.map(function (c) { return (clusters[c] && clusters[c].label) || c; }).join(', '),
    riders: riders,
    items: lines.map(function (l) { return l.qty + ' × ' + l.dish + ' (' + l.restaurant + ')'; }).join('\n'),
    item_total: itemTotal, gst: gst, delivery: delivery, grand_total: grand,
    site_total: isNaN(siteTotal) ? '' : siteTotal,
    total_check: check,
    device: safe_(o.device),
    notes: safe_(notes.join('; '))
  };
  ORDER_HEAD.forEach(function (name) { row[col[name] - 1] = values[name]; });
  const rowAt = rowNum || orders.getLastRow() + 1;
  orders.getRange(rowAt, 1, 1, width).setValues([row]);

  // The order's dishes: replace any earlier rows for this order, so a changed cart is never counted twice.
  const items = sheet_(ss, 'OrderItems', ITEM_HEAD);
  const icol = columns_(items, ITEM_HEAD);
  deleteRows_(items, icol.order_id, id);
  const iwidth = items.getLastColumn();
  const itemRows = lines.map(function (l) {
    const r = blankRow_(iwidth);
    const v = { order_id: id, created_at: createdAt, restaurant: l.restaurant, dish_id: l.dishId, dish: l.dish,
      qty: l.qty, price: l.price, line_total: l.qty * l.price };
    ITEM_HEAD.forEach(function (name) { r[icol[name] - 1] = v[name]; });
    return r;
  });
  items.getRange(items.getLastRow() + 1, 1, itemRows.length, iwidth).setValues(itemRows);

  // Tell the team: always when a payment comes in to check, and for new orders if the Alerts tab asks for it.
  if (isNewPayment || (!isPayment && !rowNum)) {
    sendAlert_(ss, {
      kind: isNewPayment ? 'payment' : 'order', id: id, grand: grand, upiRef: ref,
      name: String(customer.name || ''), phone: phone, address: String(customer.address || ''),
      lines: lines, riders: riders, clusterNames: values.clusters, notes: notes.join('; '),
      link: ss.getUrl() + '#gid=' + orders.getSheetId() + '&range=A' + rowAt
    });
  }

  return { ok: true, order_id: id, status: nextStatus, grand_total: grand, total_check: check };
}

// ------------------------------------------------------------------ tracking (POST)
// Only answers when the phone number matches the order, and never sends back the name, phone, address or UPI
// reference number. A wrong ID and a wrong phone number get the same answer.
function track_(body) {
  const notFound = { ok: false, error: 'not_found' };
  const id = String(body.order_id || '').trim().toUpperCase();
  const phone = String(body.phone || '').replace(/\D/g, '').slice(-10);
  if (!ID_PATTERN.test(id) || phone.length !== 10) return notFound;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const orders = ss.getSheetByName('Orders');
  if (!orders || orders.getLastRow() < 2) return notFound;
  const col = headers_(orders);
  if (!col.order_id || !col.phone) return notFound;
  const rowNum = findRow_(orders, col.order_id, id);
  if (!rowNum) return notFound;
  const row = orders.getRange(rowNum, 1, 1, orders.getLastColumn()).getValues()[0];
  const get = function (name) { return col[name] ? row[col[name] - 1] : ''; };
  if (String(get('phone')).replace(/\D/g, '').slice(-10) !== phone) return notFound;

  const items = rows_(ss.getSheetByName('OrderItems'))
    .filter(function (r) { return String(r.order_id).trim() === id; })
    .map(function (r) { return { dish: String(r.dish || ''), qty: num_(r.qty, 0), restaurant: String(r.restaurant || '') }; });
  const iso = function (v) { return v instanceof Date ? v.toISOString() : String(v || ''); };
  return { ok: true, order: {
    order_id: id, status: String(get('status') || 'Awaiting payment'),
    created_at: iso(get('created_at')), paid_at: iso(get('paid_at')), status_at: iso(get('status_at')),
    restaurants: String(get('restaurants') || ''), riders: num_(get('riders'), 1),
    item_total: num_(get('item_total'), 0), gst: num_(get('gst'), 0), delivery: num_(get('delivery'), 0),
    grand_total: num_(get('grand_total'), 0), items: items
  } };
}

// ------------------------------------------------------------------ alerts
// Email (from your Google account) and/or a Telegram message for the team, as set in the Alerts tab.
// Emails carry the full order; Telegram messages leave out the customer's name, phone and address.
function sendAlert_(ss, a) {
  const sent = [];
  try {
    const cfg = alertSettings_(ss);
    if (a.kind === 'order' && !cfg.onNewOrder) return sent;
    const money = '₹' + (Math.round(a.grand * 100) / 100).toFixed(2).replace(/\.00$/, '');
    const ref = a.upiRef ? String(a.upiRef).replace(/(\d{4})(?=\d)/g, '$1 ') : '';
    const dishes = (a.lines || []).map(function (l) { return l.qty + ' × ' + l.dish + ' (' + l.restaurant + ')'; });
    const restaurants = unique_((a.lines || []).map(function (l) { return l.restaurant; })).join(', ');
    let subject, intro;
    if (a.kind === 'payment') {
      subject = 'Hungrr: payment to verify – ' + a.id + ' – ' + money;
      intro = ['A customer has paid and entered their UPI reference number.',
        'Check that ' + money + ' with UPI ref no. ' + ref + ' has arrived in your UPI app, then set the status to Paid.'];
    } else if (a.kind === 'order') {
      subject = 'Hungrr: new order – ' + a.id + ' – ' + money;
      intro = ['A new order is waiting for payment.'];
    } else {
      subject = 'Hungrr: test alert';
      intro = ['Alerts are working. You will get one like this when a customer has paid and needs checking.'];
    }
    if (cfg.emails.length) {
      const body = intro.concat(a.id ? ['', 'Order: ' + a.id, 'Amount: ' + money] : [], ref ? ['UPI ref no.: ' + ref] : [])
        .concat(a.name ? ['', 'Customer: ' + a.name + (a.phone ? ' · +91 ' + a.phone.slice(0, 5) + ' ' + a.phone.slice(5) : ''),
          'Deliver to: ' + a.address] : [])
        .concat(dishes.length ? [''].concat(dishes, ['Riders: ' + a.riders + (a.clusterNames ? ' (' + a.clusterNames + ')' : '')]) : [])
        .concat(a.notes ? ['', 'Notes: ' + a.notes] : [])
        .concat(a.link ? ['', 'Open the order: ' + a.link] : []);
      MailApp.sendEmail({ to: cfg.emails.join(','), subject: subject, body: body.join('\n') });
      sent.push('email');
    }
    if (cfg.telegramToken && cfg.telegramChat) {
      const head = a.kind === 'payment' ? '💰 Payment to verify' : a.kind === 'order' ? '🆕 New order (waiting for payment)' : '✅ Hungrr alerts are working';
      const text = [head].concat(a.id ? [a.id + ' · ' + money] : [], ref ? ['UPI ref: ' + ref] : [],
        restaurants ? [restaurants + ' · ' + a.riders + (a.riders === 1 ? ' rider' : ' riders')] : [],
        a.notes ? ['⚠️ ' + a.notes] : [], a.link ? ['Open: ' + a.link] : []).join('\n');
      const res = UrlFetchApp.fetch('https://api.telegram.org/bot' + cfg.telegramToken + '/sendMessage', {
        method: 'post', contentType: 'application/json', muteHttpExceptions: true,
        payload: JSON.stringify({ chat_id: cfg.telegramChat, text: text, disable_web_page_preview: true })
      });
      if (res.getResponseCode() === 200) sent.push('telegram');
      else console.error('Telegram alert failed: ' + res.getContentText());
    }
  } catch (err) {
    console.error('Alert failed: ' + err);   // an alert problem never stops an order being saved
  }
  return sent;
}

function alertSettings_(ss) {
  const set = {};
  rows_(ss.getSheetByName('Alerts')).forEach(function (r) { set[String(r.key).trim()] = r.value; });
  return {
    emails: String(set.alert_emails || '').split(/[,;\s]+/).filter(function (x) { return /@/.test(x); }),
    onNewOrder: set.alert_on_new_order === true || /^(true|yes|y|1)$/i.test(String(set.alert_on_new_order || '')),
    telegramToken: String(set.telegram_bot_token || '').trim(),
    telegramChat: String(set.telegram_chat_id || '').trim()
  };
}

// ------------------------------------------------------------------ setup (run once from the editor)
// Asks for the permissions alerts need, adds new Settings rows, the Alerts tab and the status_at column, and
// sends a test alert. Safe to run again: it only adds what is missing.
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  addKeyRows_(sheet_(ss, 'Settings', ['key', 'value', 'note']), NEW_SETTINGS);
  const alerts = sheet_(ss, 'Alerts', ['key', 'value', 'note']);
  const me = Session.getEffectiveUser().getEmail();
  addKeyRows_(alerts, ALERT_SETTINGS.map(function (r) { return r[0] === 'alert_emails' ? [r[0], me || '', r[2]] : r; }));
  // An empty alert_emails (as in the template) gets your own address
  const acol = headers_(alerts);
  const keys = alerts.getRange(1, acol.key, alerts.getLastRow(), 1).getValues();
  keys.forEach(function (k, i) {
    const cell = alerts.getRange(i + 1, acol.value);
    if (String(k[0]).trim() === 'alert_emails' && !String(cell.getValue()).trim() && me) cell.setValue(me);
  });
  const orders = sheet_(ss, 'Orders', ORDER_HEAD);
  columns_(orders, ORDER_HEAD);
  ensureStatusList_(orders, headers_(orders).status);
  CacheService.getScriptCache().removeAll(['menu', 'status']);
  const sent = sendAlert_(ss, { kind: 'test' });
  console.log(sent.length ? 'Test alert sent by ' + sent.join(' and ') + '.' : 'No alert sent: add an email address or Telegram details in the Alerts tab, then run setup again.');
}

function addKeyRows_(sheet, defaults) {
  const col = columns_(sheet, ['key', 'value', 'note']);
  const have = rows_(sheet).map(function (r) { return String(r.key).trim(); });
  defaults.forEach(function (d) {
    if (have.indexOf(d[0]) >= 0) return;
    const rowAt = sheet.getLastRow() + 1;
    const row = blankRow_(sheet.getLastColumn());
    row[col.key - 1] = d[0];
    row[col.value - 1] = typeof d[1] === 'string' && d[1] ? "'" + d[1] : d[1];   // times stay as typed
    row[col.note - 1] = d[2];
    sheet.getRange(rowAt, 1, 1, row.length).setValues([row]);
    if (typeof d[1] === 'boolean') sheet.getRange(rowAt, col.value).insertCheckboxes();
  });
}

// ------------------------------------------------------------------ helpers
// A tab's rows as objects keyed by the first row. A cell holding only a time (e.g. 11:00 AM typed into
// opens_at) comes out as "11:00"; dates come out as ISO text.
function rows_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const tz = sheet.getParent().getSpreadsheetTimeZone();
  const values = sheet.getDataRange().getValues();
  const head = values.shift().map(function (h) { return String(h).trim(); });
  const cell = function (v) {
    if (!(v instanceof Date)) return v;
    return v.getFullYear() < 1901 ? Utilities.formatDate(v, tz, 'HH:mm') : v.toISOString();
  };
  return values
    .filter(function (r) { return r.some(function (c) { return c !== '' && c !== null; }); })
    .map(function (r) {
      const o = {};
      head.forEach(function (h, i) { if (h) o[h] = cell(r[i]); });
      return o;
    });
}

function settings_(ss) {
  const set = {};
  rows_(ss.getSheetByName('Settings')).forEach(function (r) { set[String(r.key).trim()] = r.value; });
  return set;
}

// Column numbers by header name, without changing the sheet (for reading).
function headers_(sheet) {
  const col = {};
  if (sheet.getLastColumn() < 1) return col;
  sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].forEach(function (h, i) {
    const name = String(h).trim();
    if (name && !col[name]) col[name] = i + 1;
  });
  return col;
}

function sheet_(ss, name, head) {
  let sh = ss.getSheetByName(name);
  if (!sh) sh = ss.insertSheet(name);
  if (sh.getLastRow() === 0) {
    sh.getRange(1, 1, 1, head.length).setValues([head]).setFontWeight('bold');
    sh.setFrozenRows(1);
  }
  return sh;
}

// Column numbers by header name (1-based). Headers missing from row 1 are added after the last column, so a
// sheet made from an older template keeps working.
function columns_(sheet, head) {
  const width = Math.max(sheet.getLastColumn(), 1);
  const names = sheet.getRange(1, 1, 1, width).getValues()[0].map(function (h) { return String(h).trim(); });
  const missing = head.filter(function (h) { return names.indexOf(h) < 0; });
  if (missing.length) {
    let start = names.length;
    while (start > 0 && !names[start - 1]) start--;   // after the last named column
    sheet.getRange(1, start + 1, 1, missing.length).setValues([missing]).setFontWeight('bold');
    missing.forEach(function (h, i) { names[start + i] = h; });
  }
  const col = {};
  names.forEach(function (h, i) { if (h && !col[h]) col[h] = i + 1; });
  return col;
}

// Row number of the first data row whose `column` equals `value` (ignoring row `skip`), or 0.
function findRow_(sheet, column, value, skip) {
  const last = sheet.getLastRow();
  if (last < 2 || !value) return 0;
  const cells = sheet.getRange(2, column, last - 1, 1).getValues();
  for (let i = 0; i < cells.length; i++) {
    if (i + 2 !== skip && String(cells[i][0]).trim() === String(value)) return i + 2;
  }
  return 0;
}

function deleteRows_(sheet, column, value) {
  const last = sheet.getLastRow();
  if (last < 2) return;
  const cells = sheet.getRange(2, column, last - 1, 1).getValues();
  for (let i = cells.length - 1; i >= 0; i--) {
    if (String(cells[i][0]).trim() === value) sheet.deleteRow(i + 2);
  }
}

function blankRow_(width) {
  const row = [];
  for (let i = 0; i < width; i++) row.push('');
  return row;
}

// The status column's dropdown, with "Awaiting payment" added for sheets made from an older template.
function ensureStatusList_(sheet, column) {
  const rule = sheet.getRange(2, column).getDataValidation();
  const list = rule ? rule.getCriteriaValues()[0] : null;
  if (Array.isArray(list) && list.indexOf(STATUSES[0]) >= 0) return;
  const dropdown = SpreadsheetApp.newDataValidation().requireValueInList(STATUSES, true).setAllowInvalid(true).build();
  sheet.getRange(2, column, Math.max(1, sheet.getMaxRows() - 1), 1).setDataValidation(dropdown);
}

function index_(rows, key) {
  const o = {};
  rows.forEach(function (r) { const k = String(r[key] === undefined ? '' : r[key]).trim(); if (k) o[k] = r; });
  return o;
}

function unique_(a) { return a.filter(function (x, i) { return a.indexOf(x) === i; }); }

function num_(v, d) {
  if (typeof v === 'number') return v;
  const s = String(v === undefined || v === null ? '' : v).replace(/[^0-9.-]/g, '');
  const n = Number(s);
  return s !== '' && isFinite(n) ? n : d;
}

// Text from the browser never starts a formula in the sheet.
function safe_(v) {
  const s = String(v === undefined || v === null ? '' : v).slice(0, 300);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function text_(s) { return ContentService.createTextOutput(s).setMimeType(ContentService.MimeType.JSON); }
function json_(o) { return text_(JSON.stringify(o)); }
