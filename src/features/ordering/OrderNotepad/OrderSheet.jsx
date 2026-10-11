import clsx from 'clsx';
import { useLayout } from '@/context/layout';
import { useMenu } from '@/context/menu';
import { useOrder } from '@/context/order';
import { useShopStatus } from '@/context/shopStatus';
import { formatRupees } from '@/lib/format';
import { Icon } from '@/components/ui/Icon/Icon';
import { NoteActions, NoteBody, NoteHeading, NoteSheet } from './NoteSheet';
import { BackButton, PrimaryButton } from './NoteButtons';
import { OrderCharges } from './OrderCharges';
import styles from './OrderSheet.module.css';

const FIRST_LINE_DELAY = 0.55; // seconds after the notepad starts sliding in
const LINE_DELAY = 0.12;

// The top sheet: the order written out by restaurant, with − / + to change quantities, and the totals.
export function OrderSheet({ isFlipped }) {
  const { isMobile } = useLayout();
  const { settings } = useMenu();
  const { summary, actions } = useOrder();
  const shop = useShopStatus();

  // Each written line appears a little after the one before it.
  let line = 0;
  const nextDelay = () => ({ animationDelay: `${(FIRST_LINE_DELAY + line++ * LINE_DELAY).toFixed(2)}s` });

  const rows = summary.lines.map(({ restaurant, items }) => (
    <OrderGroup key={restaurant.id} restaurant={restaurant} items={items} nextDelay={nextDelay} />
  ));
  const chargesDelay = FIRST_LINE_DELAY + line * LINE_DELAY;

  return (
    <NoteSheet className={clsx(styles.sheet, isFlipped && styles.flipped)}>
      <span aria-hidden="true" className={styles.pencil}>
        <Icon name="pencil" size={isMobile ? 34 : 44} color="#E0A100" />
      </span>
      <NoteBody>
        <NoteHeading
          eyebrow="Hungrr · Order note"
          title="Your order"
          subtitle={`Deliver to: ${settings.deliverTo}`}
        />
        <div className={styles.lines}>
          {rows}
          {summary.isEmpty && (
            <span className={styles.empty}>
              Your order is empty.
              <br />
              Go back and add some dishes.
            </span>
          )}
        </div>
        <OrderCharges summary={summary} writeDelay={chargesDelay} />
      </NoteBody>
      <NoteActions>
        <BackButton onClick={actions.closeNotepad} />
        {summary.isEmpty ? (
          <PrimaryButton>{isMobile ? 'Add dishes first' : 'Add dishes to confirm'}</PrimaryButton>
        ) : shop.state !== 'open' ? (
          // Closed or paused: the order note stays, but it cannot be confirmed (see ShopNotice on the page)
          <PrimaryButton>{closedLabel(shop, isMobile)}</PrimaryButton>
        ) : (
          <PrimaryButton icon="check" onClick={actions.confirmOrder}>
            {isMobile ? 'Confirm order' : `Confirm order · ${formatRupees(summary.grandTotal)}`}
          </PrimaryButton>
        )}
      </NoteActions>
    </NoteSheet>
  );
}

// "Ordering opens at 11:00 AM" / "Orders paused" on the greyed-out button
function closedLabel(shop, isMobile) {
  if (shop.state === 'paused') return 'Orders paused';
  if (isMobile) return `Opens at ${shop.hours.opens}`;
  return `Ordering opens ${shop.opensToday ? '' : 'tomorrow '}at ${shop.hours.opens}`;
}

function OrderGroup({ restaurant, items, nextDelay }) {
  const { isMobile } = useLayout();
  const { actions } = useOrder();
  const iconSize = isMobile ? 13 : 14;
  return (
    <>
      <span className={clsx(styles.restaurant, styles.write)} style={nextDelay()}>
        {restaurant.name}
      </span>
      {items.map(({ dish, qty, lineTotal }) => (
        <span key={dish.id} className={clsx(styles.item, styles.write)} style={nextDelay()}>
          <span className={styles.dishName}>{dish.name}</span>
          <span className={styles.itemControls}>
            <span className={styles.stepper}>
              <button
                type="button"
                onClick={() => actions.setQuantity(dish.id, qty - 1)}
                aria-label={`Remove one ${dish.name}`}
                className={`${styles.step} btn-light`}
              >
                <Icon name="minus" size={iconSize} color="var(--color-ink)" />
              </button>
              <span className={styles.quantity}>{qty}</span>
              <button
                type="button"
                onClick={() => actions.setQuantity(dish.id, qty + 1)}
                aria-label={`Add one more ${dish.name}`}
                className={`${styles.step} btn-light`}
              >
                <Icon name="plus" size={iconSize} color="var(--color-ink)" />
              </button>
            </span>
            <span className={styles.price}>{formatRupees(lineTotal)}</span>
          </span>
        </span>
      ))}
    </>
  );
}
