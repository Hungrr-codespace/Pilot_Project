// Accounts (the customer's khata): checking the PIN and name a customer types, names for display, and the
// sign-in kept on this device. Pure functions apart from the storage helpers; tested in account.test.js.
// The rules match google-sheet/Code.gs (pinOk_, tidyName_), which checks everything again.

export const PIN_LENGTH = 6;
export const NAME_LIMIT = 40;

// Only digits, at most six: what the PIN box keeps of what is typed or pasted.
export function cleanPin(input) {
  return String(input ?? '')
    .replace(/\D/g, '')
    .slice(0, PIN_LENGTH);
}

// Why a new PIN can't be used, or '' when it's fine.
export function pinProblem(pin) {
  if (!/^\d{6}$/.test(pin)) return `Enter all ${PIN_LENGTH} digits.`;
  if (/^(\d)\1{5}$/.test(pin)) return 'Use different digits, not the same one six times.';
  if ('0123456789012345'.includes(pin) || '9876543210987654'.includes(pin)) {
    return 'Pick a PIN that is harder to guess than a run like 123456.';
  }
  return '';
}

export function tidyName(input) {
  return String(input ?? '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, NAME_LIMIT);
}

// The new-account form → { values, errors }, like validateDetails in checkout.js.
export function validateNewAccount({ name, pin, confirm }, { needsName = true } = {}) {
  const values = { name: tidyName(name), pin: cleanPin(pin) };
  const errors = {};
  if (needsName && values.name.length < 2) errors.name = 'Enter your name, as you would like us to call you.';
  const problem = pinProblem(values.pin);
  if (problem) errors.pin = problem;
  else if (cleanPin(confirm) !== values.pin) errors.confirm = 'The two PINs are different. Type it again.';
  return { values, errors };
}

// "Aditya Raj Singh" → "Aditya"
export function firstName(name) {
  return tidyName(name).split(' ')[0] || '';
}

// "Aditya Raj Singh" → "AS", "aditya" → "A"
export function initials(name) {
  const words = tidyName(name).split(' ').filter(Boolean);
  if (!words.length) return '';
  const first = words[0][0];
  const last = words.length > 1 ? words[words.length - 1][0] : '';
  return (first + last).toUpperCase();
}

// "2026-10-13T…" → "Oct 2026"
export function memberSince(iso) {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return '';
  return date.toLocaleDateString('en-IN', { month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

// Totals for the khata: orders, those counted (not cancelled), money paid for them, and reviews given.
export function khataTotals(orders) {
  const list = Array.isArray(orders) ? orders : [];
  const counted = list.filter((o) => String(o.status).toLowerCase() !== 'cancelled');
  return {
    orders: list.length,
    counted: counted.length,
    paid: Math.round(counted.reduce((sum, o) => sum + (Number(o.grand_total) || 0), 0) * 100) / 100,
    rated: list.filter((o) => o.review).length,
  };
}

// Whether an order in the khata can be rated: once it is delivered or cancelled, or (for any paid order) a few
// hours after it was placed, because the status in the sheet isn't always moved on to Delivered.
export const RATE_AFTER_HOURS = 3;

export function canRate(order, now = Date.now()) {
  const status = String(order?.status ?? '')
    .trim()
    .toLowerCase();
  if (!status || status === 'awaiting payment') return false;
  if (status === 'delivered' || status === 'cancelled') return true;
  const placed = new Date(order.created_at).getTime();
  return Number.isFinite(placed) && now - placed >= RATE_AFTER_HOURS * 60 * 60 * 1000;
}

// The sign-in on this device: { token, user: { phone, name, since } }.
const SESSION_KEY = 'hungrr-account-v1';

export function loadSession() {
  try {
    const saved = JSON.parse(localStorage.getItem(SESSION_KEY) || 'null');
    return saved?.token && saved.user?.phone ? saved : null;
  } catch {
    return null; // storage blocked (private mode) or not a browser
  }
}

export function saveSession(session) {
  try {
    if (session) localStorage.setItem(SESSION_KEY, JSON.stringify(session));
    else localStorage.removeItem(SESSION_KEY);
  } catch {
    /* storage can be blocked: the sign-in then lasts until the page is closed */
  }
}
