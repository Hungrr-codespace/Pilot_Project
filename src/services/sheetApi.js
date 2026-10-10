// The Google Sheet backend, reached through the Apps Script web app (google-sheet/Code.gs).
//   GET  ?action=menu            → the menu tabs (Settings, Clusters, Restaurants, Dishes, QuickPicks)
//   POST {action:'order', order} → one row in Orders and one row per dish in OrderItems
// Without VITE_SHEET_API_URL the site runs on the built-in menu (src/data/menu-fallback.json) and logs no orders.
import fallbackRows from '@/data/menu-fallback.json';
import { normalizeMenu } from '@/lib/menuData';

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

// Sends a paid order to the sheet. Fire-and-forget: the customer's WhatsApp flow never waits for it.
// `no-cors` + text/plain keeps it a simple request that Apps Script accepts, and `keepalive` lets it finish
// even if the page opens WhatsApp right away.
export function submitOrder(order) {
  if (!SHEET_API_URL || !order?.order_id) return;
  try {
    fetch(SHEET_API_URL, {
      method: 'POST',
      mode: 'no-cors',
      keepalive: true,
      headers: { 'Content-Type': 'text/plain;charset=utf-8' },
      body: JSON.stringify({ action: 'order', order }),
    }).catch(() => {});
  } catch {
    /* never block the order */
  }
}

// The order as the sheet expects it (see saveOrder_ in google-sheet/Code.gs).
export function toSheetOrder({ orderId, summary, device }) {
  return {
    order_id: orderId,
    created_at: new Date().toISOString(),
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
