// Offers and coupons at checkout. A rule (from the sheet, see dealsFor_ in google-sheet/Code.gs):
//   { kind: 'offer' | 'coupon', label, name, code?, type, value, max_discount, min_order }
// where type is 'amount' (₹ off the food), 'percent' (% off the food, up to max_discount) or 'free_delivery'.
// One offer per order: the one that saves the most. The sheet does the same sums when it saves the order.
import { formatRupees } from './format';

export const DEAL_TYPES = ['amount', 'percent', 'free_delivery'];

const round2 = (n) => Math.round(n * 100) / 100;

// What a rule takes off this order: { onItems, onDelivery } (₹). Nothing below its minimum order.
export function dealAmount(rule, itemTotal, delivery) {
  const none = { onItems: 0, onDelivery: 0 };
  if (!rule || itemTotal <= 0 || itemTotal < (Number(rule.min_order) || 0)) return none;
  const value = Number(rule.value) || 0;
  if (rule.type === 'free_delivery') return { onItems: 0, onDelivery: delivery };
  if (rule.type === 'amount') return { onItems: Math.min(value, itemTotal), onDelivery: 0 };
  if (rule.type === 'percent') {
    let off = Math.round(itemTotal * Math.min(value, 100)) / 100;
    const cap = Number(rule.max_discount) || 0;
    if (cap > 0) off = Math.min(off, cap);
    return { onItems: round2(off), onDelivery: 0 };
  }
  return none;
}

// The rule that saves the most: { rule, onItems, onDelivery } (rule is null when none applies).
export function bestDeal(rules, itemTotal, delivery) {
  let best = { rule: null, onItems: 0, onDelivery: 0 };
  (rules || []).forEach((rule) => {
    const d = dealAmount(rule, itemTotal, delivery);
    if (d.onItems + d.onDelivery > best.onItems + best.onDelivery) best = { rule, ...d };
  });
  return best;
}

// "₹50 off", "20% off, up to ₹60", "Free delivery"
export function describeDeal(rule) {
  if (!rule) return '';
  const value = Number(rule.value) || 0;
  if (rule.type === 'free_delivery') return 'Free delivery';
  if (rule.type === 'amount') return `${formatRupees(value)} off`;
  const cap = Number(rule.max_discount) || 0;
  return cap > 0 ? `${value}% off, up to ${formatRupees(cap)}` : `${value}% off`;
}

// The line on the bill: "Coupon WELCOME20" or the offer's name
export function dealLabel(rule) {
  if (!rule) return '';
  return rule.kind === 'coupon' ? `Coupon ${rule.code || rule.label}` : rule.name || rule.label;
}

// How much more food the order needs before the rule applies (0 when it already does).
export function minOrderGap(rule, itemTotal) {
  const min = Number(rule?.min_order) || 0;
  return min > itemTotal ? round2(min - itemTotal) : 0;
}

export const COUPON_PROBLEMS = {
  not_found: "We don't know this code. Check it and try again.",
  inactive: 'This code is no longer active.',
  not_started: "This code isn't active yet.",
  expired: 'This code has expired.',
  used_up: 'This code has been used as many times as it can be.',
  used_by_you: "You've already used this code.",
  signed_out: 'Sign in again to use a code.',
  unavailable: "Couldn't check the code just now. Try again.",
};

// "2 more orders to free delivery" / "Your next order gets free delivery"
export function progressText(progress) {
  if (!progress) return '';
  const reward = describeDeal(progress).toLowerCase();
  if (progress.next_gets_it) return `Your next order gets ${reward}.`;
  const left = progress.every_n - progress.done - 1;
  return `${left} more ${left === 1 ? 'order' : 'orders'}, then the next one gets ${reward}.`;
}

// The coupons listed at checkout, for this order: each with what it saves (₹) and how much more food it needs.
// Those that work now come first, the biggest saving first; then those that need more food, the nearest first.
export function couponChoices(coupons, itemTotal, delivery) {
  return (coupons || [])
    .map((rule) => {
      const d = dealAmount(rule, itemTotal, delivery);
      return { rule, saves: round2(d.onItems + d.onDelivery), gap: minOrderGap(rule, itemTotal) };
    })
    .sort((a, b) => (a.gap > 0) - (b.gap > 0) || b.saves - a.saves || a.gap - b.gap);
}
