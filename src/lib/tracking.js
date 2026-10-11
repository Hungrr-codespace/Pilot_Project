// Order tracking: reading the order ID a customer types, the steps an order goes through (the Status column in
// the sheet's Orders tab), and the list of recent orders kept on this phone.

const ID_PATTERN = /^HG-\d{6}-[A-Z0-9]{4}$/;

// " hg 261011 k7q2 " → "HG-261011-K7Q2". Returns '' when it cannot be an order ID.
export function normalizeOrderId(input) {
  const compact = String(input ?? '')
    .toUpperCase()
    .replace(/[^A-Z0-9]/g, '');
  const match = compact.match(/^(?:HG)?(\d{6})([A-Z0-9]{4})$/);
  if (!match) return '';
  const id = `HG-${match[1]}-${match[2]}`;
  return ID_PATTERN.test(id) ? id : '';
}

// The steps shown on the tracking page, one per status the team sets in the sheet.
export const TRACK_STEPS = [
  { status: 'Awaiting payment', title: 'Order placed', text: 'Waiting for your UPI payment.' },
  {
    status: 'Payment to verify',
    title: 'Checking your payment',
    text: 'We are matching your UPI reference number.',
  },
  { status: 'Paid', title: 'Payment confirmed', text: 'Your order is on its way to the restaurants.' },
  { status: 'Preparing', title: 'Being prepared', text: 'The restaurants are cooking your food.' },
  { status: 'Out for delivery', title: 'On the way', text: 'Your rider is bringing it to you.' },
  { status: 'Delivered', title: 'Delivered', text: 'Enjoy your meal!' },
];

// Which step an order is at (0–5), or -1 when it was cancelled. Unknown statuses count as the first step.
export function trackStepIndex(status) {
  const s = String(status ?? '')
    .trim()
    .toLowerCase();
  if (s === 'cancelled' || s === 'canceled') return -1;
  const index = TRACK_STEPS.findIndex((step) => step.status.toLowerCase() === s);
  return index < 0 ? 0 : index;
}

export const isFinished = (status) => {
  const index = trackStepIndex(status);
  return index === -1 || index === TRACK_STEPS.length - 1;
};

// Recent orders on this phone (newest first, at most 8), so the tracking page can list them without typing.
const RECENT_KEY = 'hungrr-orders-v1';
const MAX_RECENT = 8;

export function addRecentOrder(list, order) {
  const rest = (Array.isArray(list) ? list : []).filter((o) => o && o.id !== order.id);
  return [order, ...rest].slice(0, MAX_RECENT);
}

export function loadRecentOrders() {
  try {
    const saved = JSON.parse(localStorage.getItem(RECENT_KEY) || '[]');
    return Array.isArray(saved) ? saved.filter((o) => o && ID_PATTERN.test(o.id)) : [];
  } catch {
    return []; // storage blocked (private mode) or not a browser
  }
}

export function saveRecentOrder(order) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(addRecentOrder(loadRecentOrders(), order)));
  } catch {
    /* storage can be blocked */
  }
}
