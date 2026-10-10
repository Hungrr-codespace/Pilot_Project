import clsx from 'clsx';
import { useLayout } from '@/context/layout';
import { useOrder } from '@/context/order';
import motion from '@/styles/motion.module.css';
import { OrderSheet } from './OrderSheet';
import { PaymentSheet } from './PaymentSheet';
import styles from './OrderNotepad.module.css';

// The order note: a spiral notepad that slides up over the menu book. Its top sheet is the order (a cart you
// can still edit); "Confirm order" flips it over the top to the payment sheet underneath.
export function OrderNotepad() {
  const { isMobile } = useLayout();
  const { state, actions } = useOrder();
  const ringCount = isMobile ? 11 : 13;

  return (
    <div className={clsx(styles.backdrop, motion.fadeIn)}>
      <button
        type="button"
        onClick={actions.closeNotepad}
        aria-label="Close order note"
        tabIndex={-1}
        className={styles.dismiss}
      />
      <div
        role="dialog"
        aria-label="Your order"
        className={clsx(styles.pad, state.notepad.isLeaving && styles.leaving)}
      >
        <div className={styles.sheets}>
          <PaymentSheet />
          <OrderSheet isFlipped={state.notepad.page === 'pay'} />
        </div>
        <div aria-hidden="true" className={styles.rings}>
          {Array.from({ length: ringCount }, (_, i) => (
            <span key={i} className={styles.ring} />
          ))}
        </div>
      </div>
    </div>
  );
}
