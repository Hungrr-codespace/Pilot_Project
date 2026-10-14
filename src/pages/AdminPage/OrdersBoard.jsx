import { useState } from 'react';
import clsx from 'clsx';
import { useLayout } from '@/context/layout';
import { formatIndianPhone } from '@/lib/checkout';
import { formatRupees, plural, timeAgo } from '@/lib/format';
import { BOARD_COLUMNS, NEXT_STEP, boardColumn, customerUpdate, groupDigits } from '@/lib/staff';
import { whatsappLink } from '@/lib/whatsapp';
import { Icon } from '@/components/ui/Icon/Icon';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { ExternalLink } from '@/components/ui/ExternalLink/ExternalLink';
import { usePolling, useStaffData } from '@/features/staff/useStaff';
import { RefreshButton } from './RefreshButton';
import a from './admin.module.css';
import styles from './OrdersBoard.module.css';

const REFRESH_MS = 20000;

// The order board: every order in progress (and today's finished ones) as a kitchen ticket, in a column per
// status. One tap moves an order to its next status; riders are assigned from the ticket; "Update" opens
// WhatsApp with a message for the customer. Refreshes every 20 seconds.
export function OrdersBoard({ call }) {
  const { isMobile } = useLayout();
  const board = useStaffData(call, 'board');
  usePolling(board.load, REFRESH_MS);
  const [column, setColumn] = useState('Payment to verify');

  if (board.phase === 'loading') return <div className={a.loading} />;
  if (board.phase === 'failed')
    return <p className={a.problem}>The board couldn&apos;t load. Check the internet and refresh.</p>;

  const orders = board.data.orders || [];
  const riders = board.data.riders || [];
  const byColumn = Object.fromEntries(BOARD_COLUMNS.map((c) => [c.status, []]));
  orders.forEach((o) => byColumn[boardColumn(o.status)]?.push(o));
  // Oldest first in the working columns, newest first in "Done today"
  BOARD_COLUMNS.slice(0, 4).forEach((c) => byColumn[c.status].reverse());

  const head = (
    <div className={a.panelHead}>
      <div>
        <h2 className={a.panelTitle}>Orders</h2>
        <p className={a.panelNote}>
          {plural(byColumn['Payment to verify'].length, 'payment')} to verify ·{' '}
          {riders.length ? plural(riders.length, 'rider') : 'No riders on the Staff tab yet'}
        </p>
      </div>
      <RefreshButton at={board.at} onRefresh={() => board.load({ quiet: true })} />
    </div>
  );

  if (isMobile) {
    const list = byColumn[column];
    return (
      <>
        {head}
        <div className={styles.chips} role="tablist" aria-label="Order status">
          {BOARD_COLUMNS.map((c) => (
            <button
              key={c.status}
              type="button"
              role="tab"
              aria-selected={column === c.status ? 'true' : 'false'}
              onClick={() => setColumn(c.status)}
              className={clsx(
                styles.chip,
                column === c.status ? 'btn-black' : 'btn-light',
                column === c.status && styles.chipOn,
              )}
            >
              {c.title}
              <span className={styles.chipCount}>{byColumn[c.status].length}</span>
            </button>
          ))}
        </div>
        <div className={styles.list}>
          {list.length ? (
            list.map((o) => (
              <Ticket key={o.order_id} order={o} riders={riders} call={call} reload={board.load} />
            ))
          ) : (
            <p className={a.empty}>Nothing here right now.</p>
          )}
        </div>
      </>
    );
  }

  return (
    <>
      {head}
      <div className={styles.rail}>
        {BOARD_COLUMNS.map((c) => (
          <section key={c.status} className={styles.column} aria-label={c.title}>
            <header className={styles.columnHead}>
              <span className={styles.columnTitle}>{c.title}</span>
              <span className={styles.columnCount}>{byColumn[c.status].length}</span>
              <span className={styles.columnHint}>{c.hint}</span>
            </header>
            {byColumn[c.status].map((o) => (
              <Ticket key={o.order_id} order={o} riders={riders} call={call} reload={board.load} />
            ))}
            {!byColumn[c.status].length && <span className={styles.none}>None</span>}
          </section>
        ))}
      </div>
    </>
  );
}

// One order as a kitchen ticket
function Ticket({ order, riders, call, reload }) {
  const { isMobile } = useLayout();
  const [busy, setBusy] = useState('');
  const [problem, setProblem] = useState('');
  const next = NEXT_STEP[order.status];
  const restaurants = [...new Set(order.items.map((i) => i.restaurant))];
  const readyBy = (name) => order.items.filter((i) => i.restaurant === name).every((i) => i.ready);
  const canAssign = ['Paid', 'Preparing', 'Out for delivery'].includes(order.status);
  const finished = order.status === 'Delivered' || order.status === 'Cancelled';

  const run = async (key, op, extra) => {
    setBusy(key);
    setProblem('');
    const res = await call(op, { order_id: order.order_id, ...extra });
    if (!res.ok) setProblem("Didn't save. Try again.");
    await reload({ quiet: true });
    setBusy('');
  };
  const cancel = () => {
    if (window.confirm(`Cancel order ${order.order_id}? Refund the customer as the refund policy says.`)) {
      run('cancel', 'set_status', { status: 'Cancelled' });
    }
  };

  const update = whatsappLink(`91${order.phone}`, customerUpdate(order, window.location.origin));
  return (
    <article
      className={clsx(
        styles.ticket,
        finished && styles.ticketDone,
        order.total_check.startsWith('CHECK') && styles.ticketCheck,
      )}
    >
      <div className={styles.ticketTop}>
        <span className={styles.orderId}>{order.order_id}</span>
        <span className={styles.age}>{timeAgo(new Date(order.created_at))}</span>
      </div>
      <div className={styles.customer}>
        <span className={styles.name}>{order.customer_name || 'Customer'}</span>
        {order.phone && (
          <a href={`tel:+91${order.phone}`} className={styles.phone}>
            {formatIndianPhone(order.phone)}
          </a>
        )}
        <span className={styles.address}>{order.address}</span>
      </div>
      <ul className={styles.items}>
        {restaurants.map((name) => (
          <li key={name} className={styles.group}>
            <span className={styles.restaurant}>
              {name}
              {readyBy(name) && !finished && <span className={styles.ready}>Ready</span>}
            </span>
            {order.items
              .filter((i) => i.restaurant === name)
              .map((i, k) => (
                <span key={k} className={styles.item}>
                  {i.qty} × {i.dish}
                </span>
              ))}
          </li>
        ))}
      </ul>
      <div className={styles.money}>
        <span className={styles.total}>{formatRupees(order.grand_total)}</span>
        {order.discount > 0 && (
          <span className={styles.deal}>
            {order.coupon} −{formatRupees(order.discount)}
          </span>
        )}
      </div>
      {order.status === 'Payment to verify' && (
        <span className={styles.upi}>
          UPI ref <b>{groupDigits(order.upi_ref) || '—'}</b>
        </span>
      )}
      {order.total_check.startsWith('CHECK') && <span className={styles.warn}>{order.total_check}</span>}
      {order.notes && <span className={styles.notes}>{order.notes}</span>}
      {order.status === 'Cancelled' && <span className={styles.cancelled}>Cancelled</span>}

      {canAssign && (
        <label className={styles.riderRow}>
          <Icon name="moped" size={isMobile ? 16 : 18} color="var(--color-black)" />
          <select
            value={order.rider}
            onChange={(event) => run('rider', 'assign_rider', { rider: event.target.value })}
            disabled={busy === 'rider'}
            aria-label={`Rider for ${order.order_id}`}
            className={styles.riderSelect}
          >
            <option value="">No rider yet</option>
            {riders.map((r) => (
              <option key={r.phone} value={r.phone}>
                {r.name}
              </option>
            ))}
          </select>
        </label>
      )}

      <div className={styles.actions}>
        {next && (
          <button
            type="button"
            onClick={() => run('next', 'set_status', { status: next.status })}
            aria-busy={busy === 'next' || undefined}
            className={`${a.button} ${a.small} ${a.primary} btn-black ${styles.next}`}
          >
            {busy === 'next' ? (
              <Spinner size={14} color="var(--color-yellow)" />
            ) : (
              <Icon name="check" size={15} color="var(--color-yellow)" />
            )}
            {next.label}
          </button>
        )}
        <ExternalLink
          href={update}
          className={`${a.button} ${a.small} btn-light`}
          aria-label={`WhatsApp ${order.customer_name}`}
        >
          <Icon name="whatsapp" size={15} color="var(--color-black)" />
          Update
        </ExternalLink>
        {!finished && (
          <button type="button" onClick={cancel} className={`${a.textButton} ${a.danger}`}>
            Cancel
          </button>
        )}
      </div>
      {problem && <span className={styles.warn}>{problem}</span>}
    </article>
  );
}
