import { useLayout } from '@/context/layout';
import { Icon } from '@/components/ui/Icon/Icon';
import styles from './ClusterNote.module.css';

// Explains that adding a restaurant from another cluster adds a rider (and a delivery charge).
export function ClusterNote() {
  const { isMobile } = useLayout();
  return (
    <div className={styles.note}>
      <span className={styles.icon}>
        <Icon name="moped" size={isMobile ? 17 : 19} color="var(--color-yellow)" />
      </span>
      <span className={styles.text}>
        <b className={styles.lead}>Want a restaurant from another cluster too?</b> You can add it. Each
        cluster has its own rider, so the delivery charge goes up with every extra cluster.
      </span>
    </div>
  );
}

export const CLUSTERS_INTRO =
  'Restaurants in one cluster are on the same route. Mix them in one order and one rider brings it all.';
