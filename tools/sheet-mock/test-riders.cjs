// Run against a fresh mock: PORT=8792 node tools/sheet-mock/mock.cjs, then node tools/sheet-mock/test-riders.cjs
// Riders seeing new orders and accepting them, pickup addresses, the order of steps, and the riders' Telegram alert.
const B = 'http://127.0.0.1:' + (process.env.PORT || 8792);
const post = (body) => fetch(B + '/exec', { method: 'POST', body: JSON.stringify(body) }).then((r) => r.json());
const tab = (t) => fetch(B + '/tab?tab=' + t).then((r) => r.json());
const append = (t, row) => fetch(B + '/append', { method: 'POST', body: JSON.stringify({ tab: t, row }) });
const cell = (q) => fetch(B + '/cell?' + new URLSearchParams(q));
const state = () => fetch(B + '/state').then((r) => r.json());
const results = [];
const check = (name, ok, detail) =>
  results.push((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  → ' + JSON.stringify(detail).slice(0, 400)));
const statusOf = async (id) => {
  const rows = await tab('Orders');
  return rows.find((r) => r[0] === id)[rows[0].indexOf('status')];
};
const riderOf = async (id) => {
  const rows = await tab('Orders');
  return String(rows.find((r) => r[0] === id)[rows[0].indexOf('rider')]).replace(/^'/, '');
};
const PIN = '482915';
let n = 0;

(async () => {
  await fetch(B + '/setup');
  const restaurants = await tab('Restaurants');
  check('setup adds address and map_link to Restaurants', restaurants[0].includes('address') && restaurants[0].includes('map_link'), restaurants[0]);
  const alerts = await tab('Alerts');
  check('setup adds the riders’ Telegram group and website address to Alerts', alerts.some((r) => r[0] === 'rider_telegram_chat_id') && alerts.some((r) => r[0] === 'website_url'), alerts.map((r) => r[0]));

  const signUp = (phone, name) => post({ action: 'sign_up', phone, name, pin: PIN });
  const A = await signUp('9000000601', 'Admin');
  const R1 = await signUp('9000000602', 'Ravi Kumar');
  const R2 = await signUp('9000000603', 'Sunil Yadav');
  const K = await signUp('9000000604', 'Babai Kitchen');
  const C = await signUp('9000000605', 'Muskan Singh');
  await append('Staff', { phone: '9000000601', name: 'Admin', role: 'admin', active: true });
  await append('Staff', { phone: '9000000602', name: 'Ravi Kumar', role: 'rider', active: true });
  await append('Staff', { phone: '9000000603', name: 'Sunil Yadav', role: 'rider', active: true });
  await append('Staff', { phone: '9000000604', name: 'Babai Kitchen', role: 'restaurant', restaurant_id: 'bt', active: true });
  const admin = (op, extra = {}) => post({ action: 'admin', op, token: A.token, ...extra });
  const rider1 = (op, extra = {}) => post({ action: 'rider', op, token: R1.token, ...extra });
  const rider2 = (op, extra = {}) => post({ action: 'rider', op, token: R2.token, ...extra });
  const kitchen = (op, extra = {}) => post({ action: 'partner', op, token: K.token, ...extra });
  const place = async (items, address = 'Girls Hostel 2, Room 114') => {
    const id = 'HG-261014-R' + String(++n).padStart(3, '0');
    const order = { order_id: id, customer: { name: 'Muskan Singh', phone: '9000000605', address }, items, grand_total: 0 };
    await post({ action: 'order', token: C.token, order });
    await post({ action: 'payment', token: C.token, order: { ...order, upi_ref: String(300000000000 + n * 7919) } });
    return id;
  };

  // Pickup addresses, set by the admin
  let r = await admin('restaurant_set', { id: 'bt', address: '  Babai Tiffins,  Main Road, Mesra ', map_link: 'https://maps.app.goo.gl/abc123' });
  check('admin saves a pickup address and map link', r.ok, r);
  r = await admin('restaurant_set', { id: 'bt', map_link: 'maps.app.goo.gl/abc' });
  check('a map link must be a web address', r.error === 'bad_link', r);
  r = await admin('restaurant_set', { id: 'nope', address: 'Somewhere' });
  check('unknown restaurant', r.error === 'not_found', r);
  r = await post({ action: 'admin', op: 'restaurant_set', token: R1.token, id: 'bt', address: 'x' });
  check('only the admin changes addresses', r.error === 'not_staff', r);
  r = await admin('menu');
  const bt = r.restaurants.find((x) => x.id === 'bt');
  check('admin menu shows the address (spaces tidied)', bt.address === 'Babai Tiffins, Main Road, Mesra' && bt.map_link === 'https://maps.app.goo.gl/abc123', bt);

  // A new order: nobody sees it until the payment is verified
  const ID = await place([{ dish_id: 'bt1', qty: 2 }, { dish_id: 'ad1', qty: 1 }]);
  r = await rider1('jobs');
  check('an order waiting for payment check is not offered', r.ok && !r.available.some((o) => o.order_id === ID), r.available);
  await cell({ tab: 'Alerts', key: 'key', id: 'rider_telegram_chat_id', col: 'value', value: '-2002' });
  await cell({ tab: 'Alerts', key: 'key', id: 'website_url', col: 'value', value: 'https://hungrr.in/' });
  const before = (await state()).telegram.length;
  await admin('set_status', { order_id: ID, status: 'Paid' });
  let tg = (await state()).telegram.slice(before);
  const msg = tg.find((t) => t.body.chat_id === '-2002');
  check('marking it Paid posts it to the riders’ Telegram group', msg && /New order to deliver · #R001/.test(msg.body.text) && /Pick up: Babai Tiffins \(Babai Tiffins, Main Road, Mesra\)/.test(msg.body.text) && /Pick up: Al Daaz/.test(msg.body.text) && /Drop: Girls Hostel 2/.test(msg.body.text) && /https:\/\/hungrr\.in\/rider/.test(msg.body.text), tg);
  check('the Telegram post has no name, phone or room', msg && !/Muskan|9000000605|Room 114/.test(msg.body.text), msg && msg.body.text);

  // Both riders see it, without the customer's details
  r = await rider2('jobs');
  const offer = r.available.find((o) => o.order_id === ID);
  check('riders see the new order', offer && offer.status === 'Paid' && offer.dishes === 3 && offer.drop === 'Girls Hostel 2', offer);
  check('with each restaurant to pick up from, and its address', offer && offer.pickups.length === 2 && offer.pickups[0].name === 'Babai Tiffins' && offer.pickups[0].address === 'Babai Tiffins, Main Road, Mesra' && offer.pickups[0].map_link === 'https://maps.app.goo.gl/abc123' && offer.pickups[1].address === '', offer && offer.pickups);
  check('but not the customer’s name, phone or full address', offer && !/Muskan|9000000605|Room 114/.test(JSON.stringify(offer)), offer);

  // First to accept gets it
  r = await rider1('accept', { order_id: ID.toLowerCase() });
  check('rider accepts the order', r.ok && (await riderOf(ID)) === '9000000602', r);
  r = await rider2('accept', { order_id: ID });
  check('a second rider is told it was taken', r.error === 'taken', r);
  r = await rider1('accept', { order_id: ID });
  check('accepting twice is fine', r.ok && r.already, r);
  r = await rider2('jobs');
  check('it leaves the other riders’ list', !r.available.some((o) => o.order_id === ID), r.available);
  r = await rider1('jobs');
  let job = r.jobs.find((o) => o.order_id === ID);
  check('the accepting rider now sees the customer and the pickups', job && job.customer_name === 'Muskan Singh' && job.phone === '9000000605' && job.address === 'Girls Hostel 2, Room 114' && job.pickups.length === 2, job);
  r = await admin('board');
  check('the admin board shows who took it', r.orders.find((o) => o.order_id === ID).rider_name === 'Ravi Kumar', 1);

  // Give it back, then the other rider takes it
  r = await rider2('release', { order_id: ID });
  check('a rider cannot give back someone else’s order', r.error === 'not_found', r);
  r = await rider1('release', { order_id: ID });
  check('rider gives the order back before pick-up', r.ok && (await riderOf(ID)) === '', r);
  r = await rider2('accept', { order_id: ID });
  check('another rider accepts it', r.ok && (await riderOf(ID)) === '9000000603', r);

  // The admin can still assign anyone, at any time
  r = await admin('assign_rider', { order_id: ID, rider: '9000000602' });
  r = await rider1('jobs');
  check('admin reassigns it to Ravi', r.jobs.some((o) => o.order_id === ID), r.jobs);
  r = await rider2('jobs');
  check('and it leaves Sunil’s list', !r.jobs.some((o) => o.order_id === ID), r.jobs);

  // Restaurants: preparing, ready; then the rider: picked up, delivered
  r = await rider1('delivered', { order_id: ID });
  check('cannot mark delivered before picking up', r.error === 'wrong_step' && (await statusOf(ID)) === 'Paid', r);
  await kitchen('preparing', { order_id: ID });
  check('restaurant starts preparing', (await statusOf(ID)) === 'Preparing', 1);
  await kitchen('ready', { order_id: ID });
  r = await rider1('jobs');
  job = r.jobs.find((o) => o.order_id === ID);
  check('rider sees which pickup is ready', job.pickups.find((p) => p.name === 'Babai Tiffins').ready && !job.pickups.find((p) => p.name === 'Al Daaz').ready, job.pickups);
  r = await rider1('picked_up', { order_id: ID });
  check('rider picks up', r.ok && (await statusOf(ID)) === 'Out for delivery', r);
  r = await rider1('release', { order_id: ID });
  check('cannot give it back once picked up', r.error === 'wrong_step', r);
  r = await kitchen('preparing', { order_id: ID });
  check('the restaurant cannot move it back', (await statusOf(ID)) === 'Out for delivery', r);
  r = await rider1('picked_up', { order_id: ID });
  check('picking up twice is fine', r.ok && r.already, r);
  r = await rider1('delivered', { order_id: ID });
  check('rider delivers', r.ok && (await statusOf(ID)) === 'Delivered', r);
  r = await rider1('picked_up', { order_id: ID });
  check('a delivered order cannot go back to out for delivery', r.error === 'wrong_step' && (await statusOf(ID)) === 'Delivered', r);
  r = await rider1('jobs');
  check('delivered today counted', r.delivered_today === 1 && !r.jobs.some((o) => o.order_id === ID), r);

  // The admin keeps every status
  await admin('set_status', { order_id: ID, status: 'Out for delivery' });
  check('admin can still set any status', (await statusOf(ID)) === 'Out for delivery', 1);
  await admin('set_status', { order_id: ID, status: 'Delivered' });

  // Cancelled and finished orders are not offered; an order assigned by the admin is not posted to Telegram
  const ID2 = await place([{ dish_id: 'bt1', qty: 1 }], 'Hostel 5');
  await admin('assign_rider', { order_id: ID2, rider: '9000000603' });
  const before2 = (await state()).telegram.length;
  await admin('set_status', { order_id: ID2, status: 'Paid' });
  tg = (await state()).telegram.slice(before2).filter((t) => t.body.chat_id === '-2002');
  check('no riders’ alert when a rider is already assigned', tg.length === 0, tg);
  const ID3 = await place([{ dish_id: 'bt1', qty: 1 }], 'Hostel 5');
  await admin('set_status', { order_id: ID3, status: 'Paid' });
  await admin('set_status', { order_id: ID3, status: 'Cancelled' });
  r = await rider1('accept', { order_id: ID3 });
  check('a cancelled order cannot be accepted', r.error === 'not_open', r);
  r = await rider1('accept', { order_id: 'HG-000000-NONE' });
  check('an unknown order', r.error === 'not_found', r);
  r = await rider1('jobs');
  check('nothing open left to offer', r.available.length === 0, r.available);
  r = await post({ action: 'rider', op: 'accept', token: C.token, order_id: ID3 });
  check('a customer cannot accept orders', r.error === 'not_staff', r);

  const failed = results.filter((x) => x.startsWith('FAIL'));
  results.forEach((x) => console.log(x));
  console.log(failed.length ? `${failed.length} FAILED` : `ALL PASSED (${results.length})`);
  process.exit(failed.length ? 1 : 0);
})();
