import { BRAND } from '@/config/site';
import { useLayout } from '@/context/layout';
import { useOrder } from '@/context/order';
import { formatIndianPhone, formatUpiRef } from '@/lib/checkout';
import { formatRupees } from '@/lib/format';
import { OrderCharges } from './OrderCharges';
import { TORN_EDGE_DESKTOP, TORN_EDGE_MOBILE } from './tornEdge';
import styles from './OrderSlip.module.css';

// After "Confirm payment": the order tears off the notepad as the bill, which the customer saves and sends on
// WhatsApp. Shows the generated bill photo; if the browser could not draw it, the same bill is shown as a page.
export function OrderSlip() {
  const { isMobile } = useLayout();
  const { state } = useOrder();
  const { photoUrl } = state.sentOrder;

  return (
    <div aria-label="Your bill" className={styles.slip}>
      {photoUrl ? (
        <img
          src={photoUrl}
          alt={
            isMobile
              ? 'Your bill. Press and hold to save it.'
              : 'Your bill. Press and hold, or right-click, to save it.'
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
  const { state, summary } = useOrder();
  const { customer, sentOrder } = state;
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
          <span className={styles.eyebrow}>Hungrr · Order bill · {state.orderId}</span>
          <span className={styles.title}>Your order</span>
          <span className={styles.meta}>
            <span>
              {customer.name} · {formatIndianPhone(customer.phone)}
            </span>
            <span>{sentOrder.timestamp}</span>
          </span>
          <span className={styles.address}>Deliver to: {customer.address}</span>
          <div className={styles.lines}>
            {summary.lines.map(({ restaurant, items }) => (
              <SlipGroup key={restaurant.id} restaurant={restaurant} items={items} />
            ))}
          </div>
          <OrderCharges summary={summary} variant="slip" />
          <span className={styles.paid}>Paid by UPI · {formatRupees(summary.grandTotal)}</span>
          <span className={styles.upiRef}>UPI ref no. {formatUpiRef(sentOrder.upiRef)}</span>
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
