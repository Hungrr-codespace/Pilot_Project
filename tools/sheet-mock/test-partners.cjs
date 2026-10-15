// Run against a fresh mock: PORT=8792 node tools/sheet-mock/mock.cjs, then node tools/sheet-mock/test-partners.cjs
// Restaurants and riders applying on the website, signing in only once approved, and the admin's decisions.
const B = 'http://127.0.0.1:' + (process.env.PORT || 8792);
const post = (body) => fetch(B + '/exec', { method: 'POST', body: JSON.stringify(body) }).then((r) => r.json());
const tab = (t) => fetch(B + '/tab?tab=' + t).then((r) => r.json());
const append = (t, row) => fetch(B + '/append', { method: 'POST', body: JSON.stringify({ tab: t, row }) });
const results = [];
const check = (name, ok, detail) =>
  results.push((ok ? 'PASS ' : 'FAIL ') + name + (ok ? '' : '  → ' + JSON.stringify(detail).slice(0, 400)));
// A birth date `years` ago (Indian date), minus a day so the birthday has passed
const born = (years) => {
  const d = new Date(Date.now() + 330 * 60000);
  d.setUTCFullYear(d.getUTCFullYear() - years);
  d.setUTCDate(d.getUTCDate() - 1);
  return d.toISOString().slice(0, 10);
};
const rowOf = async (t, key, value) => {
  const rows = await tab(t);
  const h = rows[0];
  const r = rows.find((x) => String(x[h.indexOf(key)]).replace(/^'/, '') === value);
  return r ? Object.fromEntries(h.map((k, i) => [k, r[i]])) : null;
};
const PIN = '482915';
const rider = { dob: born(20), vehicle_no: 'br 01 ab 1234', dl_no: 'BR01 20190012345' };
const GSTIN = '27AAPFU0939F1ZV'; // a valid GSTIN (check character included)

(async () => {
  await fetch(B + '/setup');
  const A = await post({ action: 'sign_up', phone: '9000000500', name: 'Admin', pin: PIN });
  await append('Staff', { phone: '9000000500', name: 'Admin', role: 'admin', active: true });
  const admin = (op, extra = {}) => post({ action: 'admin', op, token: A.token, ...extra });
  const apply = (phone, role, details, extra = {}) =>
    post({ action: 'partner_apply', phone, pin: PIN, name: 'Ravi Kumar', role, details, ...extra });

  // A new rider applies
  let r = await apply('9000000501', 'rider', rider);
  check('new rider applies', r.ok && r.status === 'pending', r);
  let row = await rowOf('Partners', 'phone', '9000000501');
  check('application in Partners, numbers tidied', row && row.status === 'pending' && /BR01AB1234/.test(row.vehicle_no) && /BR0120190012345/.test(row.dl_no), row);
  check('an account was made with the PIN', Boolean(await rowOf('Users', 'phone', '9000000501')), 1);
  r = await post({ action: 'sign_in', phone: '9000000501', pin: PIN, as: 'rider' });
  check('rider cannot sign in as rider before approval', r.error === 'not_approved' && r.application.status === 'pending' && !r.token, r);
  r = await post({ action: 'sign_in', phone: '9000000501', pin: '111222', as: 'rider' });
  check('a wrong PIN is still a wrong PIN', r.error === 'wrong_pin', r);
  r = await post({ action: 'sign_in', phone: '9000000501', pin: PIN });
  check('they can still sign in as a customer', r.ok && r.token && !r.roles.length, r);
  check('signing in says where their application stands', r.applications.length === 1 && r.applications[0].role === 'rider' && r.applications[0].status === 'pending', r.applications);

  // The checks
  r = await apply('9000000502', 'rider', { ...rider, dob: born(17) });
  check('under 18 refused', r.error === 'too_young', r);
  r = await apply('9000000502', 'rider', { ...rider, dob: '2005-02-30' });
  check('a date that does not exist refused', r.error === 'bad_dob', r);
  r = await apply('9000000502', 'rider', { ...rider, vehicle_no: 'ABC' });
  check('bad vehicle number refused', r.error === 'bad_vehicle', r);
  r = await apply('9000000502', 'rider', { ...rider, vehicle_no: '22 BH 1234 AA' });
  check('Bharat-series vehicle number accepted', r.ok, r);
  r = await apply('9000000509', 'rider', { ...rider, dl_no: 'BR01 20990012345' });
  check('licence issued in the future refused', r.error === 'bad_dl', r);
  r = await apply('9000000503', 'restaurant', { restaurant_name: 'Momo Point', restaurant_address: 'Main Road, Mesra', gstin: '27AAPFU0939F1ZW', fssai: '10425001000123' });
  check('GSTIN with a wrong check character refused', r.error === 'bad_gstin', r);
  r = await apply('9000000503', 'restaurant', { restaurant_name: 'Momo Point', restaurant_address: 'Main Road, Mesra', gstin: GSTIN, fssai: '1042500100012' });
  check('FSSAI must be 14 digits', r.error === 'bad_fssai', r);
  r = await apply('9000000503', 'restaurant', { restaurant_name: 'Momo Point', restaurant_address: 'Mes', no_gst: true, fssai: '10425001000123' });
  check('a restaurant needs its address for riders', r.error === 'bad_address', r);
  r = await apply('9000000503', 'restaurant', { restaurant_name: 'Momo Point', restaurant_address: 'Shop 4, Main Road, Mesra', no_gst: true, fssai: '10425001000123' });
  check('restaurant without GST (ticked) applies', r.ok, r);
  r = await apply('9000000504', 'restaurant', { restaurant_name: 'Babai Tiffins', restaurant_address: 'Main Road, Mesra', gstin: GSTIN.toLowerCase(), fssai: '1042 5001 0001 24' });
  check('restaurant with GSTIN applies (any case, spaces in FSSAI)', r.ok, r);

  // An existing customer applies with their account
  await post({ action: 'sign_up', phone: '9000000505', name: 'Priya Sharma', pin: '602913' });
  r = await post({ action: 'partner_apply', phone: '9000000505', pin: PIN, role: 'restaurant', details: { restaurant_name: 'Chai Adda', restaurant_address: 'Main Road, Mesra', no_gst: true, fssai: '20425001000999' } });
  check('existing account: wrong PIN refused', r.error === 'wrong_pin', r);
  r = await post({ action: 'partner_apply', phone: '9000000505', pin: '602913', name: 'Someone Else', role: 'restaurant', details: { restaurant_name: 'Chai Adda', restaurant_address: 'Main Road, Mesra', no_gst: true, fssai: '20425001000999' } });
  row = await rowOf('Partners', 'phone', '9000000505');
  check('existing account applies under its own name', r.ok && row.name === 'Priya Sharma', { r, row });

  // The admin's list
  r = await post({ action: 'admin', op: 'applications', token: (await post({ action: 'sign_in', phone: '9000000505', pin: '602913' })).token });
  check('only the admin sees applications', r.error === 'not_staff', r);
  r = await admin('applications');
  const byPhone = Object.fromEntries((r.applications || []).map((x) => [x.phone + x.role, x]));
  check('admin lists 5 pending applications', r.ok && r.applications.filter((x) => x.status === 'pending').length === 5, r.applications);
  check('checks: GSTIN ok, no GST shown as such, rider age', byPhone['9000000504restaurant'].checks.gstin === true && byPhone['9000000503restaurant'].checks.gstin === null && byPhone['9000000501rider'].checks.age === 20 && byPhone['9000000501rider'].checks.dl === true, byPhone);
  check('restaurants and clusters for approving', r.restaurants.length >= 4 && r.clusters.length >= 1, { rest: r.restaurants, cl: r.clusters });

  // Approve the rider
  r = await admin('application_decide', { phone: '9000000501', role: 'rider', decision: 'approve' });
  check('rider approved', r.ok && r.status === 'approved', r);
  row = await rowOf('Staff', 'phone', '9000000501');
  check('rider added to Staff', row && row.role === 'rider' && String(row.active) === 'true', row);
  r = await post({ action: 'sign_in', phone: '9000000501', pin: PIN, as: 'rider' });
  check('approved rider signs in as rider', r.ok && r.token && r.roles.some((x) => x.role === 'rider'), r);
  check('an approved application is no longer listed as open', r.applications.length === 0, r.applications);
  const riderToken = r.token;
  r = await post({ action: 'rider', op: 'jobs', token: riderToken });
  check('rider page opens', r.ok, r);
  r = await apply('9000000501', 'rider', rider);
  check('applying again once approved', r.error === 'already_approved', r);

  // Approve restaurants: a new one (closed until its menu is added), and one linked to an existing restaurant
  r = await admin('application_decide', { phone: '9000000503', role: 'restaurant', decision: 'approve', cluster_id: 'c1' });
  check('new restaurant approved', r.ok && r.restaurant_id === 'mp', r);
  row = await rowOf('Restaurants', 'restaurant_id', 'mp');
  check('restaurant row added, closed, in cluster, with its address', row && row.name === 'Momo Point' && String(row.active) === 'false' && row.cluster_id === 'c1' && row.initials === 'MP' && row.address === 'Shop 4, Main Road, Mesra', row);
  row = await rowOf('Staff', 'phone', '9000000503');
  check('restaurant staff row has the new restaurant', row && row.role === 'restaurant' && row.restaurant_id === 'mp', row);
  r = await post({ action: 'sign_in', phone: '9000000503', pin: PIN, as: 'restaurant' });
  check('approved restaurant signs in as restaurant', r.ok && r.roles[0].restaurant === 'Momo Point', r);
  r = await post({ action: 'partner', op: 'queue', token: r.token });
  check('kitchen page opens', r.ok, r);
  r = await admin('application_decide', { phone: '9000000504', role: 'restaurant', decision: 'approve', restaurant_id: 'bt' });
  check('approved and linked to an existing restaurant', r.ok && r.restaurant_id === 'bt', r);
  r = await admin('application_decide', { phone: '9000000502', role: 'rider', decision: 'approve', restaurant_id: 'nope' });
  check('a rider approval ignores restaurants', r.ok, r);
  r = await admin('application_decide', { phone: '9000000505', role: 'restaurant', decision: 'approve', restaurant_id: 'nope' });
  check('linking to an unknown restaurant refused', r.error === 'bad_restaurant', r);

  // Decline, then apply again
  r = await admin('application_decide', { phone: '9000000505', role: 'restaurant', decision: 'decline', note: 'FSSAI number not found on FoSCoS' });
  check('declined', r.ok && r.status === 'declined', r);
  r = await post({ action: 'sign_in', phone: '9000000505', pin: '602913', as: 'restaurant' });
  check('declined applicant sees the note and their details', r.error === 'not_approved' && r.application.status === 'declined' && /FoSCoS/.test(r.application.note) && r.application.details.restaurant_name === 'Chai Adda', r);
  r = await post({ action: 'partner_apply', phone: '9000000505', pin: '602913', role: 'restaurant', details: { restaurant_name: 'Chai Adda', restaurant_address: 'Main Road, Mesra', no_gst: true, fssai: '20425001000998' } });
  row = await rowOf('Partners', 'phone', '9000000505');
  check('applying again: one row, pending, note cleared', r.ok && row.status === 'pending' && !row.note && /20425001000998/.test(row.fssai), row);

  // Remove access
  r = await admin('application_decide', { phone: '9000000501', role: 'rider', decision: 'remove' });
  check('access removed', r.ok && r.status === 'removed', r);
  r = await post({ action: 'rider', op: 'jobs', token: riderToken });
  check('rider page closed for them', r.error === 'not_staff', r);
  r = await post({ action: 'sign_in', phone: '9000000501', pin: PIN, as: 'rider' });
  check('removed rider cannot sign in as rider', r.error === 'not_approved' && r.application.status === 'removed', r);
  r = await post({ action: 'sign_in', phone: '9000000501', pin: PIN });
  check('signing in as a customer shows the removed access', r.ok && !r.roles.length && r.applications[0].status === 'removed', r.applications);
  r = await post({ action: 'sign_in', phone: '9000000500', pin: PIN });
  check('the admin signs in with their role and no applications', r.ok && r.roles[0].role === 'admin' && r.applications.length === 0, r);

  // Alerts for the team
  const state = await fetch(B + '/state').then((x) => x.json());
  const mails = state.mail.filter((m) => /application/.test(m.subject));
  check('team alerted for each application', mails.length >= 5 && mails.some((m) => /Momo Point/.test(m.subject)), state.mail.map((m) => m.subject));
  const tg = state.telegram.filter((t) => /application/.test(JSON.stringify(t)));
  check('Telegram alert has no phone number', tg.length && !tg.some((t) => /9000000/.test(JSON.stringify(t))), tg);

  const failed = results.filter((x) => x.startsWith('FAIL'));
  results.forEach((x) => console.log(x));
  console.log(failed.length ? `${failed.length} FAILED` : `ALL PASSED (${results.length})`);
  process.exit(failed.length ? 1 : 0);
})();
