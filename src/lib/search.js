// Finding dishes and restaurants: by quick pick (a dish type from the table) or by typed search.
import { allDishes } from './menuData';

// A dish belongs to a quick pick when its name contains one of the pick's match words.
export function isDishOfType(dish, dishType) {
  const name = dish.name.toLowerCase();
  return dishType.key.some((word) => name.includes(word));
}

// Is this dish what the customer is looking for? Used to highlight dishes in the menu.
export function isDishMatch(dish, cat, { dishType, query }) {
  if (dishType) return isDishOfType(dish, dishType);
  const q = query.trim().toLowerCase();
  if (!q) return false;
  return dish.name.toLowerCase().includes(q) || (!!cat && cat.name.toLowerCase().includes(q));
}

// How many restaurants serve a quick pick (shown under each dish on the table).
export function countRestaurantsServing(restaurants, dishType) {
  return restaurants.filter((r) => allDishes(r).some(({ dish }) => isDishOfType(dish, dishType))).length;
}

// One restaurant in the index, or null when the current filter hides it.
//   matches   the dishes that match the filter (all dishes when there is no filter)
//   filtered  true when `matches` should be listed instead of the distance
export function matchRestaurant(restaurant, { dishType, query }) {
  const q = query.trim().toLowerCase();
  let matches = allDishes(restaurant);
  if (dishType) {
    matches = matches.filter(({ dish }) => isDishOfType(dish, dishType));
    if (!matches.length) return null;
  }
  const nameMatch = !!q && restaurant.name.toLowerCase().includes(q);
  if (q && !nameMatch) {
    matches = matches.filter(
      ({ dish, cat }) => dish.name.toLowerCase().includes(q) || cat.name.toLowerCase().includes(q),
    );
    if (!matches.length) return null;
  }
  return { restaurant, matches, filtered: !!dishType || (!!q && !nameMatch) };
}
