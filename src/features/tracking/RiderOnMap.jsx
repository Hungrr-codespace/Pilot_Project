import { lazy, Suspense } from 'react';
import { useLayout } from '@/context/layout';
import { timeAgo } from '@/lib/format';
import { Icon } from '@/components/ui/Icon/Icon';
import styles from './RiderOnMap.module.css';

const RiderMap = lazy(() => import('./RiderMap'));

// On the tracking page while the order is out for delivery: who is bringing it and, when the rider is sharing
// their location, where they are now (updated about every 20 seconds).
export function RiderOnMap({ rider }) {
  const { isMobile } = useLayout();
  const hasSpot = Number.isFinite(rider?.lat) && Number.isFinite(rider?.lng);
  return (
    <section className={styles.box} aria-label="Your rider">
      <div className={styles.head}>
        <span className={styles.icon}>
          <Icon name="moped" size={isMobile ? 18 : 22} color="var(--color-black)" />
        </span>
        <span className={styles.text}>
          <strong>{rider.name} is bringing your order</strong>
          <span className={styles.when}>
            {hasSpot
              ? `Location updated ${timeAgo(new Date(rider.at))}`
              : 'Their live location shows here once they share it.'}
          </span>
        </span>
        {hasSpot && <span className={styles.live}>Live</span>}
      </div>
      {hasSpot && (
        <Suspense fallback={<div className={styles.placeholder} />}>
          <RiderMap lat={rider.lat} lng={rider.lng} name={rider.name} />
        </Suspense>
      )}
    </section>
  );
}
