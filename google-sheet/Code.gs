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
 *   POST {"action":"review","review":{...}}  → a customer's rating and feedback in Reviews (one per order,
 *                                              only for a paid order whose phone number matches)
 *   GET  <web app URL>?action=reviews → the ratings summary, and the reviews the customer agreed to show and
 *                                      the team approved (approved = Yes in Reviews)
 *   POST {"action":"account_start","phone":"98765…"}         → is there an account (khata) for this number?
 *   POST {"action":"sign_up","phone":…,"name":…,"pin":"……"}   → a new account in Users, signed in
 *   POST {"action":"sign_in","phone":…,"pin":"……"}           → signed in (5 wrong PINs lock it for 15 minutes)
 *   POST {"action":"account","token":…,"orders":true}        → the account's name, and its orders
 *   POST {"action":"update_name","token":…,"name":…}          → a new name on the account
 *   POST {"action":"claim_order","token":…,"order_id":"HG-…"} → an order placed before signing in, added to
 *                                                               the account (its phone number must match)
 *
 * Accounts: one row per phone number in Users. The PIN itself is never stored: only a scrambled version
 * (HMAC-SHA256 with a random salt and a secret kept in the script's properties, not in the sheet). A sign-in
 * gives the browser a token signed with the same secret; it lasts 60 days, and stops working as soon as the
 * PIN changes or the team clears it (to reset a forgotten PIN). Orders placed while signed in are linked to
 * the account in the Orders tab's `account` column.
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
  'total_check', 'device', 'notes', 'account'];
const ITEM_HEAD = ['order_id', 'created_at', 'restaurant', 'dish_id', 'dish', 'qty', 'price', 'line_total'];
const STATUSES = ['Awaiting payment', 'Payment to verify', 'Paid', 'Preparing', 'Out for delivery', 'Delivered',
  'Cancelled'];
const CACHE_SECONDS = 60;   // the website sees sheet edits within about a minute
const STATUS_CACHE_SECONDS = 20;
const REVIEW_HEAD = ['order_id', 'created_at', 'updated_at', 'rating', 'tags', 'comment', 'improve', 'name',
  'show_on_site', 'approved', 'restaurants', 'order_status'];
const GOOD_TAGS = ['On time', 'Hot & fresh', 'Right order', 'Good packaging', 'Easy to order', 'Fair price', 'Friendly rider'];
const BAD_TAGS = ['Late', 'Cold food', 'Wrong or missing item', 'Poor packaging', 'Hard to order', 'Too pricey', 'Rider issue'];
const MAX_SHOWN_REVIEWS = 30;
const ID_PATTERN = /^HG-\d{6}-[A-Z0-9]{4}$/;
const USER_HEAD = ['phone', 'name', 'created_at', 'updated_at', 'last_sign_in_at', 'pin_hash', 'pin_salt',
  'failed_tries', 'locked_until', 'notes'];
const PIN_TRIES = 5;          // wrong PINs in a row before an account is locked
const LOCK_MINUTES = 15;
const SESSION_DAYS = 60;      // how long a sign-in lasts on a device
const MAX_ACCOUNT_ORDERS = 50;
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
  if (p.action === 'reviews') return reviews_();
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
    cache.remove('reviews');
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
  if (action === 'account_start') return json_(accountStart_(body));
  if (action === 'account') return json_(account_(body));
  if (ACCOUNT_WRITES[action]) {
    const accountLock = LockService.getScriptLock();
    accountLock.waitLock(20000);
    try { return json_(ACCOUNT_WRITES[action](body)); } finally { accountLock.releaseLock(); }
  }
  if (action === 'review') {
    const reviewLock = LockService.getScriptLock();
    reviewLock.waitLock(20000);
    try { return json_(saveReview_(body.review || {})); } finally { reviewLock.releaseLock(); }
  }
  if ((action !== 'order' && action !== 'payment') || !body.order) return json_({ ok: false, error: 'Unknown action' });
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return json_(saveOrder_(body.order, action === 'payment', body.token));
  } finally {
    lock.releaseLock();
  }
}

function saveOrder_(o, isPayment, token) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const signedIn = token ? readToken_(ss, token) : null;   // an order placed while signed in
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
  // Signed in: the order belongs to the account, and its phone number is the account's.
  const linked = String(current('account') || '').replace(/\D/g, '') || (signedIn ? signedIn.phone : '');
  const phone = signedIn ? signedIn.phone : String(customer.phone || '').replace(/\D/g, '').slice(-10);
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
    notes: safe_(notes.join('; ')),
    account: linked ? "'" + linked : ''
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
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const found = findOrder_(ss, body.order_id, body.phone);
  if (!found) return notFound;
  const id = found.id;
  const get = found.get;

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

// The order with this ID, if the phone number matches it: { id, rowNum, get(column name) }, or null.
function findOrder_(ss, orderId, phoneInput) {
  const id = String(orderId || '').trim().toUpperCase();
  const phone = String(phoneInput || '').replace(/\D/g, '').slice(-10);
  if (!ID_PATTERN.test(id) || phone.length !== 10) return null;
  const orders = ss.getSheetByName('Orders');
  if (!orders || orders.getLastRow() < 2) return null;
  const col = headers_(orders);
  if (!col.order_id || !col.phone) return null;
  const rowNum = findRow_(orders, col.order_id, id);
  if (!rowNum) return null;
  const row = orders.getRange(rowNum, 1, 1, orders.getLastColumn()).getValues()[0];
  const get = function (name) { return col[name] ? row[col[name] - 1] : ''; };
  if (String(get('phone')).replace(/\D/g, '').slice(-10) !== phone) return null;
  return { id: id, rowNum: rowNum, get: get };
}

// ------------------------------------------------------------------ reviews
// One review per order, from the customer who placed it (order ID + phone number), once the order is paid for.
// Sending it again updates the same row; changed words go back to waiting for approval.
function saveReview_(r) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const found = findOrder_(ss, r.order_id, r.phone);
  if (!found) return { ok: false, error: 'not_found' };
  const orderStatus = String(found.get('status') || '').trim();
  if (!orderStatus || orderStatus === 'Awaiting payment') return { ok: false, error: 'not_paid' };
  const rating = Math.round(num_(r.rating, 0));
  if (rating < 1 || rating > 5) return { ok: false, error: 'Rating must be 1 to 5' };
  const allowed = rating >= 4 ? GOOD_TAGS : BAD_TAGS;
  const tags = unique_((Array.isArray(r.tags) ? r.tags : []).map(String).filter(function (t) { return allowed.indexOf(t) >= 0; }));
  const tidy = function (v, max) { return safe_(String(v || '').replace(/\s+/g, ' ').trim().slice(0, max)); };
  const comment = tidy(r.comment, 280);
  const consent = r.consent === true;

  const sheet = sheet_(ss, 'Reviews', REVIEW_HEAD);
  const col = columns_(sheet, REVIEW_HEAD);
  ensureList_(sheet, col.approved, ['Yes', 'No']);
  const rowNum = findRow_(sheet, col.order_id, found.id);
  const width = sheet.getLastColumn();
  const row = rowNum ? sheet.getRange(rowNum, 1, 1, width).getValues()[0] : blankRow_(width);
  const current = function (name) { return row[col[name] - 1]; };
  const now = new Date();
  const sameWords = rowNum && String(current('comment')) === comment && String(current('name')) === tidy(r.name, 30);
  const before = rowNum ? num_(current('rating'), 0) : 0;   // read before the row is overwritten below
  const values = {
    order_id: found.id,
    created_at: current('created_at') || now,
    updated_at: now,
    rating: rating,
    tags: tags.join(', '),
    comment: comment,
    improve: tidy(r.improve, 400),
    name: tidy(r.name, 30),
    show_on_site: consent ? 'Yes' : 'No',
    approved: sameWords ? current('approved') : '',   // new or changed words wait for the team
    restaurants: String(found.get('restaurants') || ''),
    order_status: orderStatus
  };
  REVIEW_HEAD.forEach(function (name) { row[col[name] - 1] = values[name]; });
  sheet.getRange(rowNum || sheet.getLastRow() + 1, 1, 1, width).setValues([row]);
  try { CacheService.getScriptCache().remove('reviews'); } catch (err) { /* ignore */ }

  // A low rating is worth a call back: tell the team (only when it is new or has just dropped).
  if (rating <= 2 && (!rowNum || before > 2 || before === 0)) {
    sendAlert_(ss, { kind: 'review', id: found.id, rating: rating, reviewTags: tags, comment: comment,
      improve: values.improve, name: values.name, restaurantsText: values.restaurants,
      link: ss.getUrl() + '#gid=' + sheet.getSheetId() });
  }
  return { ok: true, approved: values.approved === 'Yes' };
}

// The ratings summary (from every review, so it is never just the good ones) and the reviews that may be
// shown: the customer ticked "show on the website" and the team set approved to Yes. No phone numbers, order IDs
// or private suggestions leave the sheet.
function reviews_() {
  const cache = CacheService.getScriptCache();
  const hit = cache.get('reviews');
  if (hit) return text_(hit);
  const rows = rows_(SpreadsheetApp.getActiveSpreadsheet().getSheetByName('Reviews'))
    .filter(function (r) { const n = num_(r.rating, 0); return n >= 1 && n <= 5; });
  const stars = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
  const tagCount = {};
  let total = 0;
  rows.forEach(function (r) {
    const n = Math.round(num_(r.rating, 0));
    stars[n]++;
    total += n;
    String(r.tags || '').split(',').map(function (t) { return t.trim(); }).filter(String)
      .forEach(function (t) { tagCount[t] = (tagCount[t] || 0) + 1; });
  });
  const yes = function (v) { return v === true || /^(yes|true|y|1)$/i.test(String(v || '').trim()); };
  const shown = rows
    .filter(function (r) { return yes(r.show_on_site) && yes(r.approved); })
    .sort(function (a, b) { return String(b.updated_at || b.created_at).localeCompare(String(a.updated_at || a.created_at)); })
    .slice(0, MAX_SHOWN_REVIEWS)
    .map(function (r) {
      return { name: String(r.name || ''), rating: Math.round(num_(r.rating, 0)),
        tags: String(r.tags || '').split(',').map(function (t) { return t.trim(); }).filter(String),
        comment: String(r.comment || '').replace(/^'/, ''), date: String(r.created_at || ''),
        restaurants: String(r.restaurants || '') };
    });
  const body = JSON.stringify({ ok: true,
    summary: { count: rows.length, average: rows.length ? Math.round(total / rows.length * 100) / 100 : 0, stars: stars, tags: tagCount },
    reviews: shown });
  try { cache.put('reviews', body, CACHE_SECONDS); } catch (err) { /* ignore */ }
  return text_(body);
}

// ------------------------------------------------------------------ accounts (the customer's khata)
// Sign up and sign in with a phone number and a 6-digit PIN. Only the name can be changed afterwards: the phone
// number is the account's key, so changing it goes through the team.
const ACCOUNT_WRITES = {
  sign_up: function (b) { return signUp_(b); },
  sign_in: function (b) { return signIn_(b); },
  update_name: function (b) { return updateName_(b); },
  claim_order: function (b) { return claimOrder_(b); }
};

// Which screen to show after the phone number: new, existing, reset (the team cleared the PIN) or locked.
function accountStart_(b) {
  const phone = phone10_(b.phone);
  if (!phone) return { ok: false, error: 'bad_phone' };
  const user = findUser_(SpreadsheetApp.getActiveSpreadsheet(), phone);
  if (!user) return { ok: true, status: 'new' };
  if (!String(user.get('pin_hash') || '')) return { ok: true, status: 'reset' };
  const minutes = lockedMinutes_(user);
  return minutes ? { ok: true, status: 'locked', minutes: minutes } : { ok: true, status: 'existing' };
}

// A new account, or a new PIN for an account whose PIN the team cleared.
function signUp_(b) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const phone = phone10_(b.phone);
  if (!phone) return { ok: false, error: 'bad_phone' };
  const pin = String(b.pin || '');
  if (!pinOk_(pin)) return { ok: false, error: 'weak_pin' };
  const existing = findUser_(ss, phone);
  if (existing && String(existing.get('pin_hash') || '')) return { ok: false, error: 'exists' };
  const name = tidyName_(b.name);
  if (!existing && name.length < 2) return { ok: false, error: 'bad_name' };

  const salt = Utilities.getUuid();
  const hash = pinHash_(salt, pin);
  const now = new Date();
  if (existing) {
    existing.write({ pin_hash: "'" + hash, pin_salt: "'" + salt, failed_tries: 0, locked_until: '',
      updated_at: now, last_sign_in_at: now });
    return { ok: true, token: makeToken_(phone, hash), user: publicUser_(findUser_(ss, phone)) };
  }
  const u = usersTab_(ss);
  const row = blankRow_(u.sheet.getLastColumn());
  const values = { phone: "'" + phone, name: safe_(name), created_at: now, updated_at: now, last_sign_in_at: now,
    pin_hash: "'" + hash, pin_salt: "'" + salt, failed_tries: 0, locked_until: '', notes: '' };
  USER_HEAD.forEach(function (h) { row[u.col[h] - 1] = values[h]; });
  u.sheet.getRange(u.sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
  return { ok: true, token: makeToken_(phone, hash), user: publicUser_(findUser_(ss, phone)) };
}

function signIn_(b) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const phone = phone10_(b.phone);
  if (!phone) return { ok: false, error: 'bad_phone' };
  const user = findUser_(ss, phone);
  if (!user) return { ok: false, error: 'not_found' };
  const stored = String(user.get('pin_hash') || '');
  if (!stored) return { ok: false, error: 'reset' };
  const minutes = lockedMinutes_(user);
  if (minutes) return { ok: false, error: 'locked', minutes: minutes };

  if (!sameText_(pinHash_(String(user.get('pin_salt') || ''), String(b.pin || '')), stored)) {
    const tries = num_(user.get('failed_tries'), 0) + 1;
    if (tries >= PIN_TRIES) {
      user.write({ failed_tries: 0, locked_until: new Date(Date.now() + LOCK_MINUTES * 60000) });
      return { ok: false, error: 'locked', minutes: LOCK_MINUTES };
    }
    user.write({ failed_tries: tries });
    return { ok: false, error: 'wrong_pin', tries_left: PIN_TRIES - tries };
  }
  user.write({ failed_tries: 0, locked_until: '', last_sign_in_at: new Date() });
  return { ok: true, token: makeToken_(phone, stored), user: publicUser_(user) };
}

// The signed-in account, and with `orders` its orders (newest first).
function account_(b) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const user = readToken_(ss, b.token);
  if (!user) return { ok: false, error: 'signed_out' };
  const out = { ok: true, user: publicUser_(user) };
  if (b.orders) {
    const found = accountOrders_(ss, user.phone);
    out.orders = found.orders;
    out.unclaimed = found.unclaimed;
  }
  return out;
}

function updateName_(b) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const user = readToken_(ss, b.token);
  if (!user) return { ok: false, error: 'signed_out' };
  const name = tidyName_(b.name);
  if (name.length < 2) return { ok: false, error: 'bad_name' };
  user.write({ name: safe_(name), updated_at: new Date() });
  return { ok: true, user: publicUser_(findUser_(ss, user.phone)) };
}

// An order placed before signing in joins the account when its phone number is the account's.
function claimOrder_(b) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const user = readToken_(ss, b.token);
  if (!user) return { ok: false, error: 'signed_out' };
  const found = findOrder_(ss, b.order_id, user.phone);
  if (!found) return { ok: false, error: 'not_found' };
  const owner = String(found.get('account') || '').replace(/\D/g, '');
  if (owner && owner !== user.phone) return { ok: false, error: 'not_found' };
  const status = String(found.get('status') || '').trim();
  if (!status || status === 'Awaiting payment') return { ok: false, error: 'not_paid' };
  if (owner) return { ok: true, order_id: found.id, already: true };
  const orders = ss.getSheetByName('Orders');
  const col = columns_(orders, ORDER_HEAD);
  orders.getRange(found.rowNum, col.account).setValue("'" + user.phone);
  return { ok: true, order_id: found.id };
}

// The account's orders (paid or later; orders still awaiting payment were never finished), with their dishes
// and the customer's review, and how many earlier orders with this phone number are not linked yet.
function accountOrders_(ss, phone) {
  const all = rows_(ss.getSheetByName('Orders'));
  const started = function (r) { const s = String(r.status || '').trim(); return s && s !== 'Awaiting payment'; };
  const mine = all.filter(function (r) { return phone10_(r.account) === phone && started(r); })
    .sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); })
    .slice(0, MAX_ACCOUNT_ORDERS);
  const unclaimed = all.filter(function (r) {
    return !String(r.account || '').trim() && phone10_(r.phone) === phone && started(r);
  }).length;
  if (!mine.length) return { orders: [], unclaimed: unclaimed };

  const ids = {};
  mine.forEach(function (r) { ids[String(r.order_id).trim()] = []; });
  rows_(ss.getSheetByName('OrderItems')).forEach(function (r) {
    const list = ids[String(r.order_id).trim()];
    if (list) list.push({ dish: String(r.dish || ''), qty: num_(r.qty, 0), restaurant: String(r.restaurant || ''),
      price: num_(r.price, 0), line_total: num_(r.line_total, 0) });
  });
  const yes = function (v) { return v === true || /^(yes|true|y|1)$/i.test(String(v || '').trim()); };
  const reviews = {};
  rows_(ss.getSheetByName('Reviews')).forEach(function (r) {
    const shown = yes(r.show_on_site);
    const approved = String(r.approved || '').trim();
    reviews[String(r.order_id).trim()] = {
      rating: Math.round(num_(r.rating, 0)),
      state: !shown ? 'private' : yes(approved) ? 'shown' : approved ? 'not_shown' : 'waiting'
    };
  });
  const iso = function (v) { return v instanceof Date ? v.toISOString() : String(v || ''); };
  return {
    unclaimed: unclaimed,
    orders: mine.map(function (r) {
      const id = String(r.order_id).trim();
      return { order_id: id, status: String(r.status || '').trim(), created_at: iso(r.created_at),
        paid_at: iso(r.paid_at), status_at: iso(r.status_at), restaurants: String(r.restaurants || ''),
        riders: num_(r.riders, 1), item_total: num_(r.item_total, 0), gst: num_(r.gst, 0),
        delivery: num_(r.delivery, 0), grand_total: num_(r.grand_total, 0), items: ids[id],
        review: reviews[id] || null };
    })
  };
}

// ---- account helpers
function usersTab_(ss) {
  const sheet = sheet_(ss, 'Users', USER_HEAD);
  return { sheet: sheet, col: columns_(sheet, USER_HEAD) };
}

// The Users row for a phone number: { phone, rowNum, get(column), write({ column: value }) }, or null.
function findUser_(ss, phone) {
  if (!phone) return null;
  const u = usersTab_(ss);
  const last = u.sheet.getLastRow();
  if (last < 2) return null;
  const cells = u.sheet.getRange(2, u.col.phone, last - 1, 1).getValues();
  let rowNum = 0;
  for (let i = 0; i < cells.length; i++) {
    if (phone10_(cells[i][0]) === phone) { rowNum = i + 2; break; }
  }
  if (!rowNum) return null;
  const row = u.sheet.getRange(rowNum, 1, 1, u.sheet.getLastColumn()).getValues()[0];
  return {
    phone: phone,
    rowNum: rowNum,
    get: function (name) { return u.col[name] ? row[u.col[name] - 1] : ''; },
    write: function (changes) {
      Object.keys(changes).forEach(function (name) {
        if (!u.col[name]) return;
        u.sheet.getRange(rowNum, u.col[name]).setValue(changes[name]);
        row[u.col[name] - 1] = changes[name];
      });
    }
  };
}

function publicUser_(user) {
  const since = user.get('created_at');
  return { phone: user.phone, name: String(user.get('name') || '').replace(/^'/, ''),
    since: since instanceof Date ? since.toISOString() : String(since || '') };
}

function lockedMinutes_(user) {
  const until = user.get('locked_until');
  const t = until instanceof Date ? until.getTime() : Date.parse(String(until || ''));
  return t && t > Date.now() ? Math.ceil((t - Date.now()) / 60000) : 0;
}

// "+91 98765 43210", "098765 43210", 9876543210 → "9876543210"; anything else → "".
function phone10_(v) {
  let d = String(v === undefined || v === null ? '' : v).replace(/\D/g, '');
  if (d.length === 12 && d.indexOf('91') === 0) d = d.slice(2);
  else if (d.length === 11 && d.charAt(0) === '0') d = d.slice(1);
  return /^[6-9]\d{9}$/.test(d) ? d : '';
}

function tidyName_(v) { return String(v || '').replace(/\s+/g, ' ').trim().slice(0, 40); }

// Six digits, not all the same and not a straight run (123456, 987654).
function pinOk_(pin) {
  if (!/^\d{6}$/.test(pin)) return false;
  if (/^(\d)\1{5}$/.test(pin)) return false;
  return '0123456789012345'.indexOf(pin) < 0 && '9876543210987654'.indexOf(pin) < 0;
}

// The secret that scrambles PINs and signs tokens. Made once and kept in the script's properties (Project
// Settings → Script properties). Deleting it signs everyone out and makes every PIN stop working.
let secretCache_ = '';
function secret_() {
  if (secretCache_) return secretCache_;
  const props = PropertiesService.getScriptProperties();
  let secret = props.getProperty('ACCOUNT_SECRET');
  if (!secret) {
    secret = Utilities.getUuid() + Utilities.getUuid();
    props.setProperty('ACCOUNT_SECRET', secret);
  }
  secretCache_ = secret;
  return secret;
}

function hmac_(text) {
  return Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(String(text), secret_()));
}

function pinHash_(salt, pin) { return hmac_('pin.' + salt + '.' + pin); }

// "v1.<phone>.<issued>.<signature>". The signature covers part of the PIN's hash, so a new or cleared PIN
// ends every sign-in made with the old one.
function makeToken_(phone, pinHashValue) {
  const body = 'v1.' + phone + '.' + Math.floor(Date.now() / 1000);
  return body + '.' + hmac_(body + '.' + String(pinHashValue).slice(0, 16));
}

// The account a token belongs to, or null when it is wrong, too old, or its PIN has changed.
function readToken_(ss, token) {
  const parts = String(token || '').split('.');
  if (parts.length !== 4 || parts[0] !== 'v1') return null;
  const phone = phone10_(parts[1]);
  const issued = Number(parts[2]);
  const nowSec = Date.now() / 1000;
  if (!phone || !isFinite(issued) || nowSec - issued > SESSION_DAYS * 86400 || issued > nowSec + 300) return null;
  const user = findUser_(ss, phone);
  const stored = user ? String(user.get('pin_hash') || '') : '';
  if (!stored) return null;
  const expected = hmac_(parts[0] + '.' + parts[1] + '.' + parts[2] + '.' + stored.slice(0, 16));
  return sameText_(expected, parts[3]) ? user : null;
}

// Compares two strings in the same time whatever they hold (no hints from timing).
function sameText_(a, b) {
  a = String(a); b = String(b);
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
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
    } else if (a.kind === 'review') {
      subject = 'Hungrr: ' + a.rating + '-star review – ' + a.id;
      intro = ['A customer rated their order ' + a.rating + ' out of 5. It may be worth a call or a message.',
        '', 'Order: ' + a.id + (a.restaurantsText ? ' (' + a.restaurantsText + ')' : ''),
        'What went wrong: ' + ((a.reviewTags || []).join(', ') || '—'),
        'Comment: ' + (a.comment || '—'), 'Suggestion: ' + (a.improve || '—'), 'Name: ' + (a.name || '—')];
    } else {
      subject = 'Hungrr: test alert';
      intro = ['Alerts are working. You will get one like this when a customer has paid and needs checking.'];
    }
    if (cfg.emails.length) {
      const body = intro.concat(a.id && a.kind !== 'review' ? ['', 'Order: ' + a.id, 'Amount: ' + money] : [], ref ? ['UPI ref no.: ' + ref] : [])
        .concat(a.name ? ['', 'Customer: ' + a.name + (a.phone ? ' · +91 ' + a.phone.slice(0, 5) + ' ' + a.phone.slice(5) : ''),
          'Deliver to: ' + a.address] : [])
        .concat(dishes.length ? [''].concat(dishes, ['Riders: ' + a.riders + (a.clusterNames ? ' (' + a.clusterNames + ')' : '')]) : [])
        .concat(a.notes ? ['', 'Notes: ' + a.notes] : [])
        .concat(a.link ? ['', 'Open the order: ' + a.link] : []);
      MailApp.sendEmail({ to: cfg.emails.join(','), subject: subject, body: body.join('\n') });
      sent.push('email');
    }
    if (cfg.telegramToken && cfg.telegramChat) {
      const head = a.kind === 'payment' ? '💰 Payment to verify' : a.kind === 'order' ? '🆕 New order (waiting for payment)'
        : a.kind === 'review' ? '⭐ ' + a.rating + '-star review' : '✅ Hungrr alerts are working';
      const text = a.kind === 'review'
        ? [head, a.id, (a.reviewTags || []).join(', '), a.link ? 'Open: ' + a.link : ''].filter(String).join('\n')
        : [head].concat(a.id ? [a.id + ' · ' + money] : [], ref ? ['UPI ref: ' + ref] : [],
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
// Asks for the permissions alerts need, adds new Settings rows, the Alerts, Reviews and Users tabs and the
// status_at and account columns, makes the accounts' secret, and sends a test alert. Safe to run again: it only
// adds what is missing.
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
  const reviews = sheet_(ss, 'Reviews', REVIEW_HEAD);
  ensureList_(reviews, columns_(reviews, REVIEW_HEAD).approved, ['Yes', 'No']);
  usersTab_(ss);
  secret_();
  CacheService.getScriptCache().removeAll(['menu', 'status', 'reviews']);
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

// A dropdown of `values` on a column (from row 2 down), added once.
function ensureList_(sheet, column, values) {
  const rule = sheet.getRange(2, column).getDataValidation();
  const list = rule ? rule.getCriteriaValues()[0] : null;
  if (Array.isArray(list) && list.indexOf(values[0]) >= 0) return;
  const dropdown = SpreadsheetApp.newDataValidation().requireValueInList(values, true).setAllowInvalid(true).build();
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
