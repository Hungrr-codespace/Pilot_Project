import { useState } from 'react';
import clsx from 'clsx';
import { formatRupees } from '@/lib/format';
import { useStaffData } from '@/features/staff/useStaff';
import { RefreshButton } from './RefreshButton';
import a from './admin.module.css';
import styles from './NumbersPanel.module.css';

// Numbers, written up like a restaurant's day book: orders, money taken, average order, discounts, customers
// (and how many came back), cancelled orders; the top dishes; and the food value per restaurant (dishes at menu
// prices, for settling up). Paid orders only; today or the last 7 days, Indian time.
export function NumbersPanel({ call }) {
  const [days, setDays] = useState(1);
  return <Book key={days} days={days} setDays={setDays} call={call} />;
}

function Book({ days, setDays, call }) {
  const stats = useStaffData(call, 'stats', { days });
  const s = stats.data;
  return (
    <>
      <div className={a.panelHead}>
        <div>
          <h2 className={a.panelTitle}>Day book</h2>
          <p className={a.panelNote}>Paid orders (and later), not counting cancelled ones.</p>
        </div>
        <div className={styles.controls}>
          <div role="radiogroup" aria-label="Period" className={styles.toggle}>
            {[
              [1, 'Today'],
              [7, 'Last 7 days'],
            ].map(([d, label]) => (
              <button
                key={d}
                type="button"
                role="radio"
                aria-checked={days === d ? 'true' : 'false'}
                onClick={() => setDays(d)}
                className={clsx(styles.toggleButton, days === d && styles.toggleOn)}
              >
                {label}
              </button>
            ))}
          </div>
          <RefreshButton at={stats.at} onRefresh={() => stats.load({ quiet: true })} />
        </div>
      </div>
      {stats.phase === 'loading' && <div className={a.loading} />}
      {stats.phase === 'failed' && (
        <p className={a.problem}>The numbers couldn&apos;t load. Refresh to try again.</p>
      )}
      {s && (
        <div className={styles.layout}>
          <section className={styles.book} aria-label="Totals">
            <Row label="Orders" value={s.orders} />
            <Row label="Money taken" value={formatRupees(s.revenue)} big />
            <Row label="Average order" value={formatRupees(s.average)} />
            <Row label="Discounts given" value={formatRupees(s.discounts)} />
            <Row label="Customers" value={`${s.customers}${s.customers ? ` (${s.repeat} came back)` : ''}`} />
            <Row label="Cancelled" value={s.cancelled} />
            <Row label="Payments to verify now" value={s.to_verify} warn={s.to_verify > 0} />
          </section>
          <div className={styles.side}>
            <section className={styles.list} aria-labelledby="top-dishes">
              <h3 id="top-dishes" className={styles.listTitle}>
                Top dishes
              </h3>
              {s.top_dishes.length ? (
                <ol className={styles.ranks}>
                  {s.top_dishes.map((d) => (
                    <li key={d.dish} className={styles.rank}>
                      <span className={styles.rankName}>
                        {d.dish}
                        <span className={styles.rankMeta}>{d.restaurant}</span>
                      </span>
                      <span className={styles.rankValue}>× {d.qty}</span>
                    </li>
                  ))}
                </ol>
              ) : (
                <p className={styles.none}>No orders yet.</p>
              )}
            </section>
            <section className={styles.list} aria-labelledby="by-restaurant">
              <h3 id="by-restaurant" className={styles.listTitle}>
                Food value by restaurant
              </h3>
              <p className={styles.listNote}>Dishes at menu prices, before GST, delivery and discounts.</p>
              {s.food_by_restaurant.length ? (
                <ul className={styles.ranks}>
                  {s.food_by_restaurant.map((r) => (
                    <li key={r.restaurant} className={styles.rank}>
                      <span className={styles.rankName}>{r.restaurant}</span>
                      <span className={styles.rankValue}>{formatRupees(r.amount)}</span>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className={styles.none}>No orders yet.</p>
              )}
            </section>
          </div>
        </div>
      )}
    </>
  );
}

function Row({ label, value, big = false, warn = false }) {
  return (
    <div className={clsx(styles.row, big && styles.rowBig, warn && styles.rowWarn)}>
      <span className={styles.rowLabel}>{label}</span>
      <span aria-hidden="true" className={styles.leader} />
      <span className={styles.rowValue}>{value}</span>
    </div>
  );
}
