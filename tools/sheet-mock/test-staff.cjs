// Run against a fresh mock: PORT=8792 node tools/sheet-mock/mock.cjs, then node tools/sheet-mock/test-staff.cjs
// Coupons, the automatic offer, and the admin, rider and restaurant operations, on the mock Apps Script.
const B = 'http://127.0.0.1:' + (process.env.PORT || 8792);
const post = (body) => fetch(B + '/exec', { method: 'POST', body: JSON.stringify(body) }).then((r) => r.json());
const get = (q) => fetch(B + '/exec?' + q).then((r) => r.json());
const tab = (t) => fetch(B + '/tab?tab=' + t).then((r) => r.json());
const append = (t, row) => fetch(B + '/append', { method: 'POST', body: JSON.stringify({ tab: t, row }) });
const results = [];
const check = (name, ok, detail) => results.push((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  → ' + JSON.stringify(detail).slice(0, 400)));
const day = (offset) => new Date(Date.now() + 330 * 60000 + offset * 86400000).toISOString().slice(0, 10);
let n = 0;
const newId = () => 'HG-261014-T' + String(++n).padStart(3, '0');
async function place(token, phone, items, coupon, { pay = true } = {}) {
  const id = newId();
  const order = { order_id: id, customer: { name: 'Cust', phone, address: 'Hostel 1' }, items, coupon, grand_total: 0 };
  await post({ action: 'order', token, order });
  if (pay) await post({ action: 'payment', token, order: { ...order, upi_ref: String(100000000000 + n * 7919) } });
  const orders = await tab('Orders');
  const h = orders[0];
  const row = orders.find((r) => r[0] === id);
  return { id, coupon: row[h.indexOf('coupon')], discount: row[h.indexOf('discount')], grand: row[h.indexOf('grand_total')], gst: row[h.indexOf('gst')], delivery: row[h.indexOf('delivery')], notes: row[h.indexOf('notes')], status: row[h.indexOf('status')] };
}
(async () => {
  await fetch(B + '/setup');
  const offers = await tab('Offers');
  check('setup adds the 5th-order offer', offers && offers[1] && offers[1][2] === 5 && offers[1][3] === 'free_delivery', offers);
  check('setup adds Staff and Coupons', Boolean(await tab('Staff')) && Boolean(await tab('Coupons')), 1);
  const settings = await tab('Settings');
  check('setup adds site_banner', settings.some((r) => r[0] === 'site_banner'), settings.map((r) => r[0]));

  const signUp = (phone, name) => post({ action: 'sign_up', phone, name, pin: '482915' });
  const A = await signUp('9000000101', 'Admin One');
  const R = await signUp('9000000102', 'Ravi Kumar');
  const P = await signUp('9000000103', 'Babai Staff');
  const C = await signUp('9000000104', 'Customer Cee');
  await append('Staff', { phone: '9000000101', name: 'Admin One', role: 'admin', active: true });
  await append('Staff', { phone: '9000000102', name: 'Ravi Kumar', role: 'rider', active: true });
  await append('Staff', { phone: '9000000103', name: 'Babai Staff', role: 'restaurant', restaurant_id: 'bt', active: true });
  let r = await post({ action: 'account', token: A.token });
  check('admin role on the account', r.roles && r.roles[0].role === 'admin', r.roles);
  r = await post({ action: 'account', token: P.token });
  check('restaurant role with its name', r.roles && r.roles[0].role === 'restaurant' && r.roles[0].restaurant === 'Babai Tiffins', r.roles);
  r = await post({ action: 'admin', op: 'board', token: C.token });
  check('a customer cannot open the admin page', r.error === 'not_staff', r);
  r = await post({ action: 'admin', op: 'board', token: 'x' });
  check('no sign-in, no admin page', r.error === 'signed_out', r);
  r = await post({ action: 'rider', op: 'jobs', token: A.token });
  check('an admin is not a rider unless listed', r.error === 'not_staff', r);

  // Coupons
  const admin = (op, extra = {}) => post({ action: 'admin', op, token: A.token, ...extra });
  r = await admin('coupon_save', { coupon: { name: 'Pilot fifty', type: 'amount', value: 50, min_order: 100 } });
  check('coupon code generated', r.ok && /^HG[A-Z2-9]{6}$/.test(r.code), r);
  const PILOT = r.code;
  r = await admin('coupon_save', { coupon: { name: 'Welcome twenty', code: 'welcome20', type: 'percent', value: 20, max_discount: 60, per_customer: 1 } });
  check('coupon with own code (made upper case)', r.ok && r.code === 'WELCOME20', r);
  r = await admin('coupon_save', { coupon: { name: 'Copy', code: 'WELCOME20', type: 'amount', value: 10 } });
  check('duplicate code refused', r.error === 'code_taken', r);
  r = await admin('coupon_save', { coupon: { name: 'Too much', type: 'percent', value: 120 } });
  check('120% refused', r.error === 'bad_value', r);
  r = await admin('coupon_save', { coupon: { name: 'Bad dates', type: 'amount', value: 10, starts_on: day(2), ends_on: day(1) } });
  check('end before start refused', r.error === 'bad_dates', r);
  await admin('coupon_save', { coupon: { name: 'Old', code: 'OLDCODE', type: 'amount', value: 30, ends_on: day(-1) } });
  await admin('coupon_save', { coupon: { name: 'Soon', code: 'SOONCODE', type: 'amount', value: 30, starts_on: day(2) } });
  await admin('coupon_save', { coupon: { name: 'Free ride', code: 'FREERIDE', type: 'free_delivery', max_uses: 1 } });
  r = await admin('coupon_save', { coupon: { was: 'SOONCODE', name: 'Soon (edited)', code: 'SOONCODE', type: 'amount', value: 35, starts_on: day(2) } });
  check('editing a coupon keeps its code', r.ok && r.code === 'SOONCODE', r);
  const deals = (token, coupon) => post({ action: 'deals', token, coupon });
  r = await deals(C.token, 'welcome20');
  check('deals: coupon rule', r.ok && r.coupon && r.coupon.type === 'percent' && r.coupon.value === 20 && r.coupon.max_discount === 60 && !r.coupon_error, r);
  check('deals: progress 0 of 5', r.progress && r.progress.every_n === 5 && r.progress.done === 0 && !r.progress.next_gets_it, r.progress);
  r = await deals(C.token, 'NOPE');
  check('unknown code', r.coupon_error === 'not_found', r);
  r = await deals(C.token, 'OLDCODE');
  check('expired code', r.coupon_error === 'expired', r);
  r = await deals(C.token, 'SOONCODE');
  check('not started yet', r.coupon_error === 'not_started', r);
  await admin('coupon_active', { code: 'OLDCODE', active: false });
  r = await deals(C.token, 'OLDCODE');
  check('switched-off code', r.coupon_error === 'inactive', r);
  r = await deals('bad', 'WELCOME20');
  check('deals need sign-in', r.error === 'signed_out', r);
  // Coupons listed at checkout: only those marked to show, usable today, without their names
  r = await admin('coupon_save', { coupon: { name: 'Listed ten', code: 'LISTED10', type: 'amount', value: 10, show_at_checkout: true } });
  check('listed coupon saved', r.ok && r.code === 'LISTED10', r);
  await admin('coupon_save', { coupon: { name: 'Listed later', code: 'LATER10', type: 'amount', value: 10, starts_on: day(3), show_at_checkout: true } });
  r = await deals(C.token, '');
  check('checkout lists only coupons marked to show and active today', r.available && r.available.map((c) => c.code).join() === 'LISTED10', r.available);
  check('listed coupons carry the rule, not the team name', r.available[0].value === 10 && r.available[0].type === 'amount' && !('name' in r.available[0]), r.available[0]);

  // Orders with coupons: 3 × Idli (65) = 195; 20% = 39 (cap 60); GST 5% on 156 = 7.80; delivery 40 → 203.80
  let o = await place(C.token, '9000000104', [{ dish_id: 'bt1', qty: 3 }], 'welcome20');
  check('20% coupon on the food, GST after it', o.coupon === 'WELCOME20' && o.discount === 39 && o.gst === 7.8 && o.grand === 203.8, o);
  o = await place(C.token, '9000000104', [{ dish_id: 'bt1', qty: 3 }], 'WELCOME20');
  check('once per customer', o.coupon === '' && /used_by_you/.test(o.notes) && o.grand === 244.75, o);
  o = await place(C.token, '9000000104', [{ dish_id: 'bt1', qty: 1 }], PILOT);
  check('below the minimum order: no discount', o.coupon === '' && o.grand === 108.25, o);
  o = await place(C.token, '9000000104', [{ dish_id: 'bt1', qty: 2 }], 'FREERIDE');
  check('free delivery coupon', o.coupon === 'FREERIDE' && o.discount === 40 && o.delivery === 40 && o.grand === 136.5, o);
  r = await deals(C.token, 'FREERIDE');
  check('max uses reached', r.coupon_error === 'used_up', r);
  // List WELCOME20 (once per customer) and FREERIDE (used up): C has used WELCOME20, a new customer hasn't
  await admin('coupon_save', { coupon: { was: 'WELCOME20', name: 'Welcome twenty', code: 'WELCOME20', type: 'percent', value: 20, max_discount: 60, per_customer: 1, show_at_checkout: true } });
  await admin('coupon_save', { coupon: { was: 'FREERIDE', name: 'Free ride', code: 'FREERIDE', type: 'free_delivery', max_uses: 1, show_at_checkout: true } });
  r = await deals(C.token, '');
  check('a coupon this customer used up is not listed for them', r.available.map((c) => c.code).sort().join() === 'LISTED10', r.available);
  const D = await signUp('9000000106', 'Customer Dee');
  r = await deals(D.token, '');
  check('a new customer sees it, but not the used-up coupon', r.available.map((c) => c.code).sort().join() === 'LISTED10,WELCOME20', r.available);
  r = await admin('coupons');
  const state = Object.fromEntries(r.coupons.map((c) => [c.code, c.state]));
  check('admin list says which coupons are active now', state.LISTED10 === 'live' && state.WELCOME20 === 'live' && state.FREERIDE === 'used_up' && state.OLDCODE === 'off' && state.SOONCODE === 'scheduled' && state.LATER10 === 'scheduled', state);
  check('admin list has the checkout switch', r.coupons.find((c) => c.code === 'LISTED10').show_at_checkout === true && r.coupons.find((c) => c.code === 'SOONCODE').show_at_checkout === false, 1);
  // 4 paid orders so far → the 5th gets free delivery
  r = await deals(C.token, '');
  check('5th order: offer applies', r.offer && r.offer.type === 'free_delivery' && r.progress.done === 4 && r.progress.next_gets_it, r);
  o = await place(C.token, '9000000104', [{ dish_id: 'bt1', qty: 1 }], '');
  check('5th order gets free delivery', o.coupon === 'Every 5th order: free delivery' && o.discount === 40 && o.grand === 68.25, o);
  r = await deals(C.token, '');
  check('6th order: no offer, progress 0', !r.offer && r.progress.done === 0, r.progress);
  // An unpaid order doesn't count towards the offer
  await place(C.token, '9000000104', [{ dish_id: 'bt1', qty: 1 }], '', { pay: false });
  r = await deals(C.token, '');
  check('unpaid orders not counted', r.progress.paid_orders === 5, r.progress);
  // Best of offer and coupon: make 4 more paid orders, then the 10th with a ₹50 coupon (beats ₹40 free delivery)
  for (let i = 0; i < 4; i++) await place(C.token, '9000000104', [{ dish_id: 'bt1', qty: 1 }], '');
  o = await place(C.token, '9000000104', [{ dish_id: 'bt1', qty: 2 }], PILOT);
  check('10th order: the coupon saves more, so it is used (one offer per order)', o.coupon === PILOT && o.discount === 50, o);
  // Change the offer from the admin page
  r = await admin('offer_save', { offer: { offer_id: 'nth-order', name: 'Every 3rd order: 10% off', every_n: 3, reward: 'percent', value: 10, max_discount: 30, active: true } });
  check('offer saved', r.ok, r);
  const menu = await get('action=menu');
  check('menu shows the public offer', menu.offers && menu.offers[0].every_n === 3 && menu.offers[0].type === 'percent', menu.offers);
  check('menu never shows coupon codes', !JSON.stringify(menu).includes('WELCOME20'), 1);
  r = await admin('coupons');
  const w = r.coupons.find((c) => c.code === 'WELCOME20');
  check('coupon list with uses', w && w.used === 1 && r.offers[0].every_n === 3, r.coupons.map((c) => [c.code, c.used]));

  // Order board, rider, restaurant, tracking
  o = await place(C.token, '9000000104', [{ dish_id: 'bt1', qty: 2 }, { dish_id: 'ad1', qty: 1 }], '');
  const ID = o.id;
  r = await admin('board');
  const card = r.orders.find((x) => x.order_id === ID);
  check('board shows the order to verify', card && card.status === 'Payment to verify' && card.items.length === 2 && card.upi_ref.length === 12, card);
  check('board lists riders', r.riders.length === 1 && r.riders[0].name === 'Ravi Kumar', r.riders);
  const partner = (op, extra = {}) => post({ action: 'partner', op, token: P.token, ...extra });
  r = await partner('queue');
  check('restaurant does not see unverified orders', r.ok && !r.orders.some((x) => x.order_id === ID), r);
  r = await admin('set_status', { order_id: ID, status: 'Paid' });
  check('admin verifies payment', r.ok, r);
  r = await admin('set_status', { order_id: ID, status: 'Eaten' });
  check('unknown status refused', r.error === 'bad_status', r);
  r = await partner('queue');
  const pq = r.orders.find((x) => x.order_id === ID);
  check('restaurant sees only its dishes', pq && pq.items.length === 1 && pq.items[0].dish === 'Idli (2 Pcs)' && pq.others[0] === 'Al Daaz' && !JSON.stringify(pq).includes('Hostel'), pq);
  r = await partner('preparing', { order_id: ID });
  r = await admin('board');
  check('preparing moves the order on', r.orders.find((x) => x.order_id === ID).status === 'Preparing', 1);
  r = await partner('ready', { order_id: ID });
  r = await partner('queue');
  check('ready marks only its dishes', r.orders.find((x) => x.order_id === ID).ready === true, r.orders);
  r = await admin('board');
  const items = r.orders.find((x) => x.order_id === ID).items;
  check('board shows which restaurant is ready', items.find((i) => i.restaurant === 'Babai Tiffins').ready && !items.find((i) => i.restaurant === 'Al Daaz').ready, items);
  r = await post({ action: 'partner', op: 'ready', token: P.token, order_id: 'HG-261014-T001' });
  check('restaurant cannot touch an order without its dishes… or finished', r.error === 'not_found', r);
  const rider = (op, extra = {}) => post({ action: 'rider', op, token: R.token, ...extra });
  r = await rider('jobs');
  check('no job before assignment', r.ok && r.jobs.length === 0, r);
  r = await admin('assign_rider', { order_id: ID, rider: '9000000104' });
  check('only a rider can be assigned', r.error === 'not_rider', r);
  r = await admin('assign_rider', { order_id: ID, rider: '9000000102' });
  r = await rider('jobs');
  const job = r.jobs[0];
  check('rider sees the job with address and phone', job && job.order_id === ID && job.address === 'Hostel 1' && job.phone === '9000000104', job);
  r = await rider('location', { lat: 23.4123, lng: 85.4401, accuracy: 12 });
  check('location saved', r.ok, r);
  r = await post({ action: 'track', order_id: ID, phone: '9000000104' });
  check('no map before pick-up', r.order.rider === null, r.order.rider);
  r = await rider('picked_up', { order_id: ID });
  r = await post({ action: 'track', order_id: ID, phone: '9000000104' });
  check('customer sees rider name and position', r.order.status === 'Out for delivery' && r.order.rider.name === 'Ravi' && r.order.rider.lat === 23.4123 && !JSON.stringify(r).includes('9000000102'), r.order.rider);
  const staffTab = await tab('Staff');
  check('Staff tab gets the last position', staffTab[2][staffTab[0].indexOf('last_lat')] === 23.4123, staffTab[2]);
  r = await post({ action: 'rider', op: 'delivered', token: A.token, order_id: ID });
  check('admin is not this rider', r.error === 'not_staff', r);
  r = await rider('delivered', { order_id: ID });
  r = await rider('jobs');
  check('delivered today counted', r.jobs.length === 0 && r.delivered_today === 1, r);
  const orders = await tab('Orders');
  const row = orders.find((x) => x[0] === ID);
  check('picked_up_at and delivered_at set', row[orders[0].indexOf('picked_up_at')] && row[orders[0].indexOf('delivered_at')], row);

  // Reviews
  await post({ action: 'review', review: { order_id: ID, phone: '9000000104', rating: 5, tags: ['On time'], comment: 'Fast!', name: 'Cee', consent: true } });
  r = await admin('reviews');
  check('review waiting for a decision', r.waiting.length === 1 && r.waiting[0].comment === 'Fast!', r.waiting);
  await admin('review_set', { order_id: ID, approved: 'Yes' });
  r = await get('action=reviews');
  check('approved review is public', r.reviews.some((x) => x.comment === 'Fast!'), r.reviews);

  // Menu switches, pause, banner
  r = await admin('menu');
  check('menu lists restaurants and dishes', r.restaurants.length === 5 && r.dishes.length > 20 && r.paused === false, r.restaurants);
  const bt = r.restaurants.find((x) => x.id === 'bt');
  check('menu has what the menu-book layout needs', r.clusters.length === 2 && bt.initials === 'BT' && bt.cluster_id === r.clusters[0].id && typeof bt.sort === 'number' && r.dishes.every((d) => typeof d.veg === 'boolean'), { clusters: r.clusters, bt });
  await admin('menu_set', { kind: 'dish', id: 'bt1', on: false });
  await admin('menu_set', { kind: 'restaurant', id: 'ad', on: false });
  const m2 = await get('action=menu');
  check('sold out and closed show on the menu', String(m2.Dishes.find((d) => d.dish_id === 'bt1').available) === 'false' && String(m2.Restaurants.find((x) => x.restaurant_id === 'ad').active) === 'false', 1);
  await admin('shop_set', { paused: true, pause_message: 'Back at 6', banner: 'Rain today: 20 min late' });
  r = await get('action=status');
  const m3 = await get('action=menu');
  check('pause and banner', r.orders_paused === true && r.pause_message === 'Back at 6' && m3.Settings.find((x) => x.key === 'site_banner').value === 'Rain today: 20 min late', r);

  // Customers
  await post({ action: 'sign_in', phone: '9000000104', pin: '000001' });
  r = await admin('customer', { phone: '+91 90000 00104' });
  check('customer lookup', r.ok && r.account.name === 'Customer Cee' && r.account.failed_tries === 1 && r.orders.length > 5, r.account);
  await admin('customer_set', { phone: '9000000104', do: 'unlock' });
  r = await admin('customer', { phone: '9000000104' });
  check('unlock', r.account.failed_tries === 0, r.account);
  await admin('customer_set', { phone: '9000000104', do: 'reset_pin' });
  r = await post({ action: 'account', token: C.token });
  check('reset PIN signs the customer out', r.error === 'signed_out', r);

  // Numbers
  r = await admin('stats', { days: 1 });
  check('today\'s numbers', r.ok && r.orders === 11 && r.revenue > 0 && r.discounts === 39 + 40 + 40 + 50 && r.top_dishes[0].dish === 'Idli (2 Pcs)' && r.to_verify >= 0, r);
  console.log(results.join('\n'));
  console.log(results.filter((x) => x.startsWith('FAIL')).length ? 'SOME FAILED' : 'ALL PASSED (' + results.length + ')');
})();
