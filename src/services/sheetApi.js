// The Google Sheet backend, reached through the Apps Script web app (google-sheet/Code.gs).
//   GET  ?action=menu              → the menu tabs (Settings, Clusters, Restaurants, Dishes, QuickPicks)
//   GET  ?action=status            → opening hours and the pause switch, for a quick check while a page is open
//   POST {action:'order', order}   → the order in Orders ("Awaiting payment") and its dishes in OrderItems
//   POST {action:'payment', order} → the same order with its UPI reference number ("Payment to verify")
//   POST {action:'track', order_id, phone} → the order's status, if the phone number matches the order
//   POST {action:'review', review}  → a customer's rating and feedback (one per paid order)
//   GET  ?action=reviews           → the ratings summary and the approved reviews
// The account calls (sign up, sign in, the khata) are in accountApi.js and go through callSheet below.
// Without VITE_SHEET_API_URL the site runs on the built-in menu (src/data/menu-fallback.json) and logs no orders.
import fallbackRows from '@/data/menu-fallback.json';
import { normalizeMenu, readOrderHours } from '@/lib/menuData';

export const SHEET_API_URL = (import.meta.env.VITE_SHEET_API_URL || '').trim();
const CACHE_KEY = 'hungrr-menu-v1';

function readCachedRows() {
  try {
    const saved = localStorage.getItem(CACHE_KEY);
    return saved ? JSON.parse(saved) : null;
  } catch {
    return null; // storage can be blocked (private mode)
  }
}

function writeCachedRows(rows) {
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(rows));
  } catch {
    /* storage can be blocked */
  }
}

// The menu to show straight away: the last menu loaded from the sheet on this device, else the built-in copy.
export function getInitialMenu() {
  const cached = readCachedRows();
  const fromCache = cached ? normalizeMenu(cached) : null;
  return fromCache?.restaurants.length ? fromCache : normalizeMenu(fallbackRows);
}

// The latest menu from the sheet, or null when no sheet is set up or it cannot be reached in time.
export async function fetchMenu({ timeoutMs = 9000 } = {}) {
  if (!SHEET_API_URL) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = SHEET_API_URL + (SHEET_API_URL.includes('?') ? '&' : '?') + 'action=menu';
    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) return null;
    const rows = await res.json();
    const menu = normalizeMenu(rows);
    if (!menu.restaurants.length) return null;
    writeCachedRows(rows);
    return menu;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function getJson(params, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const url = SHEET_API_URL + (SHEET_API_URL.includes('?') ? '&' : '?') + new URLSearchParams(params);
    const res = await fetch(url, { signal: controller.signal, cache: 'no-store' });
    return res.ok ? await res.json() : null;
  } finally {
    clearTimeout(timer);
  }
}

// Opening hours and the pause switch as they are in the sheet right now ({ opensAt, closesAt, ordersPaused,
// pauseMessage }), or null without a sheet or when it cannot be reached.
export async function fetchShopStatus({ timeoutMs = 6000 } = {}) {
  if (!SHEET_API_URL) return null;
  try {
    const data = await getJson({ action: 'status' }, timeoutMs);
    return data?.ok ? readOrderHours(data) : null;
  } catch {
    return null;
  }
}

// Looks up an order for the tracking page. The sheet answers only when the phone number matches the order,
// and never sends back the customer's name, phone or address.
//   → { ok: true, order: { order_id, status, created_at, paid_at, status_at, restaurants, items, … } }
//   → { ok: false, error: 'not_found' | 'unavailable' }
export async function trackOrder({ orderId, phone, timeoutMs = 9000 }) {
  if (!SHEET_API_URL) return { ok: false, error: 'unavailable' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    // POST keeps the phone number out of the address. text/plain keeps it a simple request Apps Script accepts.
    const res = await fetch(SHEET_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'track', order_id: orderId, phone }),
      signal: controller.signal,
    });
    const data = res.ok ? await res.json() : null;
    if (data?.ok && data.order) return { ok: true, order: data.order };
    return { ok: false, error: data?.error === 'not_found' ? 'not_found' : 'unavailable' };
  } catch {
    return { ok: false, error: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}

// The ratings summary and the reviews that may be shown ({ summary, reviews }), or null without a sheet or
// when it cannot be reached.
export async function fetchReviews({ timeoutMs = 9000 } = {}) {
  if (!SHEET_API_URL) return null;
  try {
    const data = await getJson({ action: 'reviews' }, timeoutMs);
    return data?.ok
      ? { summary: data.summary, reviews: Array.isArray(data.reviews) ? data.reviews : [] }
      : null;
  } catch {
    return null;
  }
}

// Sends a review. → { ok: true } or { ok: false, error: 'not_found' | 'not_paid' | 'unavailable' }
export async function submitReview(review, { timeoutMs = 12000 } = {}) {
  if (!SHEET_API_URL) return { ok: false, error: 'unavailable' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(SHEET_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'review', review }),
      signal: controller.signal,
    });
    const data = res.ok ? await res.json() : null;
    if (data?.ok) return { ok: true };
    return { ok: false, error: ['not_found', 'not_paid'].includes(data?.error) ? data.error : 'unavailable' };
  } catch {
    return { ok: false, error: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}

// A POST to the script that waits for its answer (JSON), or { ok: false, error: 'unavailable' } when there is
// no sheet, no connection, or no answer in time. text/plain keeps it a simple request Apps Script accepts.
export async function callSheet(body, { timeoutMs = 12000 } = {}) {
  if (!SHEET_API_URL) return { ok: false, error: 'unavailable' };
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(SHEET_API_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    const data = res.ok ? await res.json() : null;
    return data && typeof data === 'object' ? data : { ok: false, error: 'unavailable' };
  } catch {
    return { ok: false, error: 'unavailable' };
  } finally {
    clearTimeout(timer);
  }
}

// Fire-and-forget: the customer never waits for the sheet. `no-cors` + text/plain keeps it a simple request
// that Apps Script accepts, and `keepalive` lets it finish even if the customer leaves for WhatsApp right away.
// With the sign-in `token`, the sheet links the order to the customer's account.
function post(action, order, token) {
  if (!SHEET_API_URL || !order?.order_id) return;
  try {
    fetch(SHEET_API_URL, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify(token ? { action, order, token } : { action, order }),
    }).catch(() => {});
  } catch {
    /* never block the order */
  }
}

// The customer has given delivery details and sees the QR: the order is waiting for payment.
export const submitOrder = (order, token) => post('order', order, token);

// The customer has paid and entered the UPI reference number. Sends the whole order again, so the sheet
// still gets it even if the first request was lost.
export const submitPayment = (order, token) => post('payment', order, token);

// The order as the sheet expects it (see saveOrder_ in google-sheet/Code.gs).
export function toSheetOrder({ orderId, summary, customer, upiRef, device }) {
  return {
    order_id: orderId,
    // The coupon the customer applied (the sheet checks it again, and adds the automatic offer itself)
    coupon: summary.deal?.kind === 'coupon' ? summary.deal.code : '',
    created_at: new Date().toISOString(),
    customer: { name: customer?.name || '', phone: customer?.phone || '', address: customer?.address || '' },
    upi_ref: upiRef || '',
    items: summary.lines.flatMap(({ restaurant, items }) =>
      items.map(({ dish, qty }) => ({
        dish_id: dish.id,
        dish: dish.name,
        restaurant_id: restaurant.id,
        restaurant: restaurant.name,
        qty,
        price: dish.price,
      })),
    ),
    riders: summary.riders,
    item_total: summary.itemTotal,
    gst: summary.gst,
    delivery: summary.delivery,
    grand_total: summary.grandTotal,
    device,
  };
}
