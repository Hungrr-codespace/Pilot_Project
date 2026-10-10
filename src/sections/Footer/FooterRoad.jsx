import { CAMPUS } from '@/config/site';
import { useLayout } from '@/context/layout';
import { Icon } from '@/components/ui/Icon/Icon';
import styles from './FooterRoad.module.css';

// A dashed road with our rider heading to the campus, across the top of the footer.
export function FooterRoad() {
  const { isMobile } = useLayout();

  const destination = (
    <span className={styles.destination}>
      <Icon name="mapMarker" size={isMobile ? 15 : 26} color="var(--color-yellow)" />
      <span className={styles.destinationName}>{CAMPUS}</span>
    </span>
  );

  if (isMobile) {
    return (
      <div className={styles.road}>
        <span className={styles.dashes} />
        <span className={styles.rider}>
          <Icon name="moped" size={18} color="var(--color-black)" />
        </span>
        <span className={styles.dashes} />
        {destination}
      </div>
    );
  }

  return (
    <div className={styles.road}>
      <div className={styles.track} />
      <div className={styles.dashes} />
      <div className={styles.rider}>
        <Icon name="moped" size={30} color="var(--color-black)" />
      </div>
      {destination}
    </div>
  );
}
