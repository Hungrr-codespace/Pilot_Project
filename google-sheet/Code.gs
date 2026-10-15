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
 *   POST {"action":"deals","token":…,"coupon":"CODE"}      → the automatic offer this order would get (every
 *                                                         Nth order) and the coupon's rule, or why it can't be used,
 *                                                         plus the coupons listed at checkout for this customer
 *   POST {"action":"partner_apply","phone","pin","role",…}  → a restaurant's or rider's application (new or existing
 *                                                         account); the admin page approves it
 *   POST {"action":"admin","op":…,"token":…}                → the admin page (only phone numbers listed as admin in
 *                                                         Staff): order board, statuses, riders, coupons, offers,
 *                                                         reviews, menu switches, customers, numbers, banner
 *   POST {"action":"rider","op":…,"token":…}                → the rider page (role rider in Staff): jobs, location,
 *                                                         picked up, delivered
 *   POST {"action":"partner","op":…,"token":…}              → the restaurant page (role restaurant in Staff): the
 *                                                         restaurant's dishes to prepare, preparing, ready
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
  'total_check', 'device', 'notes', 'account', 'coupon', 'discount', 'rider', 'picked_up_at', 'delivered_at'];
const ITEM_HEAD = ['order_id', 'created_at', 'restaurant', 'dish_id', 'dish', 'qty', 'price', 'line_total', 'ready_at'];
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
const STAFF_HEAD = ['phone', 'name', 'role', 'restaurant_id', 'active', 'last_lat', 'last_lng', 'last_seen_at', 'notes'];
const STAFF_ROLES = ['admin', 'rider', 'restaurant'];
const COUPON_HEAD = ['code', 'name', 'type', 'value', 'min_order', 'max_discount', 'starts_on', 'ends_on', 'max_uses',
  'per_customer', 'active', 'show_at_checkout', 'created_at', 'created_by', 'notes'];
const DEAL_TYPES = ['amount', 'percent', 'free_delivery'];   // ₹ off the food, % off the food, no delivery charge
const OFFER_HEAD = ['offer_id', 'name', 'every_n', 'reward', 'value', 'max_discount', 'active', 'notes'];
const DEFAULT_OFFER = ['nth-order', 'Every 5th order: free delivery', 5, 'free_delivery', '', '', true,
  'The customer\'s 5th, 10th, 15th… paid order gets this. Change it on the admin page.'];
const LOCATION_MINUTES = 15;  // a rider's position older than this is not shown to the customer
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';   // no 0/O or 1/I, so codes are easy to read out
// Restaurants and riders apply on the website (Partners tab); the admin page approves them (adds them to Staff).
const PARTNER_HEAD = ['phone', 'role', 'name', 'restaurant_name', 'gstin', 'no_gst', 'fssai', 'dob', 'vehicle_no',
  'dl_no', 'status', 'restaurant_id', 'applied_at', 'decided_at', 'decided_by', 'note', 'restaurant_address'];
const PARTNER_ROLES = ['restaurant', 'rider'];
const PARTNER_STATUSES = ['pending', 'approved', 'declined', 'removed'];
const RIDER_MIN_AGE = 18;
const NEW_SETTINGS = [   // added by setup() when missing
  ['opens_at', '11:00 AM', 'When orders open each day (Indian time)'],
  ['closes_at', '8:30 PM', 'Last time to place an order'],
  ['orders_paused', false, 'Tick to stop new orders right away (rain, rush, exams). Untick to open again.'],
  ['pause_message', '', 'Optional: shown to customers while paused, e.g. Back at 6 PM after the rain.'],
  ['site_banner', '', 'Optional: a one-line notice at the top of every page, e.g. Rain today: deliveries 20 min late.']
];
const ALERT_SETTINGS = [
  ['alert_emails', '', 'Email addresses for alerts, separated by commas'],
  ['alert_on_new_order', false, 'Tick to also get an alert when an order is placed (before payment)'],
  ['telegram_bot_token', '', 'Optional: token of your Telegram bot (from @BotFather)'],
  ['telegram_chat_id', '', 'Optional: the chat or group the bot posts to'],
  ['rider_telegram_chat_id', '', 'Optional: a Telegram group of your riders (same bot). Orders you mark Paid on the admin page, with no rider yet, are posted there'],
  ['website_url', '', 'Your website address, e.g. https://hungrr.in (for the links in alerts)']
];
// The restaurant's pickup address for riders (Restaurants tab; setup adds the columns)
const RESTAURANT_PICKUP_HEAD = ['address', 'map_link'];
// Orders a rider can take: payment checked, not on the way yet
const OPEN_FOR_RIDERS = ['Paid', 'Preparing'];

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
  menu.offers = activeOffers_(ss).map(function (o) {   // shown to everyone (coupon codes never are)
    return { name: o.name, every_n: o.every_n, type: o.type, value: o.value, max_discount: o.max_discount };
  });
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
  if (action === 'deals') return json_(dealsCheck_(body));
  if (action === 'admin' || action === 'rider' || action === 'partner') {
    const ops = { admin: ADMIN_OPS, rider: RIDER_OPS, partner: PARTNER_OPS }[action];
    const op = ops[String(body.op || '')];
    if (!op) return json_({ ok: false, error: 'Unknown action' });
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const who = staffFor_(ss, body.token, action === 'partner' ? 'restaurant' : action);
    if (who.error) return json_({ ok: false, error: who.error });
    if (!op.write) return json_(op.run(ss, body, who));
    const staffLock = LockService.getScriptLock();
    staffLock.waitLock(20000);
    try { return json_(op.run(ss, body, who)); } finally { staffLock.releaseLock(); }
  }
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

  // Same maths as the website: one rider (and one delivery charge) per cluster; one offer per order (the automatic
  // offer or the coupon, whichever saves more); a discount on the food comes off before GST.
  const itemTotal = lines.reduce(function (s, l) { return s + l.qty * l.price; }, 0);
  const clusterIds = unique_(lines.map(function (l) { return l.cluster; }).filter(String));
  const riders = Math.max(1, clusterIds.length);
  const delivery = perRider * riders;
  const askedCoupon = String(o.coupon || '').trim().toUpperCase().slice(0, 20);
  const deals = signedIn ? dealsFor_(ss, signedIn.phone, id, askedCoupon) : { offer: null, coupon: null, error: '' };
  if (askedCoupon && deals.error) notes.push('Coupon ' + askedCoupon + ' not applied: ' + deals.error);
  const best = bestDeal_([deals.offer, deals.coupon], itemTotal, delivery);
  const taxable = Math.round((itemTotal - best.onItems) * 100) / 100;
  const gst = Math.round(taxable * gstRate) / 100;
  const discount = Math.round((best.onItems + best.onDelivery) * 100) / 100;
  const grand = Math.round((taxable + gst + delivery - best.onDelivery) * 100) / 100;
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
    account: linked ? "'" + linked : '',
    coupon: best.rule ? safe_(best.rule.label) : '',
    discount: discount || '',
    rider: current('rider') ? "'" + String(current('rider')).replace(/^'/, '') : '',   // set by the admin page
    picked_up_at: current('picked_up_at'),
    delivered_at: current('delivered_at')
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
      qty: l.qty, price: l.price, line_total: l.qty * l.price, ready_at: '' };
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

  return { ok: true, order_id: id, status: nextStatus, grand_total: grand, discount: discount, total_check: check };
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
    discount: num_(get('discount'), 0), coupon: String(get('coupon') || ''),
    grand_total: num_(get('grand_total'), 0), items: items,
    rider: riderForCustomer_(ss, get('rider'), String(get('status') || ''))
  } };
}

// The rider's first name and last position, for the customer's map: only while the order is out for delivery and
// the position is recent. Never the rider's phone number.
function riderForCustomer_(ss, riderPhone, status) {
  const phone = phone10_(riderPhone);
  if (!phone || status !== 'Out for delivery') return null;
  const staff = staffRow_(ss, phone, 'rider');
  const loc = riderLocation_(phone);
  return { name: staff ? String(staff.name || '').split(' ')[0] : 'Your rider',
    lat: loc ? loc.lat : null, lng: loc ? loc.lng : null, at: loc ? loc.at : '' };
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
  claim_order: function (b) { return claimOrder_(b); },
  partner_apply: function (b) { return partnerApply_(b); }
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
    return { ok: true, token: makeToken_(phone, hash), user: publicUser_(findUser_(ss, phone)),
      roles: rolesFor_(ss, phone) };
  }
  const u = usersTab_(ss);
  const row = blankRow_(u.sheet.getLastColumn());
  const values = { phone: "'" + phone, name: safe_(name), created_at: now, updated_at: now, last_sign_in_at: now,
    pin_hash: "'" + hash, pin_salt: "'" + salt, failed_tries: 0, locked_until: '', notes: '' };
  USER_HEAD.forEach(function (h) { row[u.col[h] - 1] = values[h]; });
  u.sheet.getRange(u.sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
  return { ok: true, token: makeToken_(phone, hash), user: publicUser_(findUser_(ss, phone)),
    roles: rolesFor_(ss, phone) };
}

// With `as` ('restaurant' or 'rider'), signing in works only once the admin has approved that role; until then
// the answer is { error: 'not_approved', application } (its status, or null if they haven't applied yet).
function signIn_(b) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const phone = phone10_(b.phone);
  if (!phone) return { ok: false, error: 'bad_phone' };
  const user = findUser_(ss, phone);
  if (!user) return { ok: false, error: 'not_found' };
  const checked = checkPin_(user, b.pin);
  if (!checked.ok) return checked;
  const roles = rolesFor_(ss, phone);
  const as = String(b.as || '');
  if (PARTNER_ROLES.indexOf(as) >= 0 && !roles.some(function (r) { return r.role === as; })) {
    return { ok: false, error: 'not_approved', application: applicationFor_(ss, phone, as), name: publicUser_(user).name };
  }
  user.write({ last_sign_in_at: new Date() });
  return { ok: true, token: makeToken_(phone, checked.hash), user: publicUser_(user), roles: roles };
}

// The account's PIN: { ok, hash } or the reason it can't sign in (reset, locked, wrong_pin with tries left).
// Five wrong PINs in a row lock the account for LOCK_MINUTES.
function checkPin_(user, pin) {
  const stored = String(user.get('pin_hash') || '');
  if (!stored) return { ok: false, error: 'reset' };
  const minutes = lockedMinutes_(user);
  if (minutes) return { ok: false, error: 'locked', minutes: minutes };
  if (!sameText_(pinHash_(String(user.get('pin_salt') || ''), String(pin || '')), stored)) {
    const tries = num_(user.get('failed_tries'), 0) + 1;
    if (tries >= PIN_TRIES) {
      user.write({ failed_tries: 0, locked_until: new Date(Date.now() + LOCK_MINUTES * 60000) });
      return { ok: false, error: 'locked', minutes: LOCK_MINUTES };
    }
    user.write({ failed_tries: tries });
    return { ok: false, error: 'wrong_pin', tries_left: PIN_TRIES - tries };
  }
  if (num_(user.get('failed_tries'), 0) || String(user.get('locked_until') || '')) user.write({ failed_tries: 0, locked_until: '' });
  return { ok: true, hash: stored };
}

// The signed-in account, and with `orders` its orders (newest first).
function account_(b) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const user = readToken_(ss, b.token);
  if (!user) return { ok: false, error: 'signed_out' };
  const out = { ok: true, user: publicUser_(user), roles: rolesFor_(ss, user.phone) };
  if (b.orders) {
    const found = accountOrders_(ss, user.phone);
    out.orders = found.orders;
    out.unclaimed = found.unclaimed;
    out.progress = offerProgress_(ss, user.phone);
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
    if (list) list.push({ dish_id: String(r.dish_id || ''), dish: String(r.dish || ''), qty: num_(r.qty, 0),
      restaurant: String(r.restaurant || ''), price: num_(r.price, 0), line_total: num_(r.line_total, 0) });
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
        delivery: num_(r.delivery, 0), discount: num_(r.discount, 0), coupon: String(r.coupon || ''),
        grand_total: num_(r.grand_total, 0), items: ids[id], review: reviews[id] || null };
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

// ------------------------------------------------------------------ offers and coupons
// One offer per order: the automatic offer (every Nth paid order, from the Offers tab) or a coupon code (from the
// Coupons tab), whichever saves more. A rule: { kind, label, name, type, value, max_discount, min_order }, where
// type is amount (₹ off the food), percent (% off the food, up to max_discount) or free_delivery.

// What the website asks while the customer is checking out: the offer this order would get, and the coupon's
// rule or why it can't be used ('not_found', 'inactive', 'not_started', 'expired', 'used_up', 'used_by_you').
function dealsCheck_(b) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const user = readToken_(ss, b.token);
  if (!user) return { ok: false, error: 'signed_out' };
  const code = String(b.coupon || '').trim().toUpperCase().slice(0, 20);
  const orders = rows_(ss.getSheetByName('Orders'));
  const deals = dealsFor_(ss, user.phone, '', code, orders);
  return { ok: true, offer: deals.offer, coupon: deals.coupon, coupon_error: code ? deals.error : '',
    progress: offerProgress_(ss, user.phone, orders), available: checkoutCoupons_(ss, user.phone, orders) };
}

// The coupons listed at checkout for this customer: switched on, "show at checkout" ticked, and usable by them
// today. Their names stay private (customers see the code and the discount).
function checkoutCoupons_(ss, phone, orders) {
  const today = istDay_(new Date());
  return rows_(ss.getSheetByName('Coupons')).map(couponFrom_)
    .filter(function (c) {
      return c.code && truthy_(c.show_at_checkout, false) && DEAL_TYPES.indexOf(c.type) >= 0 &&
        !couponProblem_(c, orders, phone, '', today);
    })
    .slice(0, 12)
    .map(function (c) {
      return { kind: 'coupon', label: c.code, code: c.code, type: c.type, value: c.value,
        max_discount: c.max_discount, min_order: c.min_order, ends_on: c.ends_on ? istDay_(c.ends_on) : '' };
    });
}

// Why a coupon can't be used today, or '' when it can: 'inactive', 'not_started', 'expired', 'used_up', or (with
// `phone`) 'used_by_you'. `skipId` leaves the order being saved out of the counts.
function couponProblem_(c, orders, phone, skipId, today) {
  if (!truthy_(c.active, false)) return 'inactive';
  if (c.starts_on && istDay_(c.starts_on) > today) return 'not_started';
  if (c.ends_on && istDay_(c.ends_on) < today) return 'expired';
  const uses = orders.filter(function (r) {
    return countsAsPaid_(r) && String(r.coupon || '').trim().toUpperCase() === c.code &&
      String(r.order_id).trim() !== skipId;
  });
  const maxUses = num_(c.max_uses, 0);
  if (maxUses > 0 && uses.length >= maxUses) return 'used_up';
  const perCustomer = num_(c.per_customer, 0);
  if (phone && perCustomer > 0 &&
    uses.filter(function (r) { return phone10_(r.account) === phone; }).length >= perCustomer) return 'used_by_you';
  return '';
}

// The automatic offer and the coupon for an account's order (`orderId` is left out of the counts, so sending the
// same order again gives the same answer).
function dealsFor_(ss, phone, orderId, code, orders) {
  orders = orders || rows_(ss.getSheetByName('Orders'));
  const out = { offer: null, coupon: null, error: '' };
  const before = paidOrders_(orders, phone, orderId).length;
  activeOffers_(ss).some(function (o) {
    if ((before + 1) % o.every_n !== 0) return false;
    out.offer = { kind: 'offer', label: o.name, name: o.name, type: o.type, value: o.value,
      max_discount: o.max_discount, min_order: 0 };
    return true;
  });
  if (!code) return out;
  const c = findCoupon_(ss, code);
  if (!c) { out.error = 'not_found'; return out; }
  out.error = couponProblem_(c, orders, phone, orderId, istDay_(new Date()));
  if (!out.error) {
    out.coupon = { kind: 'coupon', label: c.code, code: c.code, name: c.name, type: c.type, value: c.value,
      max_discount: c.max_discount, min_order: c.min_order };
  }
  return out;
}

// { rule, onItems, onDelivery }: the rule that saves the most on this order (the website does the same sums).
function bestDeal_(rules, itemTotal, delivery) {
  let best = { rule: null, onItems: 0, onDelivery: 0 };
  rules.forEach(function (rule) {
    const d = dealAmount_(rule, itemTotal, delivery);
    if (d.onItems + d.onDelivery > best.onItems + best.onDelivery) best = { rule: rule, onItems: d.onItems, onDelivery: d.onDelivery };
  });
  return best;
}

function dealAmount_(rule, itemTotal, delivery) {
  const none = { onItems: 0, onDelivery: 0 };
  if (!rule || itemTotal <= 0 || itemTotal < num_(rule.min_order, 0)) return none;
  const value = num_(rule.value, 0);
  if (rule.type === 'free_delivery') return { onItems: 0, onDelivery: delivery };
  if (rule.type === 'amount') return { onItems: Math.min(value, itemTotal), onDelivery: 0 };
  if (rule.type === 'percent') {
    let off = Math.round(itemTotal * Math.min(value, 100)) / 100;
    const cap = num_(rule.max_discount, 0);
    if (cap > 0) off = Math.min(off, cap);
    return { onItems: off, onDelivery: 0 };
  }
  return none;
}

// How far the customer is towards the automatic offer: { name, every_n, done, next_gets_it, … } or null.
function offerProgress_(ss, phone, orders) {
  const offer = activeOffers_(ss)[0];
  if (!offer) return null;
  const count = paidOrders_(orders || rows_(ss.getSheetByName('Orders')), phone, '').length;
  return { name: offer.name, every_n: offer.every_n, type: offer.type, value: offer.value,
    max_discount: offer.max_discount, paid_orders: count, done: count % offer.every_n,
    next_gets_it: (count + 1) % offer.every_n === 0 };
}

function activeOffers_(ss) {
  return rows_(ss.getSheetByName('Offers'))
    .filter(function (r) { return truthy_(r.active, false) && num_(r.every_n, 0) >= 2 && DEAL_TYPES.indexOf(String(r.reward).trim()) >= 0; })
    .map(function (r) {
      return { offer_id: String(r.offer_id || ''), name: String(r.name || '').replace(/^'/, ''), every_n: Math.floor(num_(r.every_n, 0)),
        type: String(r.reward).trim(), value: num_(r.value, 0), max_discount: num_(r.max_discount, 0) };
    });
}

// An account's orders that count: paid for (or further along), not cancelled.
function paidOrders_(orders, phone, skipId) {
  return orders.filter(function (r) {
    return phone10_(r.account) === phone && countsAsPaid_(r) && String(r.order_id).trim() !== skipId;
  });
}

function countsAsPaid_(r) {
  const s = String(r.status || '').trim();
  return s && s !== 'Awaiting payment' && s !== 'Cancelled';
}

function findCoupon_(ss, code) {
  const want = String(code || '').trim().toUpperCase();
  if (!want) return null;
  return rows_(ss.getSheetByName('Coupons')).map(couponFrom_).filter(function (c) { return c.code === want; })[0] || null;
}

// A Coupons row, tidied (the code in capitals, numbers as numbers).
function couponFrom_(r) {
  return { code: String(r.code || '').trim().toUpperCase(), name: String(r.name || '').replace(/^'/, ''),
    type: String(r.type || '').trim(), value: num_(r.value, 0), min_order: num_(r.min_order, 0),
    max_discount: num_(r.max_discount, 0), starts_on: r.starts_on, ends_on: r.ends_on, max_uses: r.max_uses,
    per_customer: r.per_customer, active: r.active, show_at_checkout: r.show_at_checkout };
}

// ------------------------------------------------------------------ partners: restaurants and riders apply
// On the website, a restaurant or a rider applies with their phone number and PIN (a new account, or their
// existing one), and their details: restaurants their name, GST number (or "not registered") and FSSAI number;
// riders their date of birth (18 or older), vehicle number and driving licence number. The application waits in
// the Partners tab until the admin page approves it (which adds them to Staff) or declines it (with a note).
// Formats are checked here; the admin checks the numbers themselves on the official sites before approving.
function partnerApply_(b) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const phone = phone10_(b.phone);
  if (!phone) return { ok: false, error: 'bad_phone' };
  const role = String(b.role || '');
  if (PARTNER_ROLES.indexOf(role) < 0) return { ok: false, error: 'bad_role' };
  const details = partnerDetails_(role, b.details || {});
  if (details.error) return { ok: false, error: details.error };
  const pin = String(b.pin || '');

  let user = findUser_(ss, phone);
  let name = tidyName_(b.name);
  if (user && String(user.get('pin_hash') || '')) {
    const checked = checkPin_(user, pin);   // their existing account: same PIN, same lock-out as signing in
    if (!checked.ok) return checked;
    name = String(user.get('name') || '').replace(/^'/, '') || name;
  } else {
    if (!pinOk_(pin)) return { ok: false, error: 'weak_pin' };
    if (!user && name.length < 2) return { ok: false, error: 'bad_name' };
    const made = signUp_({ phone: phone, name: name, pin: pin });
    if (!made.ok) return made;
    user = findUser_(ss, phone);
    name = String(user.get('name') || '').replace(/^'/, '');
  }
  if (rolesFor_(ss, phone).some(function (r) { return r.role === role; })) return { ok: false, error: 'already_approved' };

  const p = partnersTab_(ss);
  const rowNum = partnerRow_(p, phone, role);
  const width = p.sheet.getLastColumn();
  const row = rowNum ? p.sheet.getRange(rowNum, 1, 1, width).getValues()[0] : blankRow_(width);
  const values = { phone: "'" + phone, role: role, name: safe_(name), restaurant_name: '', restaurant_address: '', gstin: '',
    no_gst: '', fssai: '', dob: '', vehicle_no: '', dl_no: '', status: 'pending', restaurant_id: '', applied_at: new Date(), decided_at: '',
    decided_by: '', note: '' };
  Object.keys(details).forEach(function (k) { values[k] = details[k]; });
  PARTNER_HEAD.forEach(function (h) { row[p.col[h] - 1] = values[h]; });
  const at = rowNum || p.sheet.getLastRow() + 1;
  p.sheet.getRange(at, 1, 1, width).setValues([row]);
  sendAlert_(ss, { kind: 'application', role: role, name: name, phone: phone,
    business: details.restaurant_name ? String(details.restaurant_name).replace(/^'/, '') : '',
    link: ss.getUrl() + '#gid=' + p.sheet.getSheetId() + '&range=A' + at });
  return { ok: true, status: 'pending' };
}

// The application's details, tidied and checked: { column: value } or { error }.
function partnerDetails_(role, d) {
  const text = function (v) { return "'" + v; };   // kept as typed (leading zeros, long numbers)
  if (role === 'restaurant') {
    const restaurant = tidyName_(d.restaurant_name);
    if (restaurant.length < 2) return { error: 'bad_restaurant' };
    const address = String(d.restaurant_address || '').replace(/\s+/g, ' ').trim().slice(0, 160);
    if (address.length < 5) return { error: 'bad_address' };
    const noGst = d.no_gst === true;
    const gstin = noGst ? '' : String(d.gstin || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
    if (!noGst && !gstinOk_(gstin)) return { error: 'bad_gstin' };
    const fssai = String(d.fssai || '').replace(/\D/g, '');
    if (!/^\d{14}$/.test(fssai)) return { error: 'bad_fssai' };
    return { restaurant_name: safe_(restaurant), restaurant_address: safe_(address), gstin: gstin ? text(gstin) : '',
      no_gst: noGst, fssai: text(fssai) };
  }
  const dob = String(d.dob || '').trim();
  const age = ageOn_(dob, istDay_(new Date()));
  if (age === null || age > 80) return { error: 'bad_dob' };
  if (age < RIDER_MIN_AGE) return { error: 'too_young' };
  const vehicle = String(d.vehicle_no || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (!vehicleOk_(vehicle)) return { error: 'bad_vehicle' };
  const dl = String(d.dl_no || '').toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (!dlOk_(dl)) return { error: 'bad_dl' };
  return { dob: text(dob), vehicle_no: text(vehicle), dl_no: text(dl) };
}

// GSTIN: 2-digit state code, the PAN (5 letters, 4 digits, 1 letter), the registration count, Z, and a check
// character (Luhn mod 36 over the first 14 characters).
const GST_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';
function gstinOk_(g) {
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g)) return false;
  const state = Number(g.slice(0, 2));
  if (!((state >= 1 && state <= 38) || state === 97 || state === 99)) return false;
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const p = GST_CHARS.indexOf(g.charAt(i)) * (i % 2 ? 2 : 1);
    sum += Math.floor(p / 36) + (p % 36);
  }
  return GST_CHARS.charAt((36 - (sum % 36)) % 36) === g.charAt(14);
}

// Driving licence: state (2 letters), RTO (2 digits), year of issue, 7 digits, e.g. BR01 20190012345.
function dlOk_(dl) {
  const m = /^[A-Z]{2}\d{2}((?:19|20)\d{2})\d{7}$/.exec(dl);
  return Boolean(m) && Number(m[1]) <= new Date().getFullYear();
}

// Vehicle: state, RTO, series letters, number (BR 01 AB 1234), or the Bharat series (22 BH 1234 AB).
function vehicleOk_(v) {
  return /^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/.test(v) || /^\d{2}BH\d{4}[A-Z]{1,2}$/.test(v);
}

// Whole years from a yyyy-mm-dd birth date to `today` (yyyy-mm-dd), or null for a date that isn't real.
function ageOn_(dob, today) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dob).replace(/^'/, ''));
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
  const t = today.split('-').map(Number);
  let age = t[0] - +m[1];
  if (t[1] < +m[2] || (t[1] === +m[2] && t[2] < +m[3])) age--;
  return age < 0 ? null : age;
}

function partnersTab_(ss) {
  const sheet = sheet_(ss, 'Partners', PARTNER_HEAD);
  return { sheet: sheet, col: columns_(sheet, PARTNER_HEAD) };
}

function partnerRow_(p, phone, role) {
  const last = p.sheet.getLastRow();
  if (last < 2) return 0;
  const cells = p.sheet.getRange(2, 1, last - 1, p.sheet.getLastColumn()).getValues();
  for (let i = 0; i < cells.length; i++) {
    if (phone10_(cells[i][p.col.phone - 1]) === phone && String(cells[i][p.col.role - 1]).trim() === role) return i + 2;
  }
  return 0;
}

// Where an application stands, for the person who made it (after their PIN): { status, applied_at, note,
// details } or null.
function applicationFor_(ss, phone, role) {
  const r = rows_(ss.getSheetByName('Partners')).filter(function (x) {
    return phone10_(x.phone) === phone && String(x.role).trim() === role;
  })[0];
  if (!r) return null;
  return { status: String(r.status || 'pending').trim(), applied_at: String(r.applied_at || ''),
    note: String(r.note || '').replace(/^'/, ''), details: partnerView_(r) };
}

function partnerView_(r) {
  const t = function (v) { return String(v === undefined || v === null ? '' : v).replace(/^'/, ''); };
  return { restaurant_name: t(r.restaurant_name), restaurant_address: t(r.restaurant_address), gstin: t(r.gstin), no_gst: truthy_(r.no_gst, false), fssai: t(r.fssai),
    dob: r.dob ? istDay_(r.dob) : '', vehicle_no: t(r.vehicle_no), dl_no: t(r.dl_no) };
}

// Adds (or switches back on) a Staff row: the page opens for this number at their next sign-in.
function setStaff_(ss, phone, role, name, restaurantId, active) {
  const sheet = sheet_(ss, 'Staff', STAFF_HEAD);
  const col = columns_(sheet, STAFF_HEAD);
  const last = sheet.getLastRow();
  const cells = last >= 2 ? sheet.getRange(2, 1, last - 1, sheet.getLastColumn()).getValues() : [];
  let rowNum = 0;
  for (let i = 0; i < cells.length; i++) {
    if (phone10_(cells[i][col.phone - 1]) === phone && String(cells[i][col.role - 1]).trim().toLowerCase() === role) { rowNum = i + 2; break; }
  }
  if (!rowNum && !active) return;
  if (!rowNum) {
    const row = blankRow_(sheet.getLastColumn());
    row[col.phone - 1] = "'" + phone;
    row[col.name - 1] = safe_(name);
    row[col.role - 1] = role;
    row[col.restaurant_id - 1] = restaurantId || '';
    row[col.active - 1] = true;
    row[col.notes - 1] = 'Approved on the admin page';
    sheet.getRange(last + 1, 1, 1, row.length).setValues([row]);
    return;
  }
  sheet.getRange(rowNum, col.active).setValue(active);
  if (active && restaurantId) sheet.getRange(rowNum, col.restaurant_id).setValue(restaurantId);
}

// A new restaurant from an approved application: closed (active FALSE) until its dishes are added.
function newRestaurant_(ss, name, clusterId, address) {
  const head = ['restaurant_id', 'name', 'initials', 'cluster_id', 'distance', 'veg_only', 'active', 'sort'].concat(RESTAURANT_PICKUP_HEAD);
  const sheet = sheet_(ss, 'Restaurants', head);
  const col = columns_(sheet, head);
  const rows = rows_(sheet);
  const taken = {};
  rows.forEach(function (r) { taken[String(r.restaurant_id).trim().toLowerCase()] = true; });
  const words = String(name).replace(/[^A-Za-z0-9 ]/g, ' ').split(/\s+/).filter(String);
  const initials = (words.length > 1 ? words[0].charAt(0) + words[words.length - 1].charAt(0) : (words[0] || 'R').slice(0, 2)).toUpperCase();
  let id = initials.toLowerCase();
  for (let n = 2; taken[id]; n++) id = initials.toLowerCase() + n;
  const sort = rows.reduce(function (m, r) { return Math.max(m, num_(r.sort, 0)); }, 0) + 1;
  const row = blankRow_(sheet.getLastColumn());
  const values = { restaurant_id: id, name: safe_(name), initials: initials, cluster_id: clusterId || '', distance: '',
    veg_only: false, active: false, sort: sort, address: safe_(address || ''), map_link: '' };
  Object.keys(values).forEach(function (k) { if (col[k]) row[col[k] - 1] = values[k]; });
  sheet.getRange(sheet.getLastRow() + 1, 1, 1, row.length).setValues([row]);
  return id;
}

// ------------------------------------------------------------------ staff (admin, riders, restaurants)
// The Staff tab lists the phone numbers that may use the admin, rider and restaurant pages. They sign in with their
// usual account (phone number and PIN); the role decides which page opens.
function staffFor_(ss, token, role) {
  const user = readToken_(ss, token);
  if (!user) return { error: 'signed_out' };
  const row = staffRow_(ss, user.phone, role);
  if (!row) return { error: 'not_staff' };
  return { phone: user.phone, name: String(row.name || user.get('name') || ''), restaurantId: String(row.restaurant_id || '').trim() };
}

function staffRow_(ss, phone, role) {
  return rows_(ss.getSheetByName('Staff')).filter(function (r) {
    return phone10_(r.phone) === phone && String(r.role || '').trim().toLowerCase() === role && truthy_(r.active, true);
  })[0] || null;
}

// The pages this account may open: [{ role, restaurant_id, restaurant }].
function rolesFor_(ss, phone) {
  const rests = index_(rows_(ss.getSheetByName('Restaurants')), 'restaurant_id');
  return rows_(ss.getSheetByName('Staff'))
    .filter(function (r) { return phone10_(r.phone) === phone && truthy_(r.active, true) && STAFF_ROLES.indexOf(String(r.role || '').trim().toLowerCase()) >= 0; })
    .map(function (r) {
      const id = String(r.restaurant_id || '').trim();
      return { role: String(r.role).trim().toLowerCase(), restaurant_id: id, restaurant: rests[id] ? String(rests[id].name) : '' };
    });
}

function staffList_(ss, role) {
  return rows_(ss.getSheetByName('Staff'))
    .filter(function (r) { return String(r.role || '').trim().toLowerCase() === role && truthy_(r.active, true) && phone10_(r.phone); })
    .map(function (r) {
      const loc = riderLocation_(phone10_(r.phone));
      return { phone: phone10_(r.phone), name: String(r.name || ''), seen_at: loc ? loc.at : String(r.last_seen_at || '') };
    });
}

// The rider's last position: kept in the script's cache (fast, no sheet write every few seconds) and copied to
// the Staff tab at most once a minute.
function riderLocation_(phone) {
  try {
    const hit = CacheService.getScriptCache().get('loc:' + phone);
    if (!hit) return null;
    const loc = JSON.parse(hit);
    return Date.now() - Date.parse(loc.at) <= LOCATION_MINUTES * 60000 ? loc : null;
  } catch (err) { return null; }
}

// ---- orders as the staff pages see them
function orderRows_(ss) {
  const sheet = sheet_(ss, 'Orders', ORDER_HEAD);
  return { sheet: sheet, col: columns_(sheet, ORDER_HEAD) };
}

// Updates cells of one order: { column: value }. Returns false when the order isn't there.
function writeOrder_(ss, orderId, changes) {
  const o = orderRows_(ss);
  const rowNum = findRow_(o.sheet, o.col.order_id, String(orderId || '').trim().toUpperCase());
  if (!rowNum) return false;
  Object.keys(changes).forEach(function (name) {
    if (o.col[name]) o.sheet.getRange(rowNum, o.col[name]).setValue(changes[name]);
  });
  return true;
}

function setStatus_(ss, orderId, status) {
  const now = new Date();
  const changes = { status: status, status_at: now };
  if (status === 'Out for delivery') changes.picked_up_at = now;
  if (status === 'Delivered') changes.delivered_at = now;
  return writeOrder_(ss, orderId, changes);
}

// Orders with their dishes, for the staff pages. `keep(row)` picks the orders.
function staffOrders_(ss, keep) {
  const orders = rows_(ss.getSheetByName('Orders')).filter(keep);
  const items = {};
  orders.forEach(function (r) { items[String(r.order_id).trim()] = []; });
  const dishes = index_(rows_(ss.getSheetByName('Dishes')), 'dish_id');
  rows_(ss.getSheetByName('OrderItems')).forEach(function (r) {
    const list = items[String(r.order_id).trim()];
    if (!list) return;
    const d = dishes[String(r.dish_id || '').trim()];
    list.push({ dish_id: String(r.dish_id || ''), dish: String(r.dish || ''), qty: num_(r.qty, 0),
      restaurant: String(r.restaurant || ''), restaurant_id: d ? String(d.restaurant_id) : '',
      line_total: num_(r.line_total, 0), ready: Boolean(String(r.ready_at || '').trim()) });
  });
  const riders = {};
  staffList_(ss, 'rider').forEach(function (r) { riders[r.phone] = r.name; });
  const iso = function (v) { return v instanceof Date ? v.toISOString() : String(v || ''); };
  return orders.map(function (r) {
    const id = String(r.order_id).trim();
    const rider = phone10_(r.rider);
    return { order_id: id, status: String(r.status || '').trim(), created_at: iso(r.created_at), status_at: iso(r.status_at),
      customer_name: String(r.customer_name || ''), phone: phone10_(r.phone), address: String(r.address || ''),
      upi_ref: String(r.upi_ref || '').replace(/\D/g, ''), restaurants: String(r.restaurants || ''),
      clusters: String(r.clusters || ''), grand_total: num_(r.grand_total, 0), discount: num_(r.discount, 0),
      coupon: String(r.coupon || ''), total_check: String(r.total_check || ''), notes: String(r.notes || ''),
      rider: rider, rider_name: rider ? (riders[rider] || 'Rider') : '', items: items[id] };
  }).sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });
}

const ACTIVE_STATUSES = ['Payment to verify', 'Paid', 'Preparing', 'Out for delivery'];
function isToday_(v) { return v && istDay_(v) === istDay_(new Date()); }

// ------------------------------------------------------------------ admin page
const ADMIN_OPS = {
  // Orders still in progress, and everything from today
  board: { run: function (ss) {
    return { ok: true, orders: staffOrders_(ss, function (r) {
      const s = String(r.status || '').trim();
      return ACTIVE_STATUSES.indexOf(s) >= 0 || (s && s !== 'Awaiting payment' && isToday_(r.created_at));
    }).slice(0, 200), riders: staffList_(ss, 'rider') };
  } },
  set_status: { write: true, run: function (ss, b) {
    const status = String(b.status || '').trim();
    if (STATUSES.indexOf(status) < 0) return { ok: false, error: 'bad_status' };
    if (!setStatus_(ss, b.order_id, status)) return { ok: false, error: 'not_found' };
    if (status === 'Paid') riderAlert_(ss, String(b.order_id || '').trim().toUpperCase());
    return { ok: true };
  } },
  // A restaurant's pickup address for riders (and an optional map link), from the admin's menu page
  restaurant_set: { write: true, run: function (ss, b) {
    const sheet = ss.getSheetByName('Restaurants');
    if (!sheet) return { ok: false, error: 'not_found' };
    const col = columns_(sheet, RESTAURANT_PICKUP_HEAD);
    const head = headers_(sheet);
    const rowNum = head.restaurant_id ? findRow_(sheet, head.restaurant_id, String(b.id || '').trim()) : 0;
    if (!rowNum) return { ok: false, error: 'not_found' };
    const link = String(b.map_link || '').trim();
    if (link && !/^https?:\/\//.test(link)) return { ok: false, error: 'bad_link' };
    if (b.address !== undefined) sheet.getRange(rowNum, col.address).setValue(safe_(String(b.address).replace(/\s+/g, ' ').trim().slice(0, 160)));
    if (b.map_link !== undefined) sheet.getRange(rowNum, col.map_link).setValue(link.slice(0, 300));
    clearCaches_();
    return { ok: true };
  } },
  assign_rider: { write: true, run: function (ss, b) {
    const phone = phone10_(b.rider);
    if (b.rider && !staffRow_(ss, phone, 'rider')) return { ok: false, error: 'not_rider' };
    return writeOrder_(ss, b.order_id, { rider: phone ? "'" + phone : '' }) ? { ok: true } : { ok: false, error: 'not_found' };
  } },

  // Reviews waiting for a decision first, then the latest
  reviews: { run: function (ss) {
    const iso = function (v) { return v instanceof Date ? v.toISOString() : String(v || ''); };
    const list = rows_(ss.getSheetByName('Reviews')).map(function (r) {
      return { order_id: String(r.order_id || ''), rating: Math.round(num_(r.rating, 0)),
        tags: String(r.tags || '').split(',').map(function (t) { return t.trim(); }).filter(String),
        comment: String(r.comment || '').replace(/^'/, ''), improve: String(r.improve || '').replace(/^'/, ''),
        name: String(r.name || ''), show: truthy_(r.show_on_site, false), approved: String(r.approved || '').trim(),
        created_at: iso(r.updated_at || r.created_at), restaurants: String(r.restaurants || '') };
    }).sort(function (a, b) { return String(b.created_at).localeCompare(String(a.created_at)); });
    const waiting = list.filter(function (r) { return r.show && !r.approved; });
    return { ok: true, waiting: waiting, recent: list.filter(function (r) { return waiting.indexOf(r) < 0; }).slice(0, 40) };
  } },
  review_set: { write: true, run: function (ss, b) {
    const sheet = ss.getSheetByName('Reviews');
    if (!sheet) return { ok: false, error: 'not_found' };
    const col = columns_(sheet, REVIEW_HEAD);
    const rowNum = findRow_(sheet, col.order_id, String(b.order_id || '').trim().toUpperCase());
    if (!rowNum) return { ok: false, error: 'not_found' };
    sheet.getRange(rowNum, col.approved).setValue(b.approved === 'Yes' ? 'Yes' : 'No');
    clearCaches_();
    return { ok: true };
  } },

  // Menu switches: restaurants open today, dishes sold out, the pause switch and the banner
  menu: { run: function (ss) {
    const set = settings_(ss);
    return { ok: true,
      clusters: rows_(ss.getSheetByName('Clusters')).map(function (c) {
        return { id: String(c.cluster_id), label: String(c.label || ''), area: String(c.area || ''), sort: num_(c.sort, 9999) };
      }),
      restaurants: rows_(ss.getSheetByName('Restaurants')).map(function (r) {
        return { id: String(r.restaurant_id), name: String(r.name), active: truthy_(r.active, true),
          initials: String(r.initials || ''), cluster_id: String(r.cluster_id || ''), veg_only: truthy_(r.veg_only, false),
          sort: num_(r.sort, 9999), address: String(r.address || '').replace(/^'/, ''), map_link: String(r.map_link || '') };
      }),
      dishes: rows_(ss.getSheetByName('Dishes')).map(function (d) {
        return { id: String(d.dish_id), restaurant_id: String(d.restaurant_id), name: String(d.name),
          category: String(d.category || ''), price: num_(d.price, 0), available: truthy_(d.available, true),
          veg: truthy_(d.veg, true), sort: num_(d.sort, 9999) };
      }),
      paused: truthy_(set.orders_paused, false), pause_message: String(set.pause_message || ''),
      banner: String(set.site_banner || '') };
  } },
  menu_set: { write: true, run: function (ss, b) {
    const isDish = b.kind === 'dish';
    const sheet = ss.getSheetByName(isDish ? 'Dishes' : 'Restaurants');
    if (!sheet) return { ok: false, error: 'not_found' };
    const col = headers_(sheet);
    const key = isDish ? col.dish_id : col.restaurant_id;
    const flag = isDish ? col.available : col.active;
    const rowNum = key ? findRow_(sheet, key, String(b.id || '').trim()) : 0;
    if (!rowNum || !flag) return { ok: false, error: 'not_found' };
    sheet.getRange(rowNum, flag).setValue(b.on === true);
    clearCaches_();
    return { ok: true };
  } },
  shop_set: { write: true, run: function (ss, b) {
    const sheet = sheet_(ss, 'Settings', ['key', 'value', 'note']);
    addKeyRows_(sheet, NEW_SETTINGS);
    const col = headers_(sheet);
    const keys = sheet.getRange(1, col.key, sheet.getLastRow(), 1).getValues();
    const put = function (key, value) {
      keys.forEach(function (k, i) { if (String(k[0]).trim() === key) sheet.getRange(i + 1, col.value).setValue(value); });
    };
    if (typeof b.paused === 'boolean') put('orders_paused', b.paused);
    if (b.pause_message !== undefined) put('pause_message', safe_(String(b.pause_message).slice(0, 160)));
    if (b.banner !== undefined) put('site_banner', safe_(String(b.banner).slice(0, 140)));
    clearCaches_();
    return { ok: true };
  } },

  // Coupons (with how often each was used) and the automatic offers
  coupons: { run: function (ss) {
    const orders = rows_(ss.getSheetByName('Orders'));
    const used = {};
    orders.forEach(function (r) {
      const code = String(r.coupon || '').trim().toUpperCase();
      if (code && countsAsPaid_(r)) used[code] = (used[code] || 0) + 1;
    });
    const day = function (v) { return v ? istDay_(v) : ''; };
    const today = istDay_(new Date());
    const STATE = { inactive: 'off', not_started: 'scheduled', expired: 'expired', used_up: 'used_up' };
    return { ok: true,
      coupons: rows_(ss.getSheetByName('Coupons')).map(couponFrom_).filter(function (c) { return c.code; }).map(function (c) {
        const problem = couponProblem_(c, orders, '', '', today);
        return { code: c.code, name: c.name, type: c.type, value: c.value,
          min_order: c.min_order, max_discount: c.max_discount, starts_on: day(c.starts_on),
          ends_on: day(c.ends_on), max_uses: num_(c.max_uses, 0), per_customer: num_(c.per_customer, 0),
          active: truthy_(c.active, false), show_at_checkout: truthy_(c.show_at_checkout, false),
          state: problem ? (STATE[problem] || 'off') : 'live', used: used[c.code] || 0 };
      }).reverse(),
      offers: rows_(ss.getSheetByName('Offers')).map(function (o) {
        return { offer_id: String(o.offer_id || ''), name: String(o.name || '').replace(/^'/, ''), every_n: num_(o.every_n, 0),
          reward: String(o.reward || ''), value: num_(o.value, 0), max_discount: num_(o.max_discount, 0),
          active: truthy_(o.active, false) };
      }) };
  } },
  coupon_save: { write: true, run: function (ss, b, who) {
    const c = b.coupon || {};
    const name = String(c.name || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    const type = String(c.type || '').trim();
    const value = num_(c.value, 0);
    if (name.length < 2) return { ok: false, error: 'bad_name' };
    if (DEAL_TYPES.indexOf(type) < 0) return { ok: false, error: 'bad_type' };
    if (type !== 'free_delivery' && (value <= 0 || (type === 'percent' && value > 100))) return { ok: false, error: 'bad_value' };
    const day = /^\d{4}-\d{2}-\d{2}$/;
    if ((c.starts_on && !day.test(c.starts_on)) || (c.ends_on && !day.test(c.ends_on))) return { ok: false, error: 'bad_dates' };
    if (c.starts_on && c.ends_on && c.ends_on < c.starts_on) return { ok: false, error: 'bad_dates' };
    const sheet = sheet_(ss, 'Coupons', COUPON_HEAD);
    const col = columns_(sheet, COUPON_HEAD);
    ensureList_(sheet, col.type, DEAL_TYPES);
    const was = String(c.was || '').trim().toUpperCase();
    let code = String(c.code || '').trim().toUpperCase();
    if (code && !/^[A-Z0-9]{4,16}$/.test(code)) return { ok: false, error: 'bad_code' };
    const taken = function (x) { const r = findRow_(sheet, col.code, x); return r && x !== was; };
    if (!code) { do { code = newCode_(); } while (taken(code)); }
    else if (taken(code)) return { ok: false, error: 'code_taken' };
    const rowNum = was ? findRow_(sheet, col.code, was) : 0;
    const width = sheet.getLastColumn();
    const row = rowNum ? sheet.getRange(rowNum, 1, 1, width).getValues()[0] : blankRow_(width);
    const values = { code: code, name: safe_(name), type: type, value: type === 'free_delivery' ? '' : value,
      min_order: num_(c.min_order, 0) || '', max_discount: type === 'percent' ? (num_(c.max_discount, 0) || '') : '',
      starts_on: c.starts_on ? "'" + c.starts_on : '', ends_on: c.ends_on ? "'" + c.ends_on : '',
      max_uses: Math.floor(num_(c.max_uses, 0)) || '', per_customer: Math.floor(num_(c.per_customer, 0)) || '',
      active: c.active !== false, show_at_checkout: c.show_at_checkout === true,
      created_at: rowNum ? row[col.created_at - 1] : new Date(),
      created_by: rowNum ? row[col.created_by - 1] : "'" + who.phone, notes: rowNum ? row[col.notes - 1] : '' };
    COUPON_HEAD.forEach(function (h) { row[col[h] - 1] = values[h]; });
    sheet.getRange(rowNum || sheet.getLastRow() + 1, 1, 1, width).setValues([row]);
    return { ok: true, code: code };
  } },
  coupon_active: { write: true, run: function (ss, b) {
    const sheet = ss.getSheetByName('Coupons');
    if (!sheet) return { ok: false, error: 'not_found' };
    const col = columns_(sheet, COUPON_HEAD);
    const rowNum = findRow_(sheet, col.code, String(b.code || '').trim().toUpperCase());
    if (!rowNum) return { ok: false, error: 'not_found' };
    sheet.getRange(rowNum, col.active).setValue(b.active === true);
    return { ok: true };
  } },
  offer_save: { write: true, run: function (ss, b) {
    const o = b.offer || {};
    const everyN = Math.floor(num_(o.every_n, 0));
    const reward = String(o.reward || '').trim();
    const value = num_(o.value, 0);
    const name = String(o.name || '').replace(/\s+/g, ' ').trim().slice(0, 60);
    if (name.length < 2) return { ok: false, error: 'bad_name' };
    if (everyN < 2 || everyN > 50) return { ok: false, error: 'bad_every' };
    if (DEAL_TYPES.indexOf(reward) < 0) return { ok: false, error: 'bad_type' };
    if (reward !== 'free_delivery' && (value <= 0 || (reward === 'percent' && value > 100))) return { ok: false, error: 'bad_value' };
    const sheet = sheet_(ss, 'Offers', OFFER_HEAD);
    const col = columns_(sheet, OFFER_HEAD);
    const id = String(o.offer_id || 'nth-order').trim() || 'nth-order';
    const rowNum = findRow_(sheet, col.offer_id, id);
    const width = sheet.getLastColumn();
    const row = rowNum ? sheet.getRange(rowNum, 1, 1, width).getValues()[0] : blankRow_(width);
    const values = { offer_id: id, name: safe_(name), every_n: everyN, reward: reward,
      value: reward === 'free_delivery' ? '' : value, max_discount: reward === 'percent' ? (num_(o.max_discount, 0) || '') : '',
      active: o.active !== false, notes: rowNum ? row[col.notes - 1] : '' };
    OFFER_HEAD.forEach(function (h) { row[col[h] - 1] = values[h]; });
    sheet.getRange(rowNum || sheet.getLastRow() + 1, 1, 1, width).setValues([row]);
    clearCaches_();
    return { ok: true };
  } },

  // A customer by phone number: their account and orders; reset a forgotten PIN or unlock
  customer: { run: function (ss, b) {
    const phone = phone10_(b.phone);
    if (!phone) return { ok: false, error: 'bad_phone' };
    const user = findUser_(ss, phone);
    const iso = function (v) { return v instanceof Date ? v.toISOString() : String(v || ''); };
    const orders = staffOrders_(ss, function (r) {
      return (phone10_(r.account) === phone || phone10_(r.phone) === phone) && String(r.status || '').trim();
    }).slice(0, 30);
    return { ok: true, phone: phone, orders: orders,
      account: user ? { name: publicUser_(user).name, since: publicUser_(user).since, last_sign_in_at: iso(user.get('last_sign_in_at')),
        has_pin: Boolean(String(user.get('pin_hash') || '')), locked_minutes: lockedMinutes_(user),
        failed_tries: num_(user.get('failed_tries'), 0) } : null };
  } },
  customer_set: { write: true, run: function (ss, b) {
    const user = findUser_(ss, phone10_(b.phone));
    if (!user) return { ok: false, error: 'not_found' };
    if (b.do === 'reset_pin') user.write({ pin_hash: '', pin_salt: '', failed_tries: 0, locked_until: '', updated_at: new Date() });
    else if (b.do === 'unlock') user.write({ failed_tries: 0, locked_until: '' });
    else return { ok: false, error: 'Unknown action' };
    return { ok: true };
  } },

  // Today's (or the last 7 days') numbers
  // Restaurants' and riders' applications (pending first), with the restaurants and clusters for approving
  applications: { run: function (ss) {
    const today = istDay_(new Date());
    const order = { pending: 0, approved: 1, declined: 2, removed: 3 };
    const list = rows_(ss.getSheetByName('Partners')).filter(function (r) { return phone10_(r.phone); }).map(function (r) {
      const d = partnerView_(r);
      const role = String(r.role || '').trim();
      return { phone: phone10_(r.phone), role: role, name: String(r.name || '').replace(/^'/, ''),
        status: String(r.status || 'pending').trim(), applied_at: String(r.applied_at || ''),
        decided_at: String(r.decided_at || ''), note: String(r.note || '').replace(/^'/, ''),
        restaurant_id: String(r.restaurant_id || ''), details: d,
        checks: role === 'restaurant'
          ? { gstin: d.no_gst ? null : gstinOk_(d.gstin), fssai: /^\d{14}$/.test(d.fssai) }
          : { age: ageOn_(d.dob, today), vehicle: vehicleOk_(d.vehicle_no), dl: dlOk_(d.dl_no) } };
    }).sort(function (a, b) {
      return (order[a.status] || 0) - (order[b.status] || 0) || String(b.applied_at).localeCompare(String(a.applied_at));
    });
    return { ok: true, applications: list,
      restaurants: rows_(ss.getSheetByName('Restaurants')).filter(function (r) { return String(r.restaurant_id).trim(); })
        .map(function (r) { return { id: String(r.restaurant_id), name: String(r.name) }; }),
      clusters: rows_(ss.getSheetByName('Clusters')).filter(function (c) { return String(c.cluster_id).trim(); })
        .map(function (c) { return { id: String(c.cluster_id), label: String(c.label || ''), area: String(c.area || '') }; }) };
  } },
  // approve (restaurants: a new restaurant, or an existing one), decline (with a note they see), or remove access
  application_decide: { write: true, run: function (ss, b, who) {
    const phone = phone10_(b.phone);
    const role = String(b.role || '');
    const p = partnersTab_(ss);
    const rowNum = phone && PARTNER_ROLES.indexOf(role) >= 0 ? partnerRow_(p, phone, role) : 0;
    if (!rowNum) return { ok: false, error: 'not_found' };
    const row = p.sheet.getRange(rowNum, 1, 1, p.sheet.getLastColumn()).getValues()[0];
    const get = function (h) { return String(row[p.col[h] - 1] === undefined ? '' : row[p.col[h] - 1]).replace(/^'/, ''); };
    const name = get('name');
    const changes = { decided_at: new Date(), decided_by: "'" + who.phone, note: safe_(String(b.note || '').slice(0, 200)) };
    if (b.decision === 'approve') {
      let restaurantId = '';
      if (role === 'restaurant') {
        if (b.restaurant_id) {
          const known = rows_(ss.getSheetByName('Restaurants')).some(function (r) { return String(r.restaurant_id).trim() === String(b.restaurant_id); });
          if (!known) return { ok: false, error: 'bad_restaurant' };
          restaurantId = String(b.restaurant_id);
        } else {
          restaurantId = newRestaurant_(ss, tidyName_(b.restaurant_name || get('restaurant_name')) || name, String(b.cluster_id || ''),
            get('restaurant_address'));
        }
        changes.restaurant_id = restaurantId;
      }
      setStaff_(ss, phone, role, name, restaurantId, true);
      changes.status = 'approved';
    } else if (b.decision === 'decline') {
      changes.status = 'declined';
    } else if (b.decision === 'remove') {
      setStaff_(ss, phone, role, name, '', false);
      changes.status = 'removed';
    } else return { ok: false, error: 'bad_decision' };
    Object.keys(changes).forEach(function (h) { if (p.col[h]) p.sheet.getRange(rowNum, p.col[h]).setValue(changes[h]); });
    clearCaches_();
    return { ok: true, status: changes.status, restaurant_id: changes.restaurant_id || '' };
  } },
  stats: { run: function (ss, b) {
    const days = b.days === 7 ? 7 : 1;
    const from = istDay_(new Date(Date.now() - (days - 1) * 86400000));
    const all = rows_(ss.getSheetByName('Orders'));
    const inRange = function (r) { return r.created_at && istDay_(r.created_at) >= from; };
    const counted = all.filter(function (r) { return countsAsPaid_(r) && inRange(r); });
    const who = function (r) { return phone10_(r.account) || phone10_(r.phone); };
    const earlier = {};
    all.forEach(function (r) { if (countsAsPaid_(r) && r.created_at && istDay_(r.created_at) < from && who(r)) earlier[who(r)] = true; });
    const customers = unique_(counted.map(who).filter(String));
    const revenue = counted.reduce(function (s, r) { return s + num_(r.grand_total, 0); }, 0);
    const ids = {};
    counted.forEach(function (r) { ids[String(r.order_id).trim()] = true; });
    const dishes = {};
    const food = {};
    rows_(ss.getSheetByName('OrderItems')).forEach(function (r) {
      if (!ids[String(r.order_id).trim()]) return;
      const name = String(r.dish || '');
      dishes[name] = dishes[name] || { dish: name, restaurant: String(r.restaurant || ''), qty: 0 };
      dishes[name].qty += num_(r.qty, 0);
      const rest = String(r.restaurant || '');
      food[rest] = Math.round(((food[rest] || 0) + num_(r.line_total, 0)) * 100) / 100;
    });
    const round = function (n) { return Math.round(n * 100) / 100; };
    return { ok: true, days: days, from: from,
      orders: counted.length, revenue: round(revenue), average: counted.length ? round(revenue / counted.length) : 0,
      discounts: round(counted.reduce(function (s, r) { return s + num_(r.discount, 0); }, 0)),
      customers: customers.length, repeat: customers.filter(function (p) { return earlier[p]; }).length,
      cancelled: all.filter(function (r) { return String(r.status).trim() === 'Cancelled' && inRange(r); }).length,
      to_verify: all.filter(function (r) { return String(r.status).trim() === 'Payment to verify'; }).length,
      top_dishes: Object.keys(dishes).map(function (k) { return dishes[k]; })
        .sort(function (a, b) { return b.qty - a.qty; }).slice(0, 5),
      food_by_restaurant: Object.keys(food).map(function (k) { return { restaurant: k, amount: food[k] }; })
        .sort(function (a, b) { return b.amount - a.amount; }) };
  } }
};

// ------------------------------------------------------------------ rider page
const RIDER_OPS = {
  // The rider's orders not delivered yet (with each restaurant's pickup address), how many they delivered today,
  // and the orders no rider has taken yet. Those show only what a rider needs to decide: the restaurants (with
  // their addresses), the area it goes to and how many dishes. The customer's name, phone number and full
  // address appear once the rider accepts it.
  jobs: { run: function (ss, b, who) {
    const pickups = pickupsFor_(ss);
    const open = function (r) { return OPEN_FOR_RIDERS.indexOf(String(r.status || '').trim()) >= 0; };
    const list = staffOrders_(ss, function (r) {
      const rider = phone10_(r.rider);
      return rider === who.phone ? Boolean(String(r.status || '').trim()) : !rider && open(r);
    });
    const mine = list.filter(function (o) { return o.rider === who.phone; });
    return { ok: true, name: who.name,
      jobs: mine.filter(function (o) { return ['Paid', 'Preparing', 'Out for delivery'].indexOf(o.status) >= 0; }).reverse()
        .map(function (o) { o.pickups = pickups(o.items); return o; }),
      delivered_today: mine.filter(function (o) { return o.status === 'Delivered' && isToday_(o.status_at); }).length,
      available: list.filter(function (o) { return !o.rider; }).reverse().map(function (o) {
        return { order_id: o.order_id, status: o.status, created_at: o.created_at, status_at: o.status_at,
          clusters: o.clusters, drop: dropArea_(o.address), dishes: o.items.reduce(function (n, i) { return n + i.qty; }, 0),
          pickups: pickups(o.items) };
      }) };
  } },
  // Take an order no rider has yet (first come, first served)
  accept: { write: true, run: function (ss, b, who) {
    const order = staffOrders_(ss, function (r) { return String(r.order_id).trim() === String(b.order_id || '').trim().toUpperCase(); })[0];
    if (!order) return { ok: false, error: 'not_found' };
    if (order.rider === who.phone) return { ok: true, already: true };
    if (order.rider) return { ok: false, error: 'taken' };
    if (OPEN_FOR_RIDERS.indexOf(order.status) < 0) return { ok: false, error: 'not_open' };
    writeOrder_(ss, order.order_id, { rider: "'" + who.phone });
    return { ok: true };
  } },
  // Give an accepted order back before picking it up (it goes back to the open orders)
  release: { write: true, run: function (ss, b, who) {
    const order = staffOrders_(ss, function (r) { return String(r.order_id).trim() === String(b.order_id || '').trim().toUpperCase(); })[0];
    if (!order || order.rider !== who.phone) return { ok: false, error: 'not_found' };
    if (OPEN_FOR_RIDERS.indexOf(order.status) < 0) return { ok: false, error: 'wrong_step' };
    writeOrder_(ss, order.order_id, { rider: '' });
    return { ok: true };
  } },
  location: { run: function (ss, b, who) {
    const lat = num_(b.lat, NaN);
    const lng = num_(b.lng, NaN);
    if (!isFinite(lat) || !isFinite(lng) || Math.abs(lat) > 90 || Math.abs(lng) > 180) return { ok: false, error: 'bad_location' };
    const at = new Date().toISOString();
    const cache = CacheService.getScriptCache();
    cache.put('loc:' + who.phone, JSON.stringify({ lat: lat, lng: lng, accuracy: num_(b.accuracy, 0), at: at }), LOCATION_MINUTES * 60);
    if (!cache.get('locw:' + who.phone)) {   // the Staff tab gets it at most once a minute
      cache.put('locw:' + who.phone, '1', 60);
      const sheet = ss.getSheetByName('Staff');
      const col = columns_(sheet, STAFF_HEAD);
      const last = sheet.getLastRow();
      const cells = last > 1 ? sheet.getRange(2, col.phone, last - 1, 1).getValues() : [];
      for (let i = 0; i < cells.length; i++) {
        if (phone10_(cells[i][0]) !== who.phone) continue;
        sheet.getRange(i + 2, col.last_lat).setValue(lat);
        sheet.getRange(i + 2, col.last_lng).setValue(lng);
        sheet.getRange(i + 2, col.last_seen_at).setValue(new Date());
      }
    }
    return { ok: true, at: at };
  } },
  picked_up: { write: true, run: function (ss, b, who) { return riderMove_(ss, b.order_id, who, 'Out for delivery', OPEN_FOR_RIDERS); } },
  delivered: { write: true, run: function (ss, b, who) { return riderMove_(ss, b.order_id, who, 'Delivered', ['Out for delivery']); } }
};

// A rider moves their own order on: picked up (from Paid or Preparing) → Out for delivery, then → Delivered.
// The admin can still set any status; restaurants only start preparing and mark their food ready.
function riderMove_(ss, orderId, who, status, from) {
  const order = staffOrders_(ss, function (r) { return String(r.order_id).trim() === String(orderId || '').trim().toUpperCase(); })[0];
  if (!order || order.rider !== who.phone) return { ok: false, error: 'not_found' };
  if (order.status === status) return { ok: true, already: true };
  if (from.indexOf(order.status) < 0) return { ok: false, error: 'wrong_step' };
  setStatus_(ss, order.order_id, status);
  return { ok: true };
}

// items → [{ restaurant_id, name, address, map_link, ready, dishes }]: where a rider picks up, one stop per restaurant
function pickupsFor_(ss) {
  const rests = index_(rows_(ss.getSheetByName('Restaurants')), 'restaurant_id');
  return function (items) {
    const stops = [];
    items.forEach(function (i) {
      const key = i.restaurant_id || i.restaurant;
      let stop = stops.filter(function (x) { return x.key === key; })[0];
      if (!stop) {
        const r = rests[i.restaurant_id] || {};
        stop = { key: key, restaurant_id: i.restaurant_id, name: String(r.name || i.restaurant), address: String(r.address || '').replace(/^'/, ''),
          map_link: /^https?:\/\//.test(String(r.map_link || '')) ? String(r.map_link) : '', ready: true, dishes: 0 };
        stops.push(stop);
      }
      stop.ready = stop.ready && i.ready;
      stop.dishes += i.qty;
    });
    return stops.map(function (x) { delete x.key; return x; });
  };
}

// "Girls Hostel 2, Room 114" → "Girls Hostel 2": the area an order goes to, for riders who haven't accepted it
function dropArea_(address) {
  return String(address || '').split(/[,\n]/)[0].trim().slice(0, 40);
}

// New order for the riders' Telegram group (Alerts → rider_telegram_chat_id), when the team marks it Paid
function riderAlert_(ss, orderId) {
  try {
    const set = {};
    rows_(ss.getSheetByName('Alerts')).forEach(function (r) { set[String(r.key).trim()] = r.value; });
    const token = String(set.telegram_bot_token || '').trim();
    const chat = String(set.rider_telegram_chat_id || '').trim();
    if (!token || !chat) return false;
    const order = staffOrders_(ss, function (r) { return String(r.order_id).trim() === orderId; })[0];
    if (!order || order.rider) return false;
    const stops = pickupsFor_(ss)(order.items);
    const site = String(set.website_url || '').trim().replace(/\/+$/, '');
    const text = ['🛵 New order to deliver · #' + order.order_id.slice(-4)]
      .concat(stops.map(function (x) { return 'Pick up: ' + x.name + (x.address ? ' (' + x.address + ')' : ''); }))
      .concat(['Drop: ' + (dropArea_(order.address) || '—'), site ? 'Accept it: ' + site + '/rider' : 'Accept it on the rider page'])
      .join('\n');
    const res = UrlFetchApp.fetch('https://api.telegram.org/bot' + token + '/sendMessage', {
      method: 'post', contentType: 'application/json', muteHttpExceptions: true,
      payload: JSON.stringify({ chat_id: chat, text: text, disable_web_page_preview: true })
    });
    return res.getResponseCode() === 200;
  } catch (err) {
    console.error('Rider alert failed: ' + err);
    return false;
  }
}

// ------------------------------------------------------------------ restaurant page
const PARTNER_OPS = {
  // Today's verified orders with this restaurant's dishes (no customer details: the rider handles those)
  queue: { run: function (ss, b, who) {
    const rest = index_(rows_(ss.getSheetByName('Restaurants')), 'restaurant_id')[who.restaurantId];
    if (!rest) return { ok: false, error: 'no_restaurant' };
    const name = String(rest.name);
    const list = staffOrders_(ss, function (r) {
      const s = String(r.status || '').trim();
      return ['Paid', 'Preparing', 'Out for delivery'].indexOf(s) >= 0 || (s === 'Delivered' && isToday_(r.created_at));
    }).map(function (o) {
      const mine = o.items.filter(function (i) { return i.restaurant_id ? i.restaurant_id === who.restaurantId : i.restaurant === name; });
      return mine.length ? { order_id: o.order_id, status: o.status, created_at: o.created_at, rider_name: o.rider_name,
        items: mine.map(function (i) { return { dish: i.dish, qty: i.qty }; }),
        ready: mine.every(function (i) { return i.ready; }), others: unique_(o.items.map(function (i) { return i.restaurant; }))
          .filter(function (x) { return x !== name; }) } : null;
    }).filter(Boolean).reverse();
    return { ok: true, restaurant: name, orders: list };
  } },
  preparing: { write: true, run: function (ss, b, who) {
    const order = partnerOrder_(ss, b.order_id, who);
    if (!order) return { ok: false, error: 'not_found' };
    if (order.status === 'Paid') setStatus_(ss, order.order_id, 'Preparing');
    return { ok: true };
  } },
  ready: { write: true, run: function (ss, b, who) {
    const order = partnerOrder_(ss, b.order_id, who);
    if (!order) return { ok: false, error: 'not_found' };
    if (order.status === 'Paid') setStatus_(ss, order.order_id, 'Preparing');
    const items = ss.getSheetByName('OrderItems');
    const col = columns_(items, ITEM_HEAD);
    const last = items.getLastRow();
    const cells = items.getRange(2, 1, last - 1, items.getLastColumn()).getValues();
    const dishes = index_(rows_(ss.getSheetByName('Dishes')), 'dish_id');
    const now = new Date();
    cells.forEach(function (r, i) {
      if (String(r[col.order_id - 1]).trim() !== order.order_id) return;
      const d = dishes[String(r[col.dish_id - 1]).trim()];
      if (d && String(d.restaurant_id) === who.restaurantId) items.getRange(i + 2, col.ready_at).setValue(now);
    });
    return { ok: true };
  } }
};

function partnerOrder_(ss, orderId, who) {
  const id = String(orderId || '').trim().toUpperCase();
  const order = staffOrders_(ss, function (r) { return String(r.order_id).trim() === id; })[0];
  if (!order || ['Paid', 'Preparing', 'Out for delivery'].indexOf(order.status) < 0) return null;
  return order.items.some(function (i) { return i.restaurant_id === who.restaurantId; }) ? order : null;
}

// ---- small helpers for the sections above
function truthy_(v, emptyMeans) {
  if (v === true || v === false) return v;
  const s = String(v === undefined || v === null ? '' : v).trim();
  if (!s) return emptyMeans;
  return /^(true|yes|y|1)$/i.test(s);
}

// "2026-10-14" for a date, an ISO text or a yyyy-mm-dd text, in Indian time
function istDay_(v) {
  if (typeof v === 'string' && /^'?\d{4}-\d{2}-\d{2}$/.test(v.trim())) return v.trim().replace(/^'/, '');
  const d = v instanceof Date ? v : new Date(v);
  if (isNaN(d.getTime())) return '';
  return new Date(d.getTime() + 330 * 60000).toISOString().slice(0, 10);
}

function newCode_() {
  let code = 'HG';
  for (let i = 0; i < 6; i++) code += CODE_CHARS.charAt(Math.floor(Math.random() * CODE_CHARS.length));
  return code;
}

function clearCaches_() {
  try { CacheService.getScriptCache().removeAll(['menu', 'status', 'reviews']); } catch (err) { /* ignore */ }
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
    } else if (a.kind === 'application') {
      const who = a.role === 'restaurant' ? 'restaurant' : 'rider';
      subject = 'Hungrr: new ' + who + ' application – ' + (a.business || a.name);
      intro = ['A ' + who + ' applied on the website. Check their details on the admin page (Join requests), then approve or decline.',
        '', 'Name: ' + a.name + (a.business ? ' (' + a.business + ')' : ''), 'Phone: +91 ' + a.phone.slice(0, 5) + ' ' + a.phone.slice(5)];
    } else {
      subject = 'Hungrr: test alert';
      intro = ['Alerts are working. You will get one like this when a customer has paid and needs checking.'];
    }
    if (cfg.emails.length) {
      const body = intro.concat(a.id && a.kind !== 'review' ? ['', 'Order: ' + a.id, 'Amount: ' + money] : [], ref ? ['UPI ref no.: ' + ref] : [])
        .concat(a.name && a.kind !== 'application' ? ['', 'Customer: ' + a.name + (a.phone ? ' · +91 ' + a.phone.slice(0, 5) + ' ' + a.phone.slice(5) : ''),
          'Deliver to: ' + a.address] : [])
        .concat(dishes.length ? [''].concat(dishes, ['Riders: ' + a.riders + (a.clusterNames ? ' (' + a.clusterNames + ')' : '')]) : [])
        .concat(a.notes ? ['', 'Notes: ' + a.notes] : [])
        .concat(a.link ? ['', (a.kind === 'application' ? 'Open the application: ' : 'Open the order: ') + a.link] : []);
      MailApp.sendEmail({ to: cfg.emails.join(','), subject: subject, body: body.join('\n') });
      sent.push('email');
    }
    if (cfg.telegramToken && cfg.telegramChat) {
      const head = a.kind === 'payment' ? '💰 Payment to verify' : a.kind === 'order' ? '🆕 New order (waiting for payment)'
        : a.kind === 'review' ? '⭐ ' + a.rating + '-star review'
        : a.kind === 'application' ? '🧾 New ' + (a.role === 'restaurant' ? 'restaurant' : 'rider') + ' application'
        : '✅ Hungrr alerts are working';
      const text = a.kind === 'application'
        ? [head, a.business || '', 'Approve on the admin page: Join requests'].filter(String).join('\n')
        : a.kind === 'review'
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
// Asks for the permissions alerts need, adds new Settings rows (hours, pause switch, banner), the Alerts, Reviews,
// Users, Staff, Partners, Coupons and Offers tabs (Offers starts with "every 5th order: free delivery"), the new Orders and
// OrderItems columns, makes the accounts' secret, and sends a test alert. Safe to run again: it only adds what is
// missing.
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
  const staff = sheet_(ss, 'Staff', STAFF_HEAD);
  ensureList_(staff, columns_(staff, STAFF_HEAD).role, STAFF_ROLES);
  const coupons = sheet_(ss, 'Coupons', COUPON_HEAD);
  ensureList_(coupons, columns_(coupons, COUPON_HEAD).type, DEAL_TYPES);
  const restaurants = ss.getSheetByName('Restaurants');
  if (restaurants) columns_(restaurants, RESTAURANT_PICKUP_HEAD);
  const partners = sheet_(ss, 'Partners', PARTNER_HEAD);
  const pcol = columns_(partners, PARTNER_HEAD);
  ensureList_(partners, pcol.role, PARTNER_ROLES);
  ensureList_(partners, pcol.status, PARTNER_STATUSES);
  const offers = sheet_(ss, 'Offers', OFFER_HEAD);
  const ocol = columns_(offers, OFFER_HEAD);
  ensureList_(offers, ocol.reward, DEAL_TYPES);
  if (offers.getLastRow() < 2) offers.getRange(2, 1, 1, OFFER_HEAD.length).setValues([DEFAULT_OFFER]);
  const items = sheet_(ss, 'OrderItems', ITEM_HEAD);
  columns_(items, ITEM_HEAD);
  secret_();
  clearCaches_();
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
