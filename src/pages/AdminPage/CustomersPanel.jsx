import { useState } from 'react';
import { formatIndianPhone, normalizePhone } from '@/lib/checkout';
import { formatRupees, timeAgo } from '@/lib/format';
import { memberSince } from '@/lib/account';
import { Icon } from '@/components/ui/Icon/Icon';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import a from './admin.module.css';
import styles from './CustomersPanel.module.css';

// Customers: look someone up by phone number to see their account and orders, and reset a forgotten PIN or
// unlock an account after 5 wrong PINs (instead of clearing cells in the Users tab).
export function CustomersPanel({ call }) {
  const [phone, setPhone] = useState('');
  const [result, setResult] = useState(null);
  const [state, setState] = useState({ busy: '', problem: '', done: '' });

  const look = async (event) => {
    event?.preventDefault();
    const number = normalizePhone(phone);
    if (!number) {
      setState({ busy: '', problem: 'Enter a 10-digit mobile number.', done: '' });
      return;
    }
    setState({ busy: 'look', problem: '', done: '' });
    const res = await call('customer', { phone: number });
    setResult(res.ok ? res : null);
    setState({ busy: '', problem: res.ok ? '' : "Couldn't look that up. Try again.", done: '' });
  };

  const act = async (what, confirmText, done) => {
    if (!window.confirm(confirmText)) return;
    setState({ busy: what, problem: '', done: '' });
    const res = await call('customer_set', { phone: result.phone, do: what });
    const again = await call('customer', { phone: result.phone });
    if (again.ok) setResult(again);
    setState({ busy: '', problem: res.ok ? '' : "Didn't work. Try again.", done: res.ok ? done : '' });
  };

  const acc = result?.account;
  return (
    <div className={styles.layout}>
      <form onSubmit={look} className={styles.search}>
        <h2 className={a.panelTitle}>Find a customer</h2>
        <p className={a.panelNote}>By the phone number they order with.</p>
        <div className={styles.searchRow}>
          <span className={styles.prefix}>+91</span>
          <input
            type="tel"
            inputMode="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            placeholder="10-digit mobile number"
            aria-label="Phone number"
            className={`${a.input} ${styles.phoneInput}`}
          />
          <button
            type="submit"
            aria-busy={state.busy === 'look' || undefined}
            className={`${a.button} ${a.primary} btn-black`}
          >
            {state.busy === 'look' ? (
              <Spinner size={16} color="var(--color-yellow)" />
            ) : (
              <Icon name="search" size={16} color="var(--color-yellow)" />
            )}
            Look up
          </button>
        </div>
        {state.problem && <p className={a.problem}>{state.problem}</p>}
      </form>

      {result && (
        <div className={styles.result}>
          <section className={styles.card}>
            <span className={styles.cardPhone}>{formatIndianPhone(result.phone)}</span>
            {acc ? (
              <>
                <span className={styles.cardName}>{acc.name}</span>
                <dl className={styles.facts}>
                  <div>
                    <dt>Account since</dt>
                    <dd>{memberSince(acc.since) || '—'}</dd>
                  </div>
                  <div>
                    <dt>Last signed in</dt>
                    <dd>{acc.last_sign_in_at ? timeAgo(new Date(acc.last_sign_in_at)) : '—'}</dd>
                  </div>
                  <div>
                    <dt>PIN</dt>
                    <dd>{acc.has_pin ? 'Set' : 'Reset: they pick a new one at their next sign-in'}</dd>
                  </div>
                  <div>
                    <dt>Sign-in</dt>
                    <dd>
                      {acc.locked_minutes
                        ? `Locked for ${acc.locked_minutes} more min (5 wrong PINs)`
                        : acc.failed_tries
                          ? `${acc.failed_tries} wrong PIN${acc.failed_tries === 1 ? '' : 's'} in a row`
                          : 'OK'}
                    </dd>
                  </div>
                </dl>
                <div className={styles.cardActions}>
                  <button
                    type="button"
                    onClick={() =>
                      act(
                        'reset_pin',
                        `Reset ${acc.name}'s PIN? Only do this after checking it's really them (for example, they messaged from this number). They'll pick a new PIN at their next sign-in, and every device they're signed in on is signed out.`,
                        'PIN reset. Ask them to sign in now and pick a new one.',
                      )
                    }
                    className={`${a.button} ${a.small} ${a.yellow} btn-yellow`}
                  >
                    Reset PIN
                  </button>
                  {(acc.locked_minutes > 0 || acc.failed_tries > 0) && (
                    <button
                      type="button"
                      onClick={() => act('unlock', `Unlock ${acc.name}'s account now?`, 'Unlocked.')}
                      className={`${a.button} ${a.small} btn-ghost ${styles.ghost}`}
                    >
                      Unlock
                    </button>
                  )}
                </div>
                {state.done && <p className={styles.done}>{state.done}</p>}
              </>
            ) : (
              <p className={styles.noAccount}>
                No account with this number. Their orders (if any) are below.
              </p>
            )}
          </section>
          <section className={styles.orders} aria-label="Orders">
            <h3 className={styles.ordersTitle}>Orders ({result.orders.length})</h3>
            {result.orders.length ? (
              <ul className={styles.orderList}>
                {result.orders.map((o) => (
                  <li key={o.order_id} className={styles.order}>
                    <span className={styles.orderId}>{o.order_id}</span>
                    <span className={styles.orderWhat}>{o.restaurants}</span>
                    <span className={styles.orderStatus}>{o.status}</span>
                    <span className={styles.orderTotal}>{formatRupees(o.grand_total)}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className={a.empty}>No orders with this number.</p>
            )}
          </section>
        </div>
      )}
    </div>
  );
}
