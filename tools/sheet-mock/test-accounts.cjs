// Run against a fresh mock: PORT=8792 node tools/sheet-mock/mock.cjs, then node tools/sheet-mock/test-accounts.cjs
// Accounts on the mock Apps Script: sign up, sign in, lockout, tokens, linked orders, claiming, names, PIN reset.
const crypto = require('crypto');
const B = 'http://127.0.0.1:' + (process.env.PORT || 8792);
const post = (body) => fetch(B + '/exec', { method: 'POST', body: JSON.stringify(body) }).then((r) => r.json());
const state = () => fetch(B + '/state').then((r) => r.json());
const order = (id, phone, extra = {}) => ({ order_id: id, customer: { name: 'Test', phone, address: 'Hostel 3, Room 12' }, items: [{ dish_id: 'bt1', qty: 2 }], grand_total: 0, ...extra });
const results = [];
const check = (name, ok, detail) => results.push((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  → ' + JSON.stringify(detail)));
(async () => {
  const P = '9876543210', PIN = '482915';
  let r = await post({ action: 'account_start', phone: '12345' });
  check('bad phone', r.error === 'bad_phone', r);
  r = await post({ action: 'account_start', phone: '+91 98765 43210' });
  check('new number', r.status === 'new', r);
  r = await post({ action: 'sign_up', phone: P, name: 'Aditya', pin: '123456' });
  check('run PIN refused', r.error === 'weak_pin', r);
  r = await post({ action: 'sign_up', phone: P, name: 'Aditya', pin: '777777' });
  check('same-digit PIN refused', r.error === 'weak_pin', r);
  r = await post({ action: 'sign_up', phone: P, name: 'A', pin: PIN });
  check('short name refused', r.error === 'bad_name', r);
  r = await post({ action: 'sign_up', phone: P, name: '  Aditya   Raj ', pin: PIN });
  check('sign up', r.ok && r.token && r.user.name === 'Aditya Raj' && r.user.phone === P, r);
  const token1 = r.token;
  r = await post({ action: 'sign_up', phone: '098765 43210', name: 'Someone', pin: '305718' });
  check('second sign up with same number refused', r.error === 'exists', r);
  r = await post({ action: 'account_start', phone: P });
  check('existing number', r.status === 'existing', r);

  for (let i = 1; i <= 4; i++) {
    r = await post({ action: 'sign_in', phone: P, pin: '000001' });
    check('wrong PIN ' + i, r.error === 'wrong_pin' && r.tries_left === 5 - i, r);
  }
  r = await post({ action: 'sign_in', phone: P, pin: '000001' });
  check('5th wrong PIN locks', r.error === 'locked' && r.minutes === 15, r);
  r = await post({ action: 'sign_in', phone: P, pin: PIN });
  check('right PIN while locked still refused', r.error === 'locked', r);
  r = await post({ action: 'account_start', phone: P });
  check('start shows locked', r.status === 'locked' && r.minutes > 0, r);
  await fetch(B + '/user?phone=' + P + '&col=locked_until&value=');
  r = await post({ action: 'sign_in', phone: '+919876543210', pin: PIN });
  check('sign in after lock ends', r.ok && r.token && r.user.name === 'Aditya Raj', r);
  const token = r.token;

  r = await post({ action: 'account', token });
  check('account by token', r.ok && r.user.phone === P && !r.orders, r);
  r = await post({ action: 'account', token: 'v1.9876543210.123.abc' });
  check('forged token', r.error === 'signed_out', r);
  r = await post({ action: 'account', token: token.replace(P, '9123456780') });
  check('token with another number', r.error === 'signed_out', r);
  const st0 = await state();
  const secret = st0.props.ACCOUNT_SECRET;
  const pinHash = st0.Users[1][st0.Users[0].indexOf('pin_hash')];
  const old = Math.floor(Date.now() / 1000) - 61 * 86400;
  const body = 'v1.' + P + '.' + old;
  const sig = crypto.createHmac('sha256', secret).update(body + '.' + String(pinHash).slice(0, 16)).digest('base64').replace(/\+/g, '-').replace(/\//g, '_');
  r = await post({ action: 'account', token: body + '.' + sig });
  check('61-day-old token expired', r.error === 'signed_out', r);
  const fresh = 'v1.' + P + '.' + Math.floor(Date.now() / 1000);
  const sig2 = crypto.createHmac('sha256', secret).update(fresh + '.' + String(pinHash).slice(0, 16)).digest('base64').replace(/\+/g, '-').replace(/\//g, '_');
  r = await post({ action: 'account', token: fresh + '.' + sig2 });
  check('token format matches Apps Script signing', r.ok, r);
  const users = st0.Users;
  const pinCol = users[0].indexOf('pin_hash');
  check('PIN never stored as typed', !JSON.stringify(users).includes(PIN) && users[1][pinCol].length > 20, users[1]);

  // An order while signed in (even with another phone typed) belongs to the account
  await post({ action: 'order', token, order: order('HG-261013-ACC1', '9000000001') });
  await post({ action: 'payment', token, order: order('HG-261013-ACC1', '9000000001', { upi_ref: '123412341234' }) });
  // A guest order with the same number, paid; and an unpaid guest order
  await post({ action: 'order', order: order('HG-261012-GST1', P) });
  await post({ action: 'payment', order: order('HG-261012-GST1', P, { upi_ref: '555566667777' }) });
  await post({ action: 'order', order: order('HG-261012-GST2', P) });
  // Someone else's order
  await post({ action: 'order', order: order('HG-261012-OTH1', '9111111111') });
  await post({ action: 'payment', order: order('HG-261012-OTH1', '9111111111', { upi_ref: '999988887777' }) });
  let st = await state();
  const oh = st.Orders[0];
  const row = (id) => st.Orders.find((x) => x[0] === id);
  check('signed-in order linked', String(row('HG-261013-ACC1')[oh.indexOf('account')]) === P, row('HG-261013-ACC1'));
  check('signed-in order uses account phone', String(row('HG-261013-ACC1')[oh.indexOf('phone')]).replace(/\D/g, '').endsWith(P), row('HG-261013-ACC1')[oh.indexOf('phone')]);
  check('guest order not linked', !row('HG-261012-GST1')[oh.indexOf('account')], row('HG-261012-GST1'));
  // A forged token on an order does not link it
  await post({ action: 'order', token: 'v1.9111111111.1.x', order: order('HG-261012-OTH2', '9111111111') });
  st = await state();
  check('order with forged token not linked', !st.Orders.find((x) => x[0] === 'HG-261012-OTH2')[oh.indexOf('account')], 1);

  r = await post({ action: 'account', token, orders: true });
  check('orders listed', r.ok && r.orders.length === 1 && r.orders[0].order_id === 'HG-261013-ACC1' && r.orders[0].items.length === 1 && r.orders[0].items[0].qty === 2, r);
  check('one earlier order to add', r.unclaimed === 1, r.unclaimed);
  check('no address or UPI ref sent', !JSON.stringify(r).includes('Hostel') && !JSON.stringify(r).includes('1234123'), r);

  r = await post({ action: 'claim_order', token, order_id: 'hg-261012-oth1' });
  check("someone else's order can't be added", r.error === 'not_found', r);
  r = await post({ action: 'claim_order', token, order_id: 'HG-261012-GST2' });
  check('unpaid order not added', r.error === 'not_paid', r);
  r = await post({ action: 'claim_order', token, order_id: 'HG-261012-GST1' });
  check('earlier order added', r.ok && !r.already, r);
  r = await post({ action: 'claim_order', token, order_id: 'HG-261012-GST1' });
  check('adding twice is fine', r.ok && r.already, r);
  r = await post({ action: 'account', token, orders: true });
  check('now two orders, newest first', r.orders.length === 2 && r.unclaimed === 0, r.orders.map((o) => o.order_id));

  // A review shows on the order
  await fetch(B + '/status?order=HG-261013-ACC1&status=Delivered');
  await post({ action: 'review', review: { order_id: 'HG-261013-ACC1', phone: P, rating: 4, tags: ['On time'], comment: 'Good', name: 'Aditya R.', consent: true } });
  r = await post({ action: 'account', token, orders: true });
  const acc1 = r.orders.find((o) => o.order_id === 'HG-261013-ACC1');
  check('review on the order', acc1.review && acc1.review.rating === 4 && acc1.review.state === 'waiting' && acc1.status === 'Delivered', acc1);

  r = await post({ action: 'update_name', token, name: 'x' });
  check('bad new name refused', r.error === 'bad_name', r);
  r = await post({ action: 'update_name', token, name: 'Aditya  Raj Singh' });
  check('name changed', r.ok && r.user.name === 'Aditya Raj Singh', r);
  r = await post({ action: 'update_name', token: token1, name: 'Old token' });
  check('first token still valid (same PIN)', r.ok, r);
  await post({ action: 'update_name', token, name: 'Aditya Raj Singh' });

  // The team resets a forgotten PIN by clearing pin_hash
  await fetch(B + '/user?phone=' + P + '&col=pin_hash&value=');
  r = await post({ action: 'account', token });
  check('cleared PIN signs the device out', r.error === 'signed_out', r);
  r = await post({ action: 'account_start', phone: P });
  check('start shows reset', r.status === 'reset', r);
  r = await post({ action: 'sign_in', phone: P, pin: PIN });
  check('old PIN no longer works', r.error === 'reset', r);
  r = await post({ action: 'sign_up', phone: P, name: 'Hijacker', pin: '641205' });
  check('new PIN set, name kept', r.ok && r.user.name === 'Aditya Raj Singh', r);
  r = await post({ action: 'sign_in', phone: P, pin: '641205' });
  check('sign in with new PIN', r.ok, r);
  r = await post({ action: 'account', token: r.token, orders: true });
  check('orders still there after reset', r.ok && r.orders.length === 2, r.orders && r.orders.length);
  st = await state();
  check('one Users row only', st.Users.length === 2, st.Users.length);
  console.log(results.join('\n'));
  console.log(results.filter((x) => x.startsWith('FAIL')).length ? 'SOME FAILED' : 'ALL PASSED (' + results.length + ')');
})();
