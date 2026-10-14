import { useLayout } from '@/context/layout';
import { useOrder } from '@/context/order';
import { plural } from '@/lib/format';
import { Icon } from '@/components/ui/Icon/Icon';
import styles from './ShopNotice.module.css';

// After "Order again" in the khata: which order came back on the note, and any dish no longer on the menu.
export function ReorderNotice() {
  const { isMobile } = useLayout();
  const { state, actions } = useOrder();
  const note = state.reorderNote;
  if (!note) return null;

  const title = note.added
    ? `Your order ${note.orderId} is back on the note`
    : `The dishes from ${note.orderId} aren't on the menu today`;
  const parts = [];
  if (note.added) parts.push(`${plural(note.added, 'dish', 'dishes')} added. Check the note, then confirm.`);
  if (note.missing.length) parts.push(`Not on the menu today: ${note.missing.join(', ')}.`);

  return (
    <div className={styles.notice} role="status">
      <span aria-hidden="true" className={styles.icon}>
        <Icon name="refresh" size={isMobile ? 20 : 26} color="var(--color-black)" />
      </span>
      <span className={styles.text}>
        <strong className={styles.title}>{title}</strong>
        <span className={styles.body}>{parts.join(' ')}</span>
      </span>
      <button
        type="button"
        onClick={actions.dismissReorderNote}
        aria-label="Close"
        className={`${styles.close} btn-ghost`}
      >
        <Icon name="close" size={18} color="currentColor" />
      </button>
    </div>
  );
}
