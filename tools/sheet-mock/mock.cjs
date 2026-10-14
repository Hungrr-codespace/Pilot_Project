// A stand-in for the Google Sheet + Apps Script, for testing on your computer: runs google-sheet/Code.gs in Node
// against an in-memory spreadsheet, behind a local HTTP server that answers like the deployed web app.
//   PORT=8792 node tools/sheet-mock/mock.cjs        then build the site with VITE_SHEET_API_URL=http://127.0.0.1:8792/exec
// Data lives in memory only: restart it for a clean sheet. Emails and Telegram messages are recorded, not sent.
// The Orders tab starts in the old format (as in a sheet made from the first template), to prove it upgrades.
// Extra addresses for tests: /setup (run setup()), /state (all tabs), /status?order=&status= (change a status),
// /approve?order=&value= (approve a review), /append (add a row), /cell, /tab?tab=, /user, /created.
const fs = require('fs'), vm = require('vm'), http = require('http'), crypto = require('crypto');
const path = require('path');
const CODE = fs.readFileSync(path.join(__dirname, '../../google-sheet/Code.gs'), 'utf8');
const mail = [], telegram = [];
const ROWS = JSON.parse(fs.readFileSync(path.join(__dirname, 'rows.json'), 'utf8'));
ROWS.Dishes.find((d) => d.dish_id === 'bt1').price = 65;                       // proves the site reads the sheet
ROWS.Settings.find((s) => s.key === 'delivery_charge_per_rider').value = 40;
// Hours as Sheets gives a time cell (a 1899 date), the pause switch as a checkbox
const timeCell = (h, m) => new Date(Date.UTC(1899, 11, 30, h, m) - 330 * 60000);
if (process.env.TEMPLATE) ROWS.Alerts = [{ key: 'alert_emails', value: '', note: '' }, { key: 'alert_on_new_order', value: false, note: '' }, { key: 'telegram_bot_token', value: '', note: '' }, { key: 'telegram_chat_id', value: '', note: '' }];
if (!process.env.MINIMAL) {
ROWS.Settings.push({ key: 'opens_at', value: timeCell(process.env.OPENS_H ? Number(process.env.OPENS_H) : 0, 0), note: '' });
ROWS.Settings.push({ key: 'closes_at', value: '11:59 PM', note: '' });
ROWS.Settings.push({ key: 'orders_paused', value: false, note: '' });
ROWS.Settings.push({ key: 'pause_message', value: '', note: '' });
ROWS.Alerts = [{ key: 'alert_emails', value: 'team@example.com, aditya@example.com', note: '' }, { key: 'alert_on_new_order', value: false, note: '' }, { key: 'telegram_bot_token', value: '123:ABC', note: '' }, { key: 'telegram_chat_id', value: '-1001', note: '' }];
}

function makeSheet(name, data) {
  const sh = { name, data, validation: {}, maxRows: 1000, checkboxes: [] };
  sh.getParent = () => ss;
  sh.getName = () => name;
  sh.getSheetId = () => Object.keys(sheets).indexOf(name) + 100;
  const width = () => sh.data.reduce((w, r) => Math.max(w, r.length), 0);
  sh.getLastRow = () => sh.data.length;
  sh.getLastColumn = () => width();
  sh.getMaxRows = () => sh.maxRows;
  sh.getDataRange = () => ({ getValues: () => sh.data.map((r) => { const c = r.slice(); while (c.length < width()) c.push(''); return c; }) });
  sh.appendRow = (row) => { sh.data.push(row.slice()); return sh; };
  sh.deleteRow = (n) => { sh.data.splice(n - 1, 1); };
  sh.setFrozenRows = () => {};
  sh.getRange = (r, c, nr = 1, nc = 1) => {
    const rng = {
      getValues: () => { const out = []; for (let i = 0; i < nr; i++) { const row = sh.data[r - 1 + i] || []; const o = []; for (let j = 0; j < nc; j++) o.push(row[c - 1 + j] ?? ''); out.push(o); } return out; },
      getValue: () => ((sh.data[r - 1] || [])[c - 1] ?? ''),
      setValue: (v) => { while (sh.data.length < r) sh.data.push([]); sh.data[r - 1][c - 1] = typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v; return rng; },
      setValues: (vals) => { vals.forEach((row, i) => { while (sh.data.length < r + i) sh.data.push([]); const target = sh.data[r - 1 + i]; row.forEach((v, j) => {
        // like Sheets: a leading ' keeps text; other strings stay as given
        target[c - 1 + j] = typeof v === 'string' && v.startsWith("'") ? v.slice(1) : v; }); }); return rng; },
      setFontWeight: () => rng,
      insertCheckboxes: () => { sh.checkboxes.push(r); return rng; },
      getSheet: () => sh, getRow: () => r, getLastRow: () => r + nr - 1, getColumn: () => c, getLastColumn: () => c + nc - 1,
      getDataValidation: () => sh.validation[c] || null,
      setDataValidation: (rule) => { sh.validation[c] = rule; return rng; },
    };
    return rng;
  };
  return sh;
}
const sheets = {};
for (const [name, rows] of Object.entries(ROWS)) {
  const head = Object.keys(rows[0]);
  sheets[name] = makeSheet(name, [head, ...rows.map((r) => head.map((h) => r[h]))]);
}
// The live sheet's Orders/OrderItems tabs, made from the old template, with one earlier order in them
const OLD_ORDER_HEAD = ['order_id', 'created_at', 'status', 'restaurants', 'clusters', 'riders', 'items', 'item_total', 'gst', 'delivery', 'grand_total', 'site_total', 'total_check', 'device', 'notes'];
sheets.Orders = makeSheet('Orders', [OLD_ORDER_HEAD, ['HG-261001-OLD1', new Date('2026-10-01T10:00:00Z'), 'Delivered', 'Babai Tiffins', 'Cluster 01', 1, '1 × Idli (Babai Tiffins)', 60, 3, 50, 113, 113, 'OK', 'desktop', '']]);
sheets.Orders.validation[3] = { getCriteriaValues: () => [['Payment to verify', 'Paid', 'Preparing', 'Out for delivery', 'Delivered', 'Cancelled'], true] };
sheets.OrderItems = makeSheet('OrderItems', [['order_id', 'created_at', 'restaurant', 'dish_id', 'dish', 'qty', 'price', 'line_total'], ['HG-261001-OLD1', new Date('2026-10-01T10:00:00Z'), 'Babai Tiffins', 'bt1', 'Idli (2 Pcs)', 1, 60, 60]]);

const ss = { getSheetByName: (n) => sheets[n] || null, insertSheet: (n) => (sheets[n] = makeSheet(n, [])),
  getUrl: () => 'https://docs.google.com/spreadsheets/d/MOCK/edit', getSpreadsheetTimeZone: () => 'Asia/Kolkata' };
const pad = (n) => String(n).padStart(2, '0');
const cache = new Map();
const props = new Map();
const builder = () => { const b = { list: null, requireValueInList: (l) => { b.list = l; return b; }, setAllowInvalid: () => b, build: () => ({ getCriteriaValues: () => [b.list, true] }) }; return b; };
const ctx = {
  SpreadsheetApp: { getActiveSpreadsheet: () => ss, newDataValidation: builder },
  CacheService: { getScriptCache: () => ({ get: (k) => cache.get(k) ?? null, put: (k, v) => cache.set(k, v), remove: (k) => cache.delete(k), removeAll: (ks) => ks.forEach((k) => cache.delete(k)) }) },
  Utilities: { formatDate: (d, tz, fmt) => { const t = new Date(d.getTime() + 330 * 60000); return pad(t.getUTCHours()) + ':' + pad(t.getUTCMinutes()); },
    getUuid: () => crypto.randomUUID(),
    // like Apps Script: signed bytes (-128..127)
    computeHmacSha256Signature: (value, key) => [...crypto.createHmac('sha256', key).update(value, 'utf8').digest()].map((b) => (b > 127 ? b - 256 : b)),
    base64EncodeWebSafe: (bytes) => Buffer.from(bytes.map((b) => b & 255)).toString('base64').replace(/\+/g, '-').replace(/\//g, '_') },
  PropertiesService: { getScriptProperties: () => ({ getProperty: (k) => props.get(k) ?? null, setProperty: (k, v) => { props.set(k, v); } }) },
  MailApp: { sendEmail: (m) => mail.push(m) },
  UrlFetchApp: { fetch: (url, opt) => { telegram.push({ url, body: JSON.parse(opt.payload) }); return { getResponseCode: () => 200, getContentText: () => '{"ok":true}' }; } },
  Session: { getEffectiveUser: () => ({ getEmail: () => 'owner@example.com' }) },
  LockService: { getScriptLock: () => ({ waitLock() {}, releaseLock() {} }) },
  ContentService: { MimeType: { JSON: 'application/json' }, createTextOutput: (s) => ({ s, setMimeType() { return this; } }) },
  console, Date, JSON, Math, String, Number, Array, Object, isFinite, isNaN,
};
vm.createContext(ctx);
vm.runInContext(CODE, ctx, { filename: 'Code.gs' });

const log = [];
const server = http.createServer((req, res) => {
  const u = new URL(req.url, 'http://x');
  const send = (s) => { res.writeHead(200, { 'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*' }); res.end(s); };
  if (u.pathname === '/exec' && req.method === 'GET') { log.push({ t: 'GET', q: u.search }); return send(ctx.doGet({ parameter: Object.fromEntries(u.searchParams) }).s); }
  if (u.pathname === '/exec' && req.method === 'POST') {
    let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => {
      const out = ctx.doPost({ postData: { contents: b } });
      let action = ''; try { action = JSON.parse(b).action; } catch {}
      log.push({ t: 'POST', action, resp: JSON.parse(out.s) }); send(out.s);
    }); return;
  }
  if (u.pathname === '/post' && req.method === 'POST') {  // direct calls for script-only tests
    let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => send(ctx.doPost({ postData: { contents: b } }).s)); return;
  }
  if (u.pathname === '/set') {  // change a Settings value, like flipping the pause switch, then the edit trigger runs
    const row = sheets.Settings.data.find((r) => r[0] === u.searchParams.get('key'));
    const v = u.searchParams.get('value'); row[1] = v === 'true' ? true : v === 'false' ? false : v;
    ctx.onEdit({ range: sheets.Settings.getRange(2, 2) }); return send('{"ok":true}');
  }
  if (u.pathname === '/status') {  // the team changes an order's status in the sheet
    const sh = sheets.Orders; const head = sh.data[0]; const sc = head.indexOf('status');
    const ri = sh.data.findIndex((r) => r[0] === u.searchParams.get('order'));
    sh.data[ri][sc] = u.searchParams.get('status');
    if (u.searchParams.get('ago')) { sh.data[ri][head.indexOf('status_at')] = new Date(Date.now() - Number(u.searchParams.get('ago')) * 60000); return send('{"ok":true}'); }
    ctx.onEdit({ range: sh.getRange(ri + 1, sc + 1) }); return send(JSON.stringify({ ok: true, row: sh.data[ri] }));
  }
  if (u.pathname === '/approve') {  // the team sets approved in Reviews
    const sh = sheets.Reviews; const head = sh.data[0]; const ri = sh.data.findIndex((r) => r[0] === u.searchParams.get('order'));
    sh.data[ri][head.indexOf('approved')] = u.searchParams.get('value') || 'Yes';
    ctx.onEdit({ range: sh.getRange(ri + 1, head.indexOf('approved') + 1) }); return send('{"ok":true}');
  }
  if (u.pathname === '/user') {  // the team edits a Users cell, e.g. clears pin_hash to reset a PIN
    const sh = sheets.Users; const head = sh.data[0]; const ri = sh.data.findIndex((r, i) => i && String(r[0]).replace(/\D/g, '').endsWith(u.searchParams.get('phone')));
    const v = u.searchParams.get('value') ?? ''; sh.data[ri][head.indexOf(u.searchParams.get('col'))] = u.searchParams.get('date') ? new Date(Number(v)) : v; return send(JSON.stringify({ ok: true, row: sh.data[ri] }));
  }
  if (u.pathname === '/created') {  // pretend an order was placed `ago` minutes ago
    const sh = sheets.Orders; const ri = sh.data.findIndex((r) => r[0] === u.searchParams.get('order'));
    sh.data[ri][sh.data[0].indexOf('created_at')] = new Date(Date.now() - Number(u.searchParams.get('ago')) * 60000); return send('{"ok":true}');
  }
  if (u.pathname === '/append' && req.method === 'POST') {  // add a row to a tab by column name, as the team would
    let b = ''; req.on('data', (c) => { b += c; }); req.on('end', () => {
      const { tab, row } = JSON.parse(b); const sh = sheets[tab]; const head = sh.data[0];
      sh.data.push(head.map((h) => (row[h] === undefined ? '' : row[h]))); send('{"ok":true}');
    }); return;
  }
  if (u.pathname === '/cell') {  // set one cell: tab, key column, key, column, value
    const sh = sheets[u.searchParams.get('tab')]; const head = sh.data[0];
    const ki = head.indexOf(u.searchParams.get('key')); const ri = sh.data.findIndex((r, i) => i && String(r[ki]) === u.searchParams.get('id'));
    let v = u.searchParams.get('value'); if (v === 'true') v = true; if (v === 'false') v = false;
    sh.data[ri][head.indexOf(u.searchParams.get('col'))] = v; ctx.onEdit({ range: sh.getRange(ri + 1, 1) }); return send('{"ok":true}');
  }
  if (u.pathname === '/tab') return send(JSON.stringify(sheets[u.searchParams.get('tab')] ? sheets[u.searchParams.get('tab')].data : null));
  if (u.pathname === '/setup') { ctx.setup(); return send(JSON.stringify({ Settings: sheets.Settings.data, Alerts: sheets.Alerts.data, checkboxes: sheets.Settings.checkboxes })); }
  if (u.pathname === '/state') return send(JSON.stringify({ log, mail, telegram, Reviews: sheets.Reviews ? sheets.Reviews.data : null, Users: sheets.Users ? sheets.Users.data : null, props: Object.fromEntries(props), Orders: sheets.Orders.data, OrderItems: sheets.OrderItems.data, statusRule: (sheets.Orders.validation[3] && sheets.Orders.validation[3].getCriteriaValues()[0]) }, null, 1));
  res.writeHead(404); res.end();
});
server.listen(Number(process.env.PORT || 8790), () => console.log('mock Apps Script on', process.env.PORT || 8790));
