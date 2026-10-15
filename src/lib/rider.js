// Helpers for the rider page: map links for pickups and drops, how far along an open order is, which orders are
// new since the last check, and the words of a new-order alert. Pure functions; tested in rider.test.js.
import { plural } from './format';

const MAPS_SEARCH = 'https://www.google.com/maps/search/?api=1&query=';

// A Google Maps link for a place: the map link saved for it (if it is a web address), else a search for its
// address, with `near` added so a short address ("Girls Hostel 2") finds the right town. '' when there's nothing.
export function mapsLink({ address = '', map_link: mapLink = '' } = {}, near = '') {
  if (/^https?:\/\//i.test(String(mapLink).trim())) return String(mapLink).trim();
  const place = String(address).replace(/\s+/g, ' ').trim();
  if (!place) return '';
  const query = near && !place.toLowerCase().includes(near.toLowerCase()) ? `${place}, ${near}` : place;
  return MAPS_SEARCH + encodeURIComponent(query);
}

// "HG-261014-K7Q2" → "K7Q2": how riders and the Telegram group say an order
export const shortOrderId = (id) => String(id || '').slice(-4);

// Where an order stands, for a rider deciding whether to take it
export function pickupStage(order) {
  const stops = order?.pickups || [];
  if (stops.length && stops.every((p) => p.ready)) return { text: 'Ready for pickup', tone: 'ready' };
  if (order?.status === 'Preparing') {
    const ready = stops.filter((p) => p.ready).length;
    return { text: ready ? `${ready} of ${stops.length} ready` : 'Being prepared', tone: 'cooking' };
  }
  return { text: 'Kitchen yet to start', tone: 'waiting' };
}

// The orders in `list` that weren't in the last check (`seen`: a Set of order ids, or null on the first check,
// when nothing counts as new).
export function arrivals(seen, list) {
  if (!seen) return [];
  return (list || []).filter((o) => !seen.has(o.order_id));
}

// The words of a phone notification for new open orders, or orders the team assigned to this rider
export function alertText(fresh, assigned = []) {
  if (assigned.length) {
    const o = assigned[0];
    return {
      title:
        assigned.length === 1
          ? `Order #${shortOrderId(o.order_id)} assigned to you`
          : `${plural(assigned.length, 'order')} assigned to you`,
      body: assigned.length === 1 ? stopsLine(o) : 'Open your orders to see where to pick up.',
      tag: 'hungrr-assigned',
    };
  }
  const o = fresh[0];
  return {
    title: fresh.length === 1 ? 'New order to deliver' : `${fresh.length} new orders to deliver`,
    body:
      fresh.length === 1
        ? stopsLine(o)
        : fresh.map((x) => `#${shortOrderId(x.order_id)}: ${x.drop || 'drop'}`).join(' · '),
    tag: 'hungrr-new-order',
  };
}

function stopsLine(o) {
  const from = (o.pickups || []).map((p) => p.name).join(', ');
  const to =
    o.drop ||
    String(o.address || '')
      .split(/[,\n]/)[0]
      .trim();
  return [from && `Pick up: ${from}`, to && `Drop: ${to}`].filter(Boolean).join(' · ');
}

// The rider's own errors from the sheet → what to tell them
export const RIDER_PROBLEMS = {
  taken: 'Another rider took this order just now.',
  not_open: 'This order is no longer open (it may have been cancelled).',
  not_found: 'This order is no longer yours: the team may have given it to another rider.',
  wrong_step: 'This order has already moved on. Showing it as it is now.',
};
