/**
 * Hungrr – Google Sheet backend (Apps Script web app)
 *
 * Paste this whole file into the sheet's Extensions → Apps Script editor and deploy it as a web app
 * (see google-sheet/SETUP.md). The website then:
 *   GET  <web app URL>?action=menu   → reads Settings, Clusters, Restaurants, Dishes and QuickPicks
 *   POST {"action":"order","order":{...}}    → the order in Orders as "Awaiting payment" (customer details,
 *                                              dishes and totals) and its dishes in OrderItems
 *   POST {"action":"payment","order":{...}}  → the same order with its 12-digit UPI reference number, as
 *                                              "Payment to verify"
 *
 * Each order keeps one row: sending it again updates that row. A payment never moves an order back, and a
 * status you have set by hand (Paid, Preparing…) is never overwritten.
 * Prices and totals are recalculated here from the sheet, so an order row never trusts the browser's numbers.
 * Columns are found by their name in row 1, so you can reorder them or add your own; missing ones are added.
 */

const MENU_TABS = ['Settings', 'Clusters', 'Restaurants', 'Dishes', 'QuickPicks'];
const ORDER_HEAD = ['order_id', 'created_at', 'status', 'customer_name', 'phone', 'address', 'upi_ref', 'paid_at',
  'restaurants', 'clusters', 'riders', 'items', 'item_total', 'gst', 'delivery', 'grand_total', 'site_total',
  'total_check', 'device', 'notes'];
const ITEM_HEAD = ['order_id', 'created_at', 'restaurant', 'dish_id', 'dish', 'qty', 'price', 'line_total'];
const STATUSES = ['Awaiting payment', 'Payment to verify', 'Paid', 'Preparing', 'Out for delivery', 'Delivered',
  'Cancelled'];
const CACHE_SECONDS = 60;   // the website sees sheet edits within about a minute

// ------------------------------------------------------------------ menu (GET)
function doGet(e) {
  const p = (e && e.parameter) || {};
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

// Clears the cached menu as soon as someone edits the sheet by hand.
function onEdit() {
  try { CacheService.getScriptCache().remove('menu'); } catch (err) { /* ignore */ }
}

// ------------------------------------------------------------------ orders (POST)
function doPost(e) {
  let body;
  try { body = JSON.parse(e.postData.contents); } catch (err) { return json_({ ok: false, error: 'Bad request' }); }
  const action = body && body.action;
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

  const set = {};
  rows_(ss.getSheetByName('Settings')).forEach(function (r) { set[String(r.key).trim()] = r.value; });
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
  orders.getRange(rowNum || orders.getLastRow() + 1, 1, 1, width).setValues([row]);

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

  return { ok: true, order_id: id, status: nextStatus, grand_total: grand, total_check: check };
}

// ------------------------------------------------------------------ helpers
function rows_(sheet) {
  if (!sheet || sheet.getLastRow() < 2) return [];
  const values = sheet.getDataRange().getValues();
  const head = values.shift().map(function (h) { return String(h).trim(); });
  return values
    .filter(function (r) { return r.some(function (c) { return c !== '' && c !== null; }); })
    .map(function (r) {
      const o = {};
      head.forEach(function (h, i) { if (h) o[h] = r[i] instanceof Date ? r[i].toISOString() : r[i]; });
      return o;
    });
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
