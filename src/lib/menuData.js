// Turns the Google Sheet's rows into the menu the site uses.
//
// The sheet has one tab per kind of data. Each tab's first row holds the column names below; every other row is
// one item. Column order does not matter, and extra columns are ignored.
//
//   Settings     key | value
//   Clusters     cluster_id | label | area | sort
//   Restaurants  restaurant_id | name | initials | cluster_id | distance | veg_only | active | sort
//   Dishes       dish_id | restaurant_id | category | name | price | veg | description | available | sort
//   QuickPicks   pick_id | name | match_words | photo | active | sort
//
// Result:
//   settings     { gstRate, deliveryCharge, whatsapp, upiId, upiName, deliverTo,
//                  opensAt, closesAt (minutes after midnight, Indian time), ordersPaused, pauseMessage }
//   clusters     [{ id, label, area }]
//   restaurants  [{ id, name, initials, distance, isPureVeg, clusterId, categories: [{ id, name, dishes: [{ id, name, price, isVeg, description }] }] }]
//   dishTypes    [{ id, name, matchWords: [...], photo }]   (the quick picks on the table)

import { parseClock } from './orderHours';

const str = (v) => (v === null || v === undefined ? '' : String(v)).trim();
const num = (v, fallback = 0) => {
  const n = Number(String(v ?? '').replace(/[^0-9.-]/g, ''));
  return Number.isFinite(n) && str(v) !== '' ? n : fallback;
};
// TRUE/FALSE, yes/no, 1/0 and ticked checkboxes all work; an empty cell counts as `fallback`.
const bool = (v, fallback) => {
  if (v === true || v === false) return v;
  const s = str(v).toLowerCase();
  if (!s) return fallback;
  return ['true', 'yes', 'y', '1', 'veg'].includes(s);
};
const bySort = (a, b) => num(a.sort, 9999) - num(b.sort, 9999);

export const slug = (s) =>
  str(s)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '') || 'x';

// A photo cell can hold a full https link, a Google Drive share link, or just a file name from public/dishes.
export function photoUrl(value) {
  const s = str(value);
  if (!s) return '';
  const drive = s.match(/drive\.google\.com\/(?:file\/d\/|open\?id=|uc\?(?:export=\w+&)?id=)([\w-]+)/);
  if (drive) return `https://drive.google.com/thumbnail?id=${drive[1]}&sz=w600`;
  if (/^https?:\/\//i.test(s) || s.startsWith('/')) return s;
  return `/dishes/${s}`;
}

export const DEFAULT_SETTINGS = {
  gstRate: 5,
  deliveryCharge: 50,
  whatsapp: '917979037042',
  upiId: 'rj09aditya@oksbi',
  upiName: 'Aditya Raj',
  deliverTo: 'BIT Mesra, Patna',
  opensAt: 660, // 11:00 AM
  closesAt: 1230, // 8:30 PM
  ordersPaused: false,
  pauseMessage: '',
};

function readSettings(rows) {
  const values = {};
  rows.forEach((r) => {
    if (str(r.key)) values[str(r.key)] = r.value;
  });
  return {
    gstRate: num(values.gst_percent, DEFAULT_SETTINGS.gstRate),
    deliveryCharge: num(values.delivery_charge_per_rider, DEFAULT_SETTINGS.deliveryCharge),
    whatsapp: str(values.whatsapp_number).replace(/\D/g, '') || DEFAULT_SETTINGS.whatsapp,
    upiId: str(values.upi_id) || DEFAULT_SETTINGS.upiId,
    upiName: str(values.upi_name) || DEFAULT_SETTINGS.upiName,
    deliverTo: str(values.deliver_to) || DEFAULT_SETTINGS.deliverTo,
    ...readOrderHours(values),
  };
}

// Opening hours and the pause switch (Settings rows opens_at, closes_at, orders_paused, pause_message). Also
// used for the quick status check while a page is open (see fetchShopStatus in services/sheetApi.js).
export function readOrderHours(values) {
  return {
    opensAt: parseClock(values.opens_at) ?? DEFAULT_SETTINGS.opensAt,
    closesAt: parseClock(values.closes_at) ?? DEFAULT_SETTINGS.closesAt,
    ordersPaused: bool(values.orders_paused, DEFAULT_SETTINGS.ordersPaused),
    pauseMessage: str(values.pause_message).slice(0, 160),
  };
}

function readRestaurants(restaurantRows, dishRows) {
  const dishes = dishRows
    .filter((d) => str(d.dish_id) && str(d.name) && bool(d.available, true))
    .sort(bySort);

  return restaurantRows
    .filter((r) => str(r.restaurant_id) && bool(r.active, true))
    .sort(bySort)
    .map((r) => {
      const id = str(r.restaurant_id);
      const categories = [];
      dishes
        .filter((d) => str(d.restaurant_id) === id)
        .forEach((d) => {
          const name = str(d.category) || 'Menu';
          let category = categories.find((c) => c.name === name);
          if (!category) {
            category = { id: slug(name), name, dishes: [] };
            categories.push(category);
          }
          category.dishes.push({
            id: str(d.dish_id),
            name: str(d.name),
            price: num(d.price),
            isVeg: bool(d.veg, true),
            description: str(d.description),
          });
        });
      return {
        id,
        name: str(r.name),
        initials: str(r.initials),
        distance: str(r.distance),
        isPureVeg: bool(r.veg_only, false),
        clusterId: str(r.cluster_id),
        categories,
      };
    });
}

function readQuickPicks(rows) {
  return rows
    .filter((p) => str(p.pick_id) && str(p.name) && bool(p.active, true))
    .sort(bySort)
    .map((p) => {
      const words = str(p.match_words || p.name)
        .toLowerCase()
        .split(',')
        .map((w) => w.trim())
        .filter(Boolean);
      return {
        id: slug(p.pick_id),
        name: str(p.name),
        matchWords: words.length ? words : [str(p.name).toLowerCase()],
        photo: photoUrl(p.photo),
      };
    });
}

export function normalizeMenu(raw) {
  const rows = (tab) => (Array.isArray(raw?.[tab]) ? raw[tab] : []);
  return {
    settings: readSettings(rows('Settings')),
    clusters: rows('Clusters')
      .filter((c) => str(c.cluster_id))
      .sort(bySort)
      .map((c) => ({ id: str(c.cluster_id), label: str(c.label), area: str(c.area) })),
    restaurants: readRestaurants(rows('Restaurants'), rows('Dishes')),
    dishTypes: readQuickPicks(rows('QuickPicks')),
  };
}

// Every dish of a restaurant, with its category.
export function allDishes(restaurant) {
  return restaurant.categories.flatMap((category) => category.dishes.map((dish) => ({ dish, category })));
}
