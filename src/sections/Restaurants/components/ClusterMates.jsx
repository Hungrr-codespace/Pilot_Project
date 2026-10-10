import { useOrder } from '@/context/order';
import { countInCart } from '@/lib/pricing';
import { plural } from '@/lib/format';
import { Icon } from '@/components/ui/Icon/Icon';
import { RestaurantLogo } from './RestaurantLogo';
import styles from './ClusterMates.module.css';

// Other restaurants in the same cluster (same rider, no extra delivery charge), with how many of their dishes
// are already in the order.
function useMates(restaurants) {
  const { state, actions } = useOrder();
  return restaurants.map((restaurant) => ({
    restaurant,
    inCart: countInCart(restaurant, state.cart),
    open: () => actions.showRestaurant(restaurant.id),
  }));
}

// Desktop: full-width rows.
export function ClusterMateList({ restaurants }) {
  const mates = useMates(restaurants);
  return (
    <div className={styles.list}>
      {mates.map(({ restaurant, inCart, open }) => (
        <button
          key={restaurant.id}
          type="button"
          onClick={open}
          aria-label={`Open ${restaurant.name} menu`}
          className={styles.row}
        >
          <RestaurantLogo restaurant={restaurant} className={styles.rowLogo} />
          <span className={styles.rowInfo}>
            <span className={styles.rowName}>{restaurant.name}</span>
            <span className={styles.rowDistance}>{restaurant.dist}</span>
          </span>
          {inCart > 0 && <span className={styles.count}>{plural(inCart, 'item')}</span>}
          <span className={styles.open}>
            Menu
            <Icon name="chevronRight" size={16} color="var(--color-black)" />
          </span>
        </button>
      ))}
    </div>
  );
}

// Mobile: a scrollable row of chips.
export function ClusterMateChips({ restaurants }) {
  const mates = useMates(restaurants);
  return (
    <div className={styles.chipsBlock}>
      <span className={styles.chipsTitle}>
        <Icon name="moped" size={14} color="var(--color-text-muted)" />
        Also in this cluster · same rider
      </span>
      <div className={styles.chips}>
        {mates.map(({ restaurant, inCart, open }) => (
          <button
            key={restaurant.id}
            type="button"
            onClick={open}
            aria-label={`Open ${restaurant.name} menu`}
            className={styles.chip}
          >
            <RestaurantLogo restaurant={restaurant} className={styles.chipLogo} />
            {restaurant.name}
            {inCart > 0 && <span className={styles.chipCount}>{plural(inCart, 'item')}</span>}
          </button>
        ))}
      </div>
    </div>
  );
}
