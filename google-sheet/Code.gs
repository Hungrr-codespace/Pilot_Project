/**
 * Hungrr – Google Sheet backend (Apps Script web app)
 *
 * Paste this whole file into the sheet's Extensions → Apps Script editor and deploy it as a web app
 * (see google-sheet/SETUP.md). The website then:
 *   GET  <web app URL>?action=menu   → reads Settings, Clusters, Restaurants, Dishes and QuickPicks
 *   POST <web app URL>               → body {"action":"order","order":{...}} adds the order to Orders and OrderItems
 *
 * Prices and totals are recalculated here from the sheet, so an order row never trusts the browser's numbers.
 */

const MENU_TABS = ['Settings', 'Clusters', 'Restaurants', 'Dishes', 'QuickPicks'];
const ORDER_HEAD = ['order_id', 'created_at', 'status', 'restaurants', 'clusters', 'riders', 'items',
  'item_total', 'gst', 'delivery', 'grand_total', 'site_total', 'total_check', 'device', 'notes'];
const ITEM_HEAD = ['order_id', 'created_at', 'restaurant', 'dish_id', 'dish', 'qty', 'price', 'line_total'];
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
  if (!body || body.action !== 'order' || !body.order) return json_({ ok: false, error: 'Unknown action' });
  const lock = LockService.getScriptLock();
  lock.waitLock(20000);
  try {
    return json_(saveOrder_(body.order));
  } finally {
    lock.releaseLock();
  }
}

function saveOrder_(o) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const id = String(o.order_id || '').trim().slice(0, 40);
  if (!/^HG-[A-Z0-9-]+$/i.test(id)) return { ok: false, error: 'Missing order ID' };

  const orders = sheet_(ss, 'Orders', ORDER_HEAD);
  const items = sheet_(ss, 'OrderItems', ITEM_HEAD);
  if (orders.getLastRow() > 1) {
    const seen = orders.getRange(2, 1, orders.getLastRow() - 1, 1).createTextFinder(id).matchEntireCell(true).findNext();
    if (seen) return { ok: true, order_id: id, duplicate: true };   // the same order sent twice keeps one row
  }

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

  const now = new Date();
  orders.appendRow([
    id, now, 'Payment to verify',
    unique_(lines.map(function (l) { return l.restaurant; })).join(', '),
    clusterIds.map(function (c) { return (clusters[c] && clusters[c].label) || c; }).join(', '),
    riders,
    lines.map(function (l) { return l.qty + ' × ' + l.dish + ' (' + l.restaurant + ')'; }).join('\n'),
    itemTotal, gst, delivery, grand, isNaN(siteTotal) ? '' : siteTotal, check,
    safe_(o.device), safe_(notes.join('; '))
  ]);
  items.getRange(items.getLastRow() + 1, 1, lines.length, ITEM_HEAD.length).setValues(lines.map(function (l) {
    return [id, now, l.restaurant, l.dishId, l.dish, l.qty, l.price, l.qty * l.price];
  }));
  return { ok: true, order_id: id, grand_total: grand, total_check: check };
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
