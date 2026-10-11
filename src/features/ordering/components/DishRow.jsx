import clsx from 'clsx';
import { useLayout } from '@/context/layout';
import { formatRupees } from '@/lib/format';
import { Icon } from '@/components/ui/Icon/Icon';
import { VegMark } from '@/components/ui/VegMark/VegMark';
import styles from './DishRow.module.css';

// One dish on a menu page: veg mark, name, price, description, and ADD (or − qty +) on the right.
// `isHighlighted` marks dishes that match the customer's search or quick pick.
export function DishRow({ dish, quantity, isHighlighted, onChangeQuantity }) {
  const { isMobile } = useLayout();
  const price = <span className={styles.price}>{formatRupees(dish.price)}</span>;

  return (
    <div className={clsx(styles.row, isHighlighted && styles.highlighted)}>
      <div className={styles.info}>
        <div className={styles.titleLine}>
          <VegMark veg={dish.isVeg} />
          <span className={styles.name}>{dish.name}</span>
          {!isMobile && (
            <>
              <span aria-hidden="true" className={styles.leader} />
              {price}
            </>
          )}
        </div>
        <span className={styles.description}>{dish.description}</span>
        {isMobile && price}
      </div>
      <QuantityControl dishName={dish.name} quantity={quantity} onChange={onChangeQuantity} />
    </div>
  );
}

// ADD button, which becomes a − qty + stepper once the dish is in the order.
function QuantityControl({ dishName, quantity, onChange }) {
  const { isMobile } = useLayout();
  if (quantity === 0) {
    return (
      <button type="button" onClick={() => onChange(1)} aria-label={`Add ${dishName}`} className={styles.add}>
        <Icon name="plus" size={isMobile ? 13 : 14} color="var(--color-black)" />
        ADD
      </button>
    );
  }
  const iconSize = isMobile ? 14 : 15;
  return (
    <div className={styles.stepper}>
      <button
        type="button"
        onClick={() => onChange(quantity - 1)}
        aria-label={`Remove one ${dishName}`}
        className={styles.step}
      >
        <Icon name="minus" size={iconSize} color="var(--color-yellow)" />
      </button>
      <span className={styles.quantity}>{quantity}</span>
      <button
        type="button"
        onClick={() => onChange(quantity + 1)}
        aria-label={`Add one more ${dishName}`}
        className={styles.step}
      >
        <Icon name="plus" size={iconSize} color="var(--color-yellow)" />
      </button>
    </div>
  );
}
