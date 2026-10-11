import clsx from 'clsx';
import { useLayout } from '@/context/layout';
import { useOrder } from '@/context/order';
import { getOrderStep } from '@/context/orderReducer';
import { Icon } from '@/components/ui/Icon/Icon';
import styles from './OrderProgress.module.css';

const STEPS = [
  { label: 'Pick dishes', short: 'Dishes', detail: 'From any restaurant' },
  { label: 'Review order', short: 'Review', detail: 'GST and delivery' },
  { label: 'Your details', short: 'Details', detail: 'Name, phone, address' },
  { label: 'Pay by UPI', short: 'Pay', detail: 'Scan the QR' },
  { label: 'Confirm payment', short: 'Confirm', detail: 'UPI reference no.' },
];

// The five steps of an order, with the customer's current step highlighted and finished steps ticked.
export function OrderProgress({ className }) {
  const { isMobile } = useLayout();
  const { state } = useOrder();
  const current = getOrderStep(state);

  return (
    <ol className={clsx(styles.progress, className)} aria-label="Order steps">
      {STEPS.map((step, i) => {
        const number = i + 1;
        const status = number < current ? 'done' : number === current ? 'current' : 'next';
        return (
          <li
            key={step.label}
            className={clsx(styles.step, styles[status])}
            aria-current={status === 'current' ? 'step' : undefined}
          >
            <span className={styles.marker}>
              {status === 'done' ? (
                <Icon name="check" size={isMobile ? 16 : 22} color="var(--color-black)" />
              ) : (
                number
              )}
            </span>
            <span className={styles.text}>
              <span className={styles.label}>{isMobile ? step.short : step.label}</span>
              {!isMobile && <span className={styles.detail}>{step.detail}</span>}
            </span>
            {number < STEPS.length && <span aria-hidden="true" className={styles.connector} />}
          </li>
        );
      })}
    </ol>
  );
}
