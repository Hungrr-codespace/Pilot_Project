import { useMemo } from 'react';
import { useMenu } from '@/context/menu';
import { useOrder } from '@/context/order';
import { matchRestaurant } from '@/lib/search';

const NO_CLUSTER = { id: '', label: '', area: '' };

// What the menu book shows, worked out from the menu and the ordering state:
//   dishType       the quick pick chosen on the table (or null)
//   filter         { dishType, query } — what the customer is looking for
//   groups         restaurants that match the filter, grouped by cluster
//   restaurant     the restaurant whose dishes are open, with its cluster, cluster mates and current category
export function useMenuBook() {
  const { restaurants, clusters, dishTypes } = useMenu();
  const { state } = useOrder();
  const { dishTypeId, query, restaurantId, categoryByRestaurant } = state;

  return useMemo(() => {
    const dishType = dishTypes.find((t) => t.id === dishTypeId) || null;
    const filter = { dishType, query };

    const groups = clusters
      .map((cluster) => ({
        cluster,
        matches: restaurants
          .filter((r) => r.cl === cluster.id)
          .map((r) => matchRestaurant(r, filter))
          .filter(Boolean),
      }))
      .filter((group) => group.matches.length);

    const restaurant = restaurants.find((r) => r.id === restaurantId) || restaurants[0];
    const cluster = clusters.find((c) => c.id === restaurant.cl) || NO_CLUSTER;
    const clusterMates = restaurants.filter((r) => r.cl === restaurant.cl && r.id !== restaurant.id);
    const category =
      restaurant.cats.find((c) => c.id === categoryByRestaurant[restaurant.id]) || restaurant.cats[0] || null;

    return { dishType, filter, groups, restaurant, cluster, clusterMates, category };
  }, [restaurants, clusters, dishTypes, dishTypeId, query, restaurantId, categoryByRestaurant]);
}

// The first two clusters, for the "How clusters work" diagram.
export function useClusterPair() {
  const { restaurants, clusters } = useMenu();
  return useMemo(
    () =>
      [clusters[0] || NO_CLUSTER, clusters[1] || NO_CLUSTER].map((cluster) => ({
        cluster,
        restaurants: restaurants.filter((r) => r.cl === cluster.id),
      })),
    [restaurants, clusters],
  );
}
