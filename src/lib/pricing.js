// Cart totals: item total, the offer or coupon, GST and delivery (one rider per delivery cluster in the order).
import { allDishes } from './menuData';
import { formatRupees, plural } from './format';
import { bestDeal, dealLabel } from './deals';

// Number of dishes from one restaurant in the cart.
export function countInCart(restaurant, cart) {
  return allDishes(restaurant).reduce((n, { dish }) => n + (cart[dish.id] || 0), 0);
}

// Every cluster with at least one ordered dish needs its own rider (at least one rider per order).
export function ridersNeeded(restaurants, clusters, cart) {
  const busy = clusters.filter((c) =>
    restaurants.some((r) => r.clusterId === c.id && countInCart(r, cart) > 0),
  ).length;
  return Math.max(1, busy);
}

// The full order summary used by the notepad, the order photo, the UPI link and the sheet.
//   lines: [{ restaurant, items: [{ dish, qty, lineTotal }] }]
// `deals` are the offer and coupon rules the customer can use (see deals.js): the one that saves the most is
// applied. A discount on the food comes off before GST; free delivery takes off the delivery charge.
export function summarizeOrder({ restaurants, clusters, cart, settings, deals = [] }) {
  const lines = [];
  let itemCount = 0;
  let itemTotal = 0;
  restaurants.forEach((restaurant) => {
    const items = [];
    allDishes(restaurant).forEach(({ dish }) => {
      const qty = cart[dish.id] || 0;
      if (qty <= 0) return;
      itemCount += qty;
      itemTotal += qty * dish.price;
      items.push({ dish, qty, lineTotal: qty * dish.price });
    });
    if (items.length) lines.push({ restaurant, items });
  });

  const riders = ridersNeeded(restaurants, clusters, cart);
  const gstRate = settings.gstRate;
  const delivery = itemCount > 0 ? settings.deliveryCharge * riders : 0;
  const deal = bestDeal(deals, itemTotal, delivery);
  const taxable = Math.round((itemTotal - deal.onItems) * 100) / 100;
  const gst = Math.round(taxable * gstRate) / 100;
  const grandTotal = Math.round((taxable + gst + delivery - deal.onDelivery) * 100) / 100;

  return {
    lines,
    itemCount,
    restaurantCount: lines.length,
    itemTotal,
    gstRate,
    gst,
    riders,
    delivery,
    deal: deal.rule, // the offer or coupon applied, or null
    discountOnItems: deal.onItems,
    discountOnDelivery: deal.onDelivery,
    discount: Math.round((deal.onItems + deal.onDelivery) * 100) / 100,
    grandTotal,
    gstLabel: `GST (${gstRate}%)`,
    deliveryLabel: `Delivery charge (${plural(riders, 'rider')})`,
    isEmpty: itemCount === 0,
  };
}

// The charge lines of a bill, in order: [{ label, amount, text, discount? }]. A discount shows as "−₹39".
export function chargeLines(summary) {
  const line = (label, amount, discount = false) => ({
    label,
    amount,
    discount,
    text: discount ? `−${formatRupees(amount)}` : formatRupees(amount),
  });
  const label = dealLabel(summary.deal);
  return [
    line('Item total', summary.itemTotal),
    ...(summary.discountOnItems ? [line(label, summary.discountOnItems, true)] : []),
    line(summary.gstLabel, summary.gst),
    line(summary.deliveryLabel, summary.delivery),
    ...(summary.discountOnDelivery ? [line(label, summary.discountOnDelivery, true)] : []),
  ];
}
