import { useState } from 'react';
import { Link } from 'react-router';
import clsx from 'clsx';
import { ROUTES } from '@/config/site';
import { useAccount } from '@/context/account';
import { useLayout } from '@/context/layout';
import { canRate, khataTotals } from '@/lib/account';
import { formatRupees, plural } from '@/lib/format';
import { TRACK_STEPS, normalizeOrderId } from '@/lib/tracking';
import { claimOrder } from '@/services/accountApi';
import { Icon } from '@/components/ui/Icon/Icon';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { TextField } from '@/components/ui/TextField/TextField';
import styles from './KhataLedger.module.css';

const IST = 'Asia/Kolkata';
const day = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: IST });
};
const time = (iso) => {
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? ''
    : d
        .toLocaleTimeString('en-IN', { hour: 'numeric', minute: '2-digit', hour12: true, timeZone: IST })
        .toUpperCase();
};

// The status as the tracking page names it ("Being prepared", "On the way"…), and its colour.
function statusOf(status) {
  const s = String(status || '').trim();
  if (s.toLowerCase() === 'cancelled') return { label: 'Cancelled', tone: 'cancelled' };
  const step = TRACK_STEPS.find((x) => x.status.toLowerCase() === s.toLowerCase());
  if (s === 'Delivered') return { label: 'Delivered', tone: 'done' };
  return { label: step ? step.title : s || 'Placed', tone: 'active' };
}

const REVIEW_STATE = {
  shown: 'Your review is shown in Pilot reviews on our website.',
  waiting: 'Our team checks your review before it shows on the website.',
  private: 'Only our team sees this review.',
  not_shown: 'This review is not shown on the website.',
};

// The khata itself: a ledger page with one line per order (date, order, amount, status), opening to show the
// dishes, the charges, and Track / Rate. A double rule and the total paid close the page.
export function KhataLedger({ khata }) {
  const { isMobile } = useLayout();
  const [openId, setOpenId] = useState('');
  const [refreshing, setRefreshing] = useState(false);
  const { phase, orders, unclaimed } = khata;

  const refresh = async () => {
    if (refreshing) return;
    setRefreshing(true);
    await khata.reload({ quiet: true });
    setRefreshing(false);
  };

  const totals = khataTotals(orders);
  return (
    <section className={styles.area} aria-labelledby="khata-orders">
      <div className={styles.toolbar}>
        <h2 id="khata-orders" className={styles.heading}>
          Your orders
        </h2>
        {phase === 'ready' && (
          <button
            type="button"
            onClick={refresh}
            aria-busy={refreshing || undefined}
            className={`${styles.refresh} btn-light`}
          >
            {refreshing ? (
              <Spinner size={isMobile ? 16 : 18} color="var(--color-black)" />
            ) : (
              <Icon name="refresh" size={isMobile ? 16 : 18} color="var(--color-black)" />
            )}
            {refreshing ? 'Refreshing…' : 'Refresh'}
          </button>
        )}
      </div>

      <div className={styles.ledger}>
        <div aria-hidden="true" className={styles.binding}>
          <span className={styles.stitch} />
        </div>

        {!isMobile && (
          <div aria-hidden="true" className={styles.head}>
            <span>Date</span>
            <span>Order</span>
            <span className={styles.right}>Amount</span>
            <span>Status</span>
            <span />
          </div>
        )}

        {phase === 'loading' && <LoadingLines />}

        {phase === 'failed' && (
          <div className={styles.message}>
            <p>Your khata couldn&apos;t be opened just now. Check your internet and try again.</p>
            <button type="button" onClick={() => khata.reload()} className={`${styles.retry} btn-light`}>
              <Icon name="refresh" size={18} color="var(--color-black)" />
              Try again
            </button>
          </div>
        )}

        {phase === 'ready' && !orders.length && (
          <div className={styles.empty}>
            <p className={styles.emptyLine}>Your first order will be written here.</p>
            <span className={styles.blankLine} />
            <span className={styles.blankLine} />
          </div>
        )}

        {phase === 'ready' &&
          orders.map((order) => (
            <LedgerEntry
              key={order.order_id}
              order={order}
              open={openId === order.order_id}
              onToggle={() => setOpenId((id) => (id === order.order_id ? '' : order.order_id))}
            />
          ))}

        {phase === 'ready' && orders.length > 0 && (
          <div className={styles.total}>
            <span className={styles.totalLabel}>
              Total paid
              <span className={styles.totalNote}>
                {plural(totals.counted, 'order')}
                {totals.orders > totals.counted &&
                  `, not counting ${plural(totals.orders - totals.counted, 'cancelled order')}`}
              </span>
            </span>
            <span className={styles.totalAmount}>{formatRupees(totals.paid)}</span>
          </div>
        )}
      </div>

      {phase === 'ready' && !orders.length && (
        <Link to={ROUTES.pilot} className={`${styles.cta} btn-black`}>
          <span className={styles.ctaBadge}>
            <Icon name="cutlery" size={isMobile ? 18 : 20} color="var(--color-black)" />
          </span>
          Open the pilot menu
        </Link>
      )}

      {phase === 'ready' && (
        <ClaimOrder unclaimed={unclaimed} onAdded={() => khata.reload({ quiet: true })} />
      )}
    </section>
  );
}

function LedgerEntry({ order, open, onToggle }) {
  const { isMobile } = useLayout();
  const status = statusOf(order.status);
  const count = (order.items || []).reduce((n, item) => n + (Number(item.qty) || 0), 0);
  const rateable = canRate(order);
  const panelId = `khata-${order.order_id}`;
  return (
    <div className={clsx(styles.entry, open && styles.entryOpen)}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open ? 'true' : 'false'}
        aria-controls={panelId}
        className={`${styles.row} btn-row`}
      >
        <span className={styles.date}>
          {day(order.created_at)}
          <span className={styles.time}>{time(order.created_at)}</span>
        </span>
        <span className={styles.main}>
          <span className={styles.orderId}>{order.order_id}</span>
          <span className={styles.what}>
            {order.restaurants}
            {count > 0 && `, ${plural(count, 'item')}`}
          </span>
        </span>
        <span className={styles.amount}>{formatRupees(order.grand_total)}</span>
        <span className={styles.statusCell}>
          <span className={clsx(styles.status, styles[status.tone])}>
            <span aria-hidden="true" className={styles.dot} />
            {status.label}
          </span>
          {order.review && (
            <span className={styles.stamp}>
              Rated{' '}
              <span aria-label={`${order.review.rating} out of 5`}>{'★'.repeat(order.review.rating)}</span>
            </span>
          )}
        </span>
        {!isMobile && (
          <Icon
            name="chevronRight"
            size={24}
            color="var(--color-black)"
            className={clsx(styles.chevron, open && styles.chevronOpen)}
          />
        )}
      </button>

      {open && (
        <div id={panelId} className={styles.panel}>
          <ul className={styles.items}>
            {(order.items || []).map((item, i) => (
              <li key={`${item.dish}-${i}`} className={styles.item}>
                <span className={styles.qty}>{item.qty} ×</span>
                <span className={styles.dish}>
                  {item.dish}
                  <span className={styles.restaurant}>{item.restaurant}</span>
                </span>
                <span className={styles.lineTotal}>
                  {formatRupees(item.line_total || item.qty * item.price)}
                </span>
              </li>
            ))}
          </ul>
          <dl className={styles.charges}>
            <div>
              <dt>Items</dt>
              <dd>{formatRupees(order.item_total)}</dd>
            </div>
            <div>
              <dt>GST</dt>
              <dd>{formatRupees(order.gst)}</dd>
            </div>
            <div>
              <dt>Delivery, {plural(order.riders || 1, 'rider')}</dt>
              <dd>{formatRupees(order.delivery)}</dd>
            </div>
            <div className={styles.grand}>
              <dt>Total</dt>
              <dd>{formatRupees(order.grand_total)}</dd>
            </div>
          </dl>
          {order.review && <p className={styles.reviewNote}>{REVIEW_STATE[order.review.state]}</p>}
          <div className={styles.actions}>
            <Link to={`${ROUTES.track}?order=${order.order_id}`} className={`${styles.action} btn-light`}>
              <Icon name="moped" size={isMobile ? 18 : 20} color="var(--color-black)" />
              Track order
            </Link>
            {rateable && !order.review && (
              <Link
                to={`${ROUTES.feedback}?order=${order.order_id}`}
                className={`${styles.action} ${styles.rate} btn-yellow`}
              >
                <Icon name="star" size={isMobile ? 18 : 20} color="var(--color-black)" />
                {status.tone === 'cancelled' ? 'Tell us what went wrong' : 'Rate this order'}
              </Link>
            )}
            {order.review && (
              <Link to={`${ROUTES.feedback}?order=${order.order_id}`} className={`${styles.action} btn-soft`}>
                <Icon name="pencil" size={isMobile ? 16 : 18} color="var(--color-black)" />
                Change your review
              </Link>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function LoadingLines() {
  return (
    <div aria-busy="true" aria-label="Opening your khata" className={styles.loading}>
      {[0, 1, 2].map((i) => (
        <span key={i} className={styles.loadingLine} />
      ))}
    </div>
  );
}

// Orders placed before signing in (or before accounts existed) join the khata with the order ID on their bill.
function ClaimOrder({ unclaimed, onAdded }) {
  const { token, forgetSignIn } = useAccount();
  const [value, setValue] = useState('');
  const [error, setError] = useState('');
  const [done, setDone] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (event) => {
    event.preventDefault();
    const id = normalizeOrderId(value);
    setDone('');
    if (!id) {
      setError('Enter the order ID from your bill, like HG-261011-K7Q2.');
      return;
    }
    setBusy(true);
    const res = await claimOrder(token, id);
    setBusy(false);
    if (res.ok) {
      setValue('');
      setError('');
      setDone(res.already ? `${id} is already in your khata.` : `${id} is now in your khata.`);
      onAdded();
    } else if (res.error === 'signed_out') forgetSignIn();
    else if (res.error === 'not_found') setError('No order with this ID was placed with your phone number.');
    else if (res.error === 'not_paid')
      setError("That order wasn't paid for, so it can't go into your khata.");
    else setError("Couldn't add it just now. Try again.");
  };

  return (
    <form onSubmit={submit} noValidate className={styles.claim}>
      <div className={styles.claimText}>
        <h3 className={styles.claimTitle}>
          {unclaimed > 0 ? `${plural(unclaimed, 'earlier order')} with your number` : 'Missing an order?'}
        </h3>
        <p className={styles.claimLead}>
          {unclaimed > 0
            ? 'We found orders placed with your number before you signed in. Add each one with the order ID on its bill.'
            : 'Orders placed before you signed in can be added with the order ID on the bill.'}
        </p>
      </div>
      <div className={styles.claimRow}>
        <TextField
          label="Order ID"
          name="orderId"
          placeholder="HG-261011-K7Q2"
          autoComplete="off"
          autoCapitalize="characters"
          maxLength={20}
          value={value}
          error={error}
          hint={done || undefined}
          onChange={(event) => {
            setValue(event.target.value);
            setError('');
          }}
          className={styles.claimField}
          inputClassName={styles.claimInput}
        />
        <button type="submit" aria-busy={busy || undefined} className={`${styles.claimButton} btn-black`}>
          {busy ? (
            <Spinner size={18} color="var(--color-yellow)" />
          ) : (
            <Icon name="plus" size={20} color="var(--color-yellow)" />
          )}
          Add to my khata
        </button>
      </div>
    </form>
  );
}
