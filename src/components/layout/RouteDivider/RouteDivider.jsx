import { useRef } from 'react';
import { useLayout } from '@/context/layout';
import { useScrollProgress } from '@/hooks/useScrollProgress';
import { Icon } from '@/components/ui/Icon/Icon';
import styles from './RouteDivider.module.css';

// Desktop only: a short road between two sections. The moped rides along it as the page scrolls.
export function RouteDivider() {
  const { isMobile } = useLayout();
  const ref = useRef(null);
  useScrollProgress(ref, !isMobile);
  if (isMobile) return null;

  return (
    <div ref={ref} className={styles.divider} aria-hidden="true">
      <div className={styles.road}>
        <span className={styles.moped}>
          <Icon name="moped" size={30} color="var(--color-black)" />
        </span>
      </div>
    </div>
  );
}