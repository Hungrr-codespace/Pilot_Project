import { useLayout } from '@/context/layout';
import { useShopStatus } from '@/context/shopStatus';
import { Icon } from '@/components/ui/Icon/Icon';
import styles from './ShopNotice.module.css';

// Shown on the pilot page while ordering is closed or paused: when orders open again (or the pause message from
// the sheet), and that the menu can still be browsed.
export function ShopNotice({ className }) {
  const { isMobile } = useLayout();
  const status = useShopStatus();
  if (status.state === 'open') return null;

  const isPaused = status.state === 'paused';
  const title = isPaused ? 'Orders are paused' : "We're closed right now";
  const text = isPaused
    ? `${status.message || "We'll be back soon."} You can still look through the menu.`
    : `Orders open ${status.opensToday ? 'today' : 'tomorrow'} at ${status.hours.opens}. You can still look through the menu and plan your order.`;

  return (
    <div className={[styles.notice, className].filter(Boolean).join(' ')} role="status">
      <span aria-hidden="true" className={styles.icon}>
        <Icon name="clock" size={isMobile ? 20 : 26} color="var(--color-black)" />
      </span>
      <span className={styles.text}>
        <strong className={styles.title}>{title}</strong>
        <span className={styles.body}>{text}</span>
      </span>
    </div>
  );
}
