import { useLayout } from '@/context/layout';
import { formatRupees } from '@/lib/format';
import { Icon } from '@/components/ui/Icon/Icon';
import styles from './RecentOrders.module.css';

// Orders paid for on this phone (newest first): tap one to track it.
export function RecentOrders({ orders, activeId, onPick }) {
  const { isMobile } = useLayout();
  if (!orders.length) return null;
  return (
    <section className={styles.recent} aria-labelledby="recent-orders">
      <h2 id="recent-orders" className={styles.eyebrow}>
        Ordered on this phone
      </h2>
      <ul className={styles.list}>
        {orders.map((order) => (
          <li key={order.id}>
            <button
              type="button"
              onClick={() => onPick(order)}
              className={`${styles.order} btn-row`}
              aria-pressed={order.id === activeId}
            >
              <span className={styles.icon}>
                <Icon name="notebook" size={isMobile ? 16 : 20} color="var(--color-black)" />
              </span>
              <span className={styles.text}>
                <span className={styles.id}>{order.id}</span>
                <span className={styles.meta}>{order.placedAt}</span>
              </span>
              {Number.isFinite(order.total) && (
                <span className={styles.total}>{formatRupees(order.total)}</span>
              )}
              <Icon name="chevronRight" size={isMobile ? 18 : 22} color="var(--color-black)" />
            </button>
          </li>
        ))}
      </ul>
    </section>
  );
}
