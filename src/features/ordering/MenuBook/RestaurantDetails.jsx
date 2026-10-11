import { CAMPUS_SHORT } from '@/config/site';
import { useOrder } from '@/context/order';
import { Icon } from '@/components/ui/Icon/Icon';
import { VegMark } from '@/components/ui/VegMark/VegMark';
import { useMenuBook } from '../hooks/useMenuBook';
import { RestaurantLogo } from '../components/RestaurantLogo';
import { OrnamentHeading } from '../components/OrnamentHeading';
import { ClusterMateList } from '../components/ClusterMates';
import styles from './RestaurantDetails.module.css';

// Desktop page 3 (left page, facing the dishes): the open restaurant and the others on its route.
export function RestaurantDetails() {
  const { actions } = useOrder();
  const { restaurant, cluster, clusterMates } = useMenuBook();

  return (
    <>
      <button type="button" onClick={actions.showIndex} className={`${styles.back} btn-light`}>
        <Icon name="arrowLeft" size={18} color="var(--color-black)" />
        All restaurants
      </button>
      <div className={styles.details}>
        <RestaurantLogo restaurant={restaurant} className={styles.logo} />
        <h3 className={styles.name}>{restaurant.name}</h3>
        <div className={styles.meta}>
          <span className={styles.distance}>
            <Icon name="mapMarkerOutline" size={17} color="var(--color-black)" />
            {restaurant.distance} from {CAMPUS_SHORT}
          </span>
          {restaurant.isPureVeg && (
            <span className={styles.pureVeg}>
              <VegMark />
              Pure Veg
            </span>
          )}
        </div>
        <span className={styles.cluster}>
          {cluster.label} · {cluster.area}
        </span>
        <div className={styles.matesHeading}>
          <OrnamentHeading>Also in this cluster</OrnamentHeading>
        </div>
        <ClusterMateList restaurants={clusterMates} />
        <span className={styles.riderNote}>
          <Icon name="moped" size={18} color="var(--color-text-subtle)" />
          One rider picks up from every restaurant in this cluster.
        </span>
      </div>
    </>
  );
}
