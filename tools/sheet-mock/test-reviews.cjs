// Run against a fresh mock: PORT=8792 node tools/sheet-mock/mock.cjs, then node tools/sheet-mock/test-reviews.cjs
const B = 'http://127.0.0.1:' + (process.env.PORT || 8792);
const post = (body) => fetch(B + '/exec', { method: 'POST', body: JSON.stringify(body) }).then((r) => r.json());
const get = (q) => fetch(B + '/exec?' + q).then((r) => r.json());
const order = (id, phone, extra = {}) => ({ order_id: id, customer: { name: 'Test', phone, address: 'Hostel' }, items: [{ dish_id: 'bt1', qty: 1 }], ...extra });
(async () => {
  const out = {};
  await post({ action: 'order', order: order('HG-261013-RVW1', '9876543210') });
  out.unpaid = await post({ action: 'review', review: { order_id: 'HG-261013-RVW1', phone: '9876543210', rating: 5 } });
  await post({ action: 'payment', order: order('HG-261013-RVW1', '9876543210', { upi_ref: '111122223333' }) });
  out.wrongPhone = await post({ action: 'review', review: { order_id: 'HG-261013-RVW1', phone: '9876543219', rating: 5 } });
  out.ok = await post({ action: 'review', review: { order_id: 'hg-261013-rvw1', phone: '+91 98765 43210', rating: 5, tags: ['On time', 'Late', 'Hot & fresh'], comment: '=HYPERLINK("x") Hot idlis', improve: 'More dosa places', name: 'Test U.', consent: true } });
  out.before = await get('action=reviews');
  await fetch(B + '/approve?order=HG-261013-RVW1&value=Yes');
  out.after = await get('action=reviews');
  // a second paid order, low rating, no consent
  await post({ action: 'order', order: order('HG-261013-RVW2', '9123456780') });
  await post({ action: 'payment', order: order('HG-261013-RVW2', '9123456780', { upi_ref: '444455556666' }) });
  out.low = await post({ action: 'review', review: { order_id: 'HG-261013-RVW2', phone: '9123456780', rating: 2, tags: ['Late', 'On time'], comment: 'Took 70 minutes', consent: false } });
  out.afterLow = await get('action=reviews');
  // editing the first review sends it back for approval
  out.edit = await post({ action: 'review', review: { order_id: 'HG-261013-RVW1', phone: '9876543210', rating: 4, tags: ['On time'], comment: 'Hot idlis, a bit late', name: 'Test U.', consent: true } });
  out.afterEdit = (await get('action=reviews')).reviews.length;
  // dropping an existing review to 1 star alerts the team once; 1 → 2 does not alert again
  await post({ action: 'review', review: { order_id: 'HG-261013-RVW1', phone: '9876543210', rating: 1, tags: ['Cold food'], comment: 'Cold this time', name: 'Test U.', consent: true } });
  await post({ action: 'review', review: { order_id: 'HG-261013-RVW1', phone: '9876543210', rating: 2, tags: ['Cold food'], comment: 'Cold this time', name: 'Test U.', consent: true } });
  const st = await fetch(B + '/state').then((r) => r.json());
  out.reviewsTab = st.Reviews; out.alerts = { mail: st.mail.map((m) => m.subject), telegram: st.telegram.map((t) => t.body.text) };
  console.log(JSON.stringify(out, null, 1));
})();
