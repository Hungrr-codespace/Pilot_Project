import { useLayout } from '@/context/layout';
import { useOrder } from '@/context/order';
import { formatRupees, plural } from '@/lib/format';
import { Icon } from '@/components/ui/Icon/Icon';
import styles from './OrderBar.module.css';

// Black bar at the bottom of the menu pages: what is in the order so far, and the button to review it.
export function OrderBar() {
  const { isMobile } = useLayout();
  const { summary, actions } = useOrder();
  const hasItems = !summary.isEmpty;
  const iconSize = isMobile ? 18 : 20;
  const label = isMobile ? 'Review' : 'Review order';

  return (
    <div className={styles.bar}>
      <span className={styles.info}>
        <span className={styles.title}>
          {hasItems
            ? `${plural(summary.itemCount, 'item')} · ${plural(summary.restaurantCount, 'restaurant')}`
            : 'No dishes added yet'}
        </span>
        <span className={styles.subtitle}>
          {hasItems
            ? `Items total ${formatRupees(summary.itemTotal)} + GST & delivery`
            : 'Add dishes to start your order'}
        </span>
      </span>
      {hasItems ? (
        <button type="button" onClick={actions.openNotepad} className={styles.review}>
          <Icon name="notebook" size={iconSize} color="var(--color-black)" />
          {label}
        </button>
      ) : (
        <span aria-disabled="true" className={styles.reviewDisabled}>
          <Icon name="notebook" size={iconSize} color="var(--color-text-subtle)" />
          {label}
        </span>
      )}
    </div>
  );
}
