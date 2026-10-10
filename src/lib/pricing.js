// Cart totals: item total, GST and delivery (one rider per delivery cluster in the order).
import { allDishes } from './menuData';
import { plural } from './format';

// Number of dishes from one restaurant in the cart.
export function countInCart(restaurant, cart) {
  return allDishes(restaurant).reduce((n, { dish }) => n + (cart[dish.id] || 0), 0);
}

// Every cluster with at least one ordered dish needs its own rider (at least one rider per order).
export function ridersNeeded(restaurants, clusters, cart) {
  const busy = clusters.filter((c) =>
    restaurants.some((r) => r.cl === c.id && countInCart(r, cart) > 0),
  ).length;
  return Math.max(1, busy);
}

// The full order summary used by the notepad, the order photo, the UPI link and the sheet.
//   lines: [{ restaurant, items: [{ dish, qty, lineTotal }] }]
export function summarizeOrder({ restaurants, clusters, cart, settings }) {
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
  const gst = Math.round(itemTotal * gstRate) / 100;
  const delivery = itemCount > 0 ? settings.deliveryCharge * riders : 0;
  const grandTotal = itemTotal + gst + delivery;

  return {
    lines,
    itemCount,
    restaurantCount: lines.length,
    itemTotal,
    gstRate,
    gst,
    riders,
    delivery,
    grandTotal,
    gstLabel: `GST (${gstRate}%)`,
    deliveryLabel: `Delivery charge (${plural(riders, 'rider')})`,
    isEmpty: itemCount === 0,
  };
}
