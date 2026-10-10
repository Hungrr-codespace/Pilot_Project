import { CAMPUS_SHORT } from '@/config/site';
import { useLayout } from '@/context/layout';
import { useOrder } from '@/context/order';
import { Icon } from '@/components/ui/Icon/Icon';
import { VegMark } from '@/components/ui/VegMark/VegMark';
import { countInCart } from '@/lib/pricing';
import { plural } from '@/lib/format';
import { RestaurantLogo } from './RestaurantLogo';
import styles from './RestaurantRow.module.css';

// One restaurant in the index. Shows the matching dishes when filtered, otherwise its distance.
export function RestaurantRow({ match, dishType }) {
  const { isMobile } = useLayout();
  const { state, actions } = useOrder();
  const { restaurant, matches, filtered } = match;

  const inCart = countInCart(restaurant, state.cart);
  let badge = '';
  if (dishType) badge = plural(matches.length, 'dish', 'dishes');
  else if (inCart > 0) badge = `${inCart} in order`;

  let line = `${restaurant.dist} from ${CAMPUS_SHORT}`;
  if (filtered) line = matches.map(({ dish }) => dish.name).join(' · ');
  else if (!restaurant.cats.length) line = `${restaurant.dist} · Menu coming soon`;

  return (
    <button
      type="button"
      onClick={() => actions.showRestaurant(restaurant.id)}
      aria-label={`Open ${restaurant.name} menu`}
      className={styles.row}
    >
      <RestaurantLogo restaurant={restaurant} className={styles.logo} />
      <span className={styles.info}>
        <span className={styles.name}>
          {restaurant.name}
          {restaurant.veg && (
            <span className={styles.pureVeg}>
              <VegMark />
              Pure Veg
            </span>
          )}
        </span>
        <span className={styles.line}>{line}</span>
      </span>
      {badge && <span className={styles.badge}>{badge}</span>}
      {isMobile ? (
        <Icon name="chevronRight" size={18} color="var(--color-black)" />
      ) : (
        <span className={styles.open}>
          Menu
          <Icon name="chevronRight" size={16} color="var(--color-black)" />
        </span>
      )}
    </button>
  );
}

// Restaurants of one delivery cluster, under a "C1 · Area ——— 3 restaurants" heading.
export function ClusterGroup({ group, dishType }) {
  const { cluster, matches } = group;
  return (
    <div className={styles.group}>
      <div className={styles.groupHead}>
        <span className={styles.clusterLabel}>{cluster.label}</span>
        <span className={styles.clusterArea}>{cluster.area}</span>
        <span aria-hidden="true" className={styles.groupRule} />
        <span className={styles.groupCount}>{plural(matches.length, 'restaurant')}</span>
      </div>
      {matches.map((match) => (
        <RestaurantRow key={match.restaurant.id} match={match} dishType={dishType} />
      ))}
    </div>
  );
}
