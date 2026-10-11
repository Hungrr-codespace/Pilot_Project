import { plural } from '@/lib/format';
import { RestaurantRow } from './RestaurantRow';
import styles from './ClusterGroup.module.css';

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
