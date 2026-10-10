import { BRAND } from '@/config/site';
import { useLayout } from '@/context/layout';
import { useMenu } from '@/context/menu';
import { useOrder } from '@/context/order';
import { formatRupees } from '@/lib/format';
import { OrderCharges } from './OrderCharges';
import { TORN_EDGE_DESKTOP, TORN_EDGE_MOBILE } from './tornEdge';
import styles from './OrderSlip.module.css';

// After "Paid?": the order tears off the notepad as a photo the customer can save and send on WhatsApp.
// Shows the generated photo; if the browser could not draw it, the same summary is shown as a page.
export function OrderSlip() {
  const { isMobile } = useLayout();
  const { state } = useOrder();
  const { photoUrl } = state.sentOrder;

  return (
    <div aria-label="Order summary photo" className={styles.slip}>
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={
            isMobile
              ? 'Your order summary photo. Press and hold to save it.'
              : 'Your order summary photo. Press and hold, or right-click, to save it.'
          }
          className={styles.photo}
        />
      ) : (
        <SlipPage />
      )}
    </div>
  );
}

function SlipPage() {
  const { isMobile } = useLayout();
  const { settings } = useMenu();
  const { state, summary } = useOrder();
  const edge = isMobile ? TORN_EDGE_MOBILE : TORN_EDGE_DESKTOP;

  return (
    <>
      <svg
        width={edge.width}
        height={edge.height}
        viewBox={`0 0 ${edge.width} ${edge.height}`}
        aria-hidden="true"
        className={styles.edge}
      >
        <path d={edge.d} fill="#FFFEF4" />
      </svg>
      <div className={styles.paper}>
        <div aria-hidden="true" className={styles.margin} />
        <div className={styles.body}>
          <span className={styles.eyebrow}>Hungrr · Order summary</span>
          <span className={styles.title}>Your order</span>
          <span className={styles.meta}>
            <span>Deliver to: {settings.deliverTo}</span>
            <span>{state.sentOrder.timestamp}</span>
          </span>
          <div className={styles.lines}>
            {summary.lines.map(({ restaurant, items }) => (
              <SlipGroup key={restaurant.id} restaurant={restaurant} items={items} />
            ))}
          </div>
          <OrderCharges summary={summary} variant="slip" />
          <span className={styles.paid}>Paid by UPI · {formatRupees(summary.grandTotal)}</span>
        </div>
        <span className={styles.footer}>hungrr · {BRAND.tagline}</span>
      </div>
    </>
  );
}

function SlipGroup({ restaurant, items }) {
  return (
    <>
      <span className={styles.restaurant}>{restaurant.name}</span>
      {items.map(({ dish, qty, lineTotal }) => (
        <span key={dish.id} className={styles.item}>
          <span className={styles.itemName}>
            {qty} × {dish.name}
          </span>
          <span className={styles.itemPrice}>{formatRupees(lineTotal)}</span>
        </span>
      ))}
    </>
  );
}
