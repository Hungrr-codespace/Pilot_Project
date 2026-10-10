import clsx from 'clsx';
import { CAMPUS } from '@/config/site';
import { useLayout } from '@/context/layout';
import { Icon } from '@/components/ui/Icon/Icon';
import { useClusterPair } from '../hooks/useMenuBook';
import { RestaurantLogo } from './RestaurantLogo';
import styles from './ClusterMap.module.css';

const ROUTES = {
  desktop: {
    size: [488, 200],
    upper: 'M58 100 C110 100 118 52 170 52 L470 52',
    lower: 'M58 100 C110 100 118 148 170 148 L470 148',
  },
  mobile: {
    size: [316, 170],
    upper: 'M44 84 C80 84 84 44 120 44 L310 44',
    lower: 'M44 84 C80 84 84 124 120 124 L310 124',
  },
};

// "How clusters work": the campus with two delivery routes, one rider per cluster of restaurants.
export function ClusterMap() {
  const { isMobile } = useLayout();
  const [upper, lower] = useClusterPair();
  const route = isMobile ? ROUTES.mobile : ROUTES.desktop;
  const [width, height] = route.size;
  const riderIcon = isMobile ? 15 : 17;

  return (
    <div className={styles.map}>
      <svg
        width={width}
        height={height}
        viewBox={`0 0 ${width} ${height}`}
        aria-hidden="true"
        className={styles.routes}
      >
        <path d={route.upper} />
        <path d={route.lower} />
      </svg>
      <span className={styles.campus}>
        <Icon name="school" size={isMobile ? 24 : 30} color="var(--color-yellow)" />
      </span>
      {/* "BIT Mesra," on one line and "Patna" under it */}
      <span className={styles.campusName}>{CAMPUS.replace(', ', ',\n')}</span>
      <ClusterName cluster={upper.cluster} className={styles.upperName} />
      <span
        title={isMobile ? undefined : `Rider for ${upper.cluster.label}`}
        className={clsx(styles.rider, styles.upperRider)}
      >
        <Icon name="moped" size={riderIcon} color="var(--color-black)" />
      </span>
      <span
        title={isMobile ? undefined : `Rider for ${lower.cluster.label}`}
        className={clsx(styles.rider, styles.lowerRider)}
      >
        <Icon name="moped" size={riderIcon} color="var(--color-black)" />
      </span>
      <div className={clsx(styles.stops, styles.upperStops)}>
        {upper.restaurants.map((r) => (
          <RestaurantLogo key={r.id} restaurant={r} title={r.name} className={styles.stop} />
        ))}
      </div>
      <div className={clsx(styles.stops, styles.lowerStops)}>
        {lower.restaurants.map((r) => (
          <RestaurantLogo key={r.id} restaurant={r} title={r.name} className={styles.stop} />
        ))}
      </div>
      <ClusterName cluster={lower.cluster} className={styles.lowerName} />
    </div>
  );
}

function ClusterName({ cluster, className }) {
  return (
    <span className={clsx(styles.clusterName, className)}>
      <b className={styles.clusterLabel}>{cluster.label}</b>
      {cluster.area}
    </span>
  );
}
