import clsx from 'clsx';
import { Link } from 'react-router';
import { ROUTES } from '@/config/site';
import { useLayout } from '@/context/layout';
import { useMenu } from '@/context/menu';
import { formatRupees, formatTimestamp, plural, timeAgo } from '@/lib/format';
import { TRACK_STEPS, trackStepIndex } from '@/lib/tracking';
import { whatsappLink } from '@/lib/whatsapp';
import { Icon } from '@/components/ui/Icon/Icon';
import { ExternalLink } from '@/components/ui/ExternalLink/ExternalLink';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import styles from './TrackResult.module.css';

const toDate = (value) => {
  const date = value ? new Date(value) : null;
  return date && !Number.isNaN(date.getTime()) ? date : null;
};

// The right-hand panel: what to do (before searching), the search in progress, the order's steps, or why it
// could not be shown.
// `refresh` is the tracker: { refresh, refreshing, refreshNote, refreshCount }.
export function TrackResult({ phase, order, checkedAt, refresh }) {
  if (phase === 'found' && order)
    return <OrderStatus order={order} checkedAt={checkedAt} refresh={refresh} />;
  if (phase === 'not_found') {
    return (
      <Message icon="search" title="We couldn't find that order">
        Check the order ID on your bill (it starts with HG) and use the phone number you ordered with.
      </Message>
    );
  }
  if (phase === 'unavailable') {
    return (
      <Message icon="clock" title="Tracking isn't available right now" withHelp>
        Message us on WhatsApp with your order ID and we&apos;ll tell you where your food is.
      </Message>
    );
  }
  return <Journey isLoading={phase === 'loading'} />;
}

// Before searching (and while searching): a little road from the rider to the campus.
function Journey({ isLoading }) {
  const { isMobile } = useLayout();
  return (
    <div className={clsx(styles.panel, styles.empty)} aria-live="polite">
      <div aria-hidden="true" className={clsx(styles.road, isLoading && styles.roadMoving)}>
        <span className={styles.roadStart}>
          <Icon name="moped" size={isMobile ? 20 : 28} color="var(--color-black)" />
        </span>
        <span className={styles.roadLine} />
        <span className={styles.roadEnd}>
          <Icon name="school" size={isMobile ? 20 : 28} color="var(--color-black)" />
        </span>
      </div>
      <h2 className={styles.emptyTitle}>
        {isLoading ? 'Finding your order…' : 'Your order’s journey shows here'}
      </h2>
      <p className={styles.emptyText}>
        {isLoading
          ? 'Checking the order ID and phone number with our order sheet.'
          : 'Enter your order ID and phone number to see each step: payment check, the restaurants cooking, and the ride to your door.'}
      </p>
    </div>
  );
}

function Message({ icon, title, withHelp, children }) {
  const { isMobile } = useLayout();
  return (
    <div className={clsx(styles.panel, styles.message)} role="status">
      <span className={styles.messageIcon}>
        <Icon name={icon} size={isMobile ? 22 : 30} color="var(--color-black)" />
      </span>
      <h2 className={styles.emptyTitle}>{title}</h2>
      <p className={styles.emptyText}>{children}</p>
      {withHelp && <HelpButton />}
    </div>
  );
}

function HelpButton({ orderId }) {
  const { isMobile } = useLayout();
  const { settings } = useMenu();
  const text = orderId
    ? `Hi Hungrr! I have a question about my order ${orderId}.`
    : 'Hi Hungrr! Where is my order?';
  return (
    <ExternalLink href={whatsappLink(settings.whatsapp, text)} className={`${styles.help} btn-yellow`}>
      <span className={styles.helpIcon}>
        <Icon name="whatsapp" size={isMobile ? 18 : 22} color="var(--color-yellow)" />
      </span>
      Message us on WhatsApp
    </ExternalLink>
  );
}

// Shows a spinner while checking, then says "Up to date" (or "Try again") for a moment.
function RefreshButton({ refresh, refreshing, refreshNote }) {
  const { isMobile } = useLayout();
  const size = isMobile ? 16 : 18;
  let icon = <Icon name="refresh" size={size} color="currentColor" />;
  let label = 'Refresh';
  if (refreshing) {
    icon = <Spinner size={size} />;
    label = 'Refreshing…';
  } else if (refreshNote === 'done') {
    icon = <Icon name="check" size={size} color="currentColor" />;
    label = 'Up to date';
  } else if (refreshNote === 'failed') label = 'Try again';
  return (
    <button
      type="button"
      onClick={refresh}
      disabled={refreshing}
      aria-busy={refreshing || undefined}
      className={clsx(
        styles.refresh,
        !refreshing && refreshNote !== 'done' && 'btn-light',
        refreshing && styles.refreshing,
        refreshNote === 'done' && styles.refreshDone,
      )}
    >
      {icon}
      <span aria-live="polite">{label}</span>
    </button>
  );
}

function OrderStatus({ order, checkedAt, refresh }) {
  const { isMobile } = useLayout();
  const current = trackStepIndex(order.status);
  const isCancelled = current === -1;
  const placed = toDate(order.created_at);
  const updated = toDate(order.status_at) || toDate(order.paid_at) || placed;
  const items = Array.isArray(order.items) ? order.items : [];
  const itemCount = items.reduce((n, item) => n + (Number(item.qty) || 0), 0);

  return (
    <div className={clsx(styles.panel, styles.order)} aria-live="polite">
      {/* A quick yellow flash over the card after each refresh: the order is up to date */}
      {refresh.refreshCount > 0 && (
        <span key={refresh.refreshCount} aria-hidden="true" className={styles.flash} />
      )}
      <div className={styles.head}>
        <span className={styles.headText}>
          <span className={styles.eyebrow}>Order</span>
          <span className={styles.orderId}>{order.order_id}</span>
          {placed && <span className={styles.placed}>Placed {formatTimestamp(placed)}</span>}
        </span>
        <span className={clsx(styles.badge, isCancelled && styles.badgeCancelled)}>
          {isCancelled ? 'Cancelled' : TRACK_STEPS[current].title}
        </span>
      </div>

      {isCancelled ? (
        <div className={styles.cancelled}>
          <strong>This order was cancelled.</strong> If you paid for it, you&apos;ll get your money back as
          our <Link to={ROUTES.refunds}>Refund &amp; Cancellation Policy</Link> explains. Message us if you
          have any questions.
        </div>
      ) : (
        <ol className={styles.steps}>
          {TRACK_STEPS.map((step, i) => {
            const status = i < current ? 'done' : i === current ? 'current' : 'next';
            return (
              <li
                key={step.status}
                className={clsx(styles.step, styles[status])}
                aria-current={status === 'current' ? 'step' : undefined}
              >
                <span className={styles.marker}>
                  {status === 'done' ? (
                    <Icon name="check" size={isMobile ? 14 : 18} color="var(--color-black)" />
                  ) : (
                    i + 1
                  )}
                </span>
                <span className={styles.stepText}>
                  <span className={styles.stepTitle}>{step.title}</span>
                  {status === 'current' && <span className={styles.stepDetail}>{step.text}</span>}
                  {status === 'current' && updated && (
                    <span className={styles.stepTime}>Updated {timeAgo(updated)}</span>
                  )}
                </span>
              </li>
            );
          })}
        </ol>
      )}

      <div className={styles.summary}>
        <span className={styles.summaryLabel}>Your order</span>
        <ul className={styles.items}>
          {items.map((item, i) => (
            <li key={`${item.dish}-${i}`} className={styles.item}>
              <span className={styles.qty}>{item.qty} ×</span>
              <span className={styles.dish}>
                {item.dish}
                <span className={styles.restaurant}>{item.restaurant}</span>
              </span>
            </li>
          ))}
        </ul>
        <div className={styles.total}>
          <span>
            Grand total{' '}
            <span className={styles.totalNote}>({plural(itemCount, 'item')}, GST and delivery)</span>
          </span>
          <strong>{formatRupees(Number(order.grand_total) || 0)}</strong>
        </div>
      </div>

      {(isCancelled || current === TRACK_STEPS.length - 1) && (
        <div className={styles.rate}>
          <span className={styles.rateText}>
            <strong>{isCancelled ? 'Tell us what went wrong' : 'How was it?'}</strong>
            {isCancelled
              ? 'Your feedback helps us fix it for the next order.'
              : 'It takes a minute, and it helps us choose what comes next.'}
          </span>
          <Link
            to={`${ROUTES.feedback}?order=${order.order_id}`}
            className={`${styles.rateButton} btn-black`}
          >
            <Icon name="star" size={isMobile ? 18 : 20} color="var(--color-yellow)" />
            Rate your order
          </Link>
        </div>
      )}

      <div className={styles.foot}>
        <span className={styles.checked}>
          {refresh.refreshNote === 'failed'
            ? "Couldn't reach us just now. Try again in a moment."
            : `${checkedAt ? `Checked ${timeAgo(new Date(checkedAt))}. ` : ''}This page checks again every minute.`}
        </span>
        <span className={styles.footActions}>
          <RefreshButton {...refresh} />
          <HelpButton orderId={order.order_id} />
        </span>
      </div>
    </div>
  );
}
