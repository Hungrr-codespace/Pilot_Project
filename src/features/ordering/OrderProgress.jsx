import clsx from 'clsx';
import { useLayout } from '@/context/layout';
import { useOrder } from '@/context/order';
import { getOrderStep } from '@/context/orderReducer';
import { Icon } from '@/components/ui/Icon/Icon';
import styles from './OrderProgress.module.css';

const STEPS = [
  { label: 'Pick dishes', short: 'Dishes' },
  { label: 'Review order', short: 'Review' },
  { label: 'Your details', short: 'Details' },
  { label: 'Pay by UPI', short: 'Pay' },
  { label: 'Confirm payment', short: 'Confirm' },
];

// The five steps of an order, with the customer's current step highlighted and finished steps ticked.
// layout="rail": a black column of steps (desktop, beside the menu). layout="bar": a white bar of steps in a row
// (on top of the menu: desktop while paying, and always on mobile).
export function OrderProgress({ layout = 'bar', className }) {
  const { isMobile } = useLayout();
  const { state } = useOrder();
  const current = getOrderStep(state);
  const isRail = layout === 'rail';

  return (
    <div className={clsx(styles.progress, styles[layout], className)}>
      {isRail && <span className={styles.eyebrow}>Your order</span>}
      <ol className={styles.steps} aria-label="Order steps">
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
                  <Icon
                    name="check"
                    size={isMobile ? 14 : 18}
                    color={isRail ? 'var(--color-yellow)' : 'var(--color-black)'}
                  />
                ) : (
                  number
                )}
              </span>
              <span className={styles.label}>{isMobile ? step.short : step.label}</span>
              {number < STEPS.length && <span aria-hidden="true" className={styles.connector} />}
            </li>
          );
        })}
      </ol>
    </div>
  );
}
