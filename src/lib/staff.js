// Helpers for the staff pages (admin, rider, restaurant): the order board's columns, the next step for an
// order, the WhatsApp update for a customer, and new coupon codes. Pure functions; tested in staff.test.js.
import { formatRupees } from './format';

// The admin board's columns, one per status (Delivered also holds today's cancelled orders)
export const BOARD_COLUMNS = [
  { status: 'Payment to verify', title: 'To verify', hint: 'Match the UPI ref in your UPI app' },
  { status: 'Paid', title: 'Paid', hint: 'Waiting for the restaurants' },
  { status: 'Preparing', title: 'Preparing', hint: 'Assign a rider' },
  { status: 'Out for delivery', title: 'On the way', hint: 'With the rider' },
  { status: 'Delivered', title: 'Done today', hint: 'Delivered or cancelled' },
];

export function boardColumn(status) {
  return status === 'Cancelled' ? 'Delivered' : status;
}

// The one-tap next step on a ticket
export const NEXT_STEP = {
  'Payment to verify': { status: 'Paid', label: 'Payment received' },
  Paid: { status: 'Preparing', label: 'Start preparing' },
  Preparing: { status: 'Out for delivery', label: 'Out for delivery' },
  'Out for delivery': { status: 'Delivered', label: 'Delivered' },
};

// The message for "Update on WhatsApp", by status
export function customerUpdate(order, origin = '') {
  const first = String(order.customer_name || '').split(' ')[0] || 'there';
  const id = order.order_id;
  const track = origin ? ` Track it: ${origin}/track?order=${id}` : '';
  switch (order.status) {
    case 'Payment to verify':
      return `Hi ${first}, we've got your Hungrr order ${id} and are checking your payment now.`;
    case 'Paid':
      return `Hi ${first}, your payment for Hungrr order ${id} is confirmed. The restaurants are on it.${track}`;
    case 'Preparing':
      return `Hi ${first}, your Hungrr order ${id} is being prepared.${track}`;
    case 'Out for delivery':
      return `Hi ${first}, your Hungrr order ${id} is on the way${order.rider_name ? ` with ${order.rider_name}` : ''}.${track}`;
    case 'Delivered':
      return `Hi ${first}, your Hungrr order ${id} has been delivered. Enjoy your meal!${origin ? ` Tell us how it was: ${origin}/feedback?order=${id}` : ''}`;
    case 'Cancelled':
      return `Hi ${first}, your Hungrr order ${id} (${formatRupees(order.grand_total)}) was cancelled. We'll message you about your refund.`;
    default:
      return `Hi ${first}, about your Hungrr order ${id}:`;
  }
}

// A new coupon code: HG + 6 letters or digits, without 0/O or 1/I so it reads out clearly. The sheet checks it
// is unused when the coupon is saved.
const CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function newCouponCode(random = Math.random) {
  let code = 'HG';
  for (let i = 0; i < 6; i++) code += CODE_CHARS[Math.floor(random() * CODE_CHARS.length)];
  return code;
}

export function cleanCode(input) {
  return String(input ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '')
    .slice(0, 16);
}

// "4123 5678 9012"
export const groupDigits = (s) => String(s || '').replace(/(\d{4})(?=\d)/g, '$1 ');

// 1 → "1st", 2 → "2nd", 3 → "3rd", 11 → "11th", 22 → "22nd"
export function ordinal(n) {
  const v = n % 100;
  if (v >= 11 && v <= 13) return `${n}th`;
  return `${n}${{ 1: 'st', 2: 'nd', 3: 'rd' }[n % 10] || 'th'}`;
}

// A coupon's dates: "16 Oct only", "until 21 Oct", "from 16 Oct", "16 Oct to 21 Oct" ('' for no dates)
export function dateRange(startsOn, endsOn) {
  const fmt = (d) =>
    new Date(`${d}T00:00:00+05:30`).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      timeZone: 'Asia/Kolkata',
    });
  if (startsOn && endsOn)
    return startsOn === endsOn ? `${fmt(startsOn)} only` : `${fmt(startsOn)} to ${fmt(endsOn)}`;
  if (endsOn) return `until ${fmt(endsOn)}`;
  if (startsOn) return `from ${fmt(startsOn)}`;
  return '';
}

// The admin "Menu & notice" tab, laid out like the menu book: the sheet's restaurants grouped by cluster (in the
// sheet's sort order), each with its dishes by category, how many are sold out, and only the dishes matching
// `query` (a restaurant whose name matches keeps all its dishes).
export function menuBook({ clusters = [], restaurants = [], dishes = [] } = {}, query = '') {
  const q = query.trim().toLowerCase();
  const bySort = (a, b) => (a.sort ?? 9999) - (b.sort ?? 9999);
  const sortedDishes = [...dishes].sort(bySort);
  const shaped = [...restaurants].sort(bySort).map((r) => {
    const own = sortedDishes.filter((d) => d.restaurant_id === r.id);
    const nameMatch = q !== '' && r.name.toLowerCase().includes(q);
    const shown =
      !q || nameMatch ? own : own.filter((d) => `${d.name} ${d.category}`.toLowerCase().includes(q));
    const categories = [];
    shown.forEach((d) => {
      const name = d.category || 'Menu';
      let category = categories.find((c) => c.name === name);
      if (!category) categories.push((category = { name, dishes: [] }));
      category.dishes.push(d);
    });
    return {
      ...r,
      categories,
      dishCount: own.length,
      soldOut: own.filter((d) => !d.available).length,
      isMatch: !q || nameMatch || shown.length > 0,
    };
  });
  const listed = shaped.filter((r) => r.isMatch);
  const groups = [...clusters]
    .sort(bySort)
    .map((cluster) => ({ cluster, restaurants: listed.filter((r) => r.cluster_id === cluster.id) }));
  const loose = listed.filter((r) => !clusters.some((c) => c.id === r.cluster_id));
  if (loose.length) groups.push({ cluster: { id: '', label: 'Other', area: '' }, restaurants: loose });
  return { groups: groups.filter((g) => g.restaurants.length), restaurants: listed };
}

// Why a coupon isn't active now (the sheet's `state`), for its stub on the admin page
export function couponState(coupon) {
  if (coupon.state === 'scheduled')
    return coupon.starts_on ? dateRange(coupon.starts_on, '').replace('from', 'Starts') : 'Not started';
  return { off: 'Switched off', expired: 'Expired', used_up: 'Used up' }[coupon.state] || '';
}
