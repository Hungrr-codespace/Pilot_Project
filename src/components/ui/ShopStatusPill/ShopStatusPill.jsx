import clsx from 'clsx';
import { useShopStatus } from '@/context/shopStatus';
import { shopStatusText } from '@/lib/orderHours';
import styles from './ShopStatusPill.module.css';

// A small pill with a coloured dot: green when open, amber when closing soon or paused, red when closed.
export function ShopStatusPill({ short = false, tone = 'light', className }) {
  const status = useShopStatus();
  const mood =
    status.state === 'open'
      ? status.closingSoon
        ? 'soon'
        : 'open'
      : status.state === 'paused'
        ? 'soon'
        : 'closed';
  return (
    <span className={clsx(styles.pill, styles[tone], styles[mood], className)} role="status">
      <span aria-hidden="true" className={styles.dot} />
      {shopStatusText(status, short)}
    </span>
  );
}
