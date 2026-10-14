import { useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useAccount } from '@/context/account';
import { useLayout } from '@/context/layout';
import { plural, timeAgo } from '@/lib/format';
import { Icon } from '@/components/ui/Icon/Icon';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { Switch } from '@/components/ui/Switch/Switch';
import { StaffPage } from '@/features/staff/StaffPage';
import { usePolling, useStaff, useStaffData } from '@/features/staff/useStaff';
import { RefreshButton } from '@/pages/AdminPage/RefreshButton';
import a from '@/pages/AdminPage/admin.module.css';
import styles from './PartnerPage.module.css';

const SECTIONS = [
  { id: 'new', title: 'New', hint: 'Payment checked. Start when you begin cooking.' },
  { id: 'cooking', title: 'Preparing', hint: 'Tap Ready when it is packed.' },
  { id: 'ready', title: 'Ready for pickup', hint: 'Waiting for the rider.' },
  { id: 'gone', title: 'Picked up today', hint: '' },
];

function sectionOf(order) {
  if (order.status === 'Out for delivery' || order.status === 'Delivered') return 'gone';
  if (order.ready) return 'ready';
  return order.status === 'Paid' ? 'new' : 'cooking';
}

// The restaurant's page (/partner, for numbers listed as restaurant on the Staff tab, with their restaurant_id):
// today's orders with this restaurant's dishes, as kitchen tickets. Only orders whose payment the team has
// checked appear, and no customer details. "Start preparing" and "Ready for pickup" tell the team and the rider.
export function PartnerPage() {
  const { user } = useAccount();
  const { call, denied } = useStaff('partner');
  const role = user?.roles?.find((r) => r.role === 'restaurant');
  return (
    <StaffPage
      role="restaurant"
      title={role?.restaurant || 'Kitchen'}
      subtitle="Hungrr orders for your kitchen"
      denied={denied}
    >
      <Kitchen call={call} />
    </StaffPage>
  );
}

function Kitchen({ call }) {
  const queue = useStaffData(call, 'queue');
  usePolling(queue.load, 20000);
  const [sound, setSound] = useState(false);
  const orders = queue.data?.orders || [];
  const fresh = orders.filter((o) => sectionOf(o) === 'new').length;
  useChime(sound, fresh);

  useEffect(() => {
    const base = `${queue.data?.restaurant || 'Kitchen'} – Hungrr`;
    document.title = fresh ? `(${fresh}) ${base}` : base;
  }, [fresh, queue.data?.restaurant]);

  if (queue.phase === 'loading') return <div className={a.loading} />;
  if (queue.phase === 'failed') {
    return (
      <p className={a.problem}>
        {queue.error === 'no_restaurant'
          ? "Your number isn't linked to a restaurant yet: the team needs to fill in restaurant_id on the Staff tab."
          : "Orders couldn't load. Refresh to try again."}
      </p>
    );
  }

  return (
    <>
      <div className={a.panelHead}>
        <div>
          <h2 className={a.panelTitle}>Today&apos;s orders</h2>
          <p className={a.panelNote}>
            {fresh ? `${plural(fresh, 'new order')} to start` : 'Nothing new right now'}. Checks every 20
            seconds.
          </p>
        </div>
        <div className={styles.tools}>
          <Switch
            checked={sound}
            onChange={setSound}
            label="Sound for new orders"
            onLabel="Sound on"
            offLabel="Sound off"
          />
          <RefreshButton at={queue.at} onRefresh={() => queue.load({ quiet: true })} />
        </div>
      </div>
      <div className={styles.sections}>
        {SECTIONS.map((section) => {
          const list = orders.filter((o) => sectionOf(o) === section.id);
          if (section.id === 'gone' && !list.length) return null;
          return (
            <section
              key={section.id}
              className={clsx(styles.section, section.id === 'new' && styles.sectionNew)}
              aria-label={section.title}
            >
              <header className={styles.sectionHead}>
                <span className={styles.sectionTitle}>{section.title}</span>
                <span className={styles.sectionCount}>{list.length}</span>
                {section.hint && <span className={styles.sectionHint}>{section.hint}</span>}
              </header>
              {list.length ? (
                <div className={styles.tickets}>
                  {list.map((o) => (
                    <KitchenTicket
                      key={o.order_id}
                      order={o}
                      section={section.id}
                      call={call}
                      reload={queue.load}
                    />
                  ))}
                </div>
              ) : (
                <span className={styles.none}>None</span>
              )}
            </section>
          );
        })}
      </div>
    </>
  );
}

function KitchenTicket({ order, section, call, reload }) {
  const { isMobile } = useLayout();
  const [busy, setBusy] = useState(false);
  const act = async (op) => {
    setBusy(true);
    await call(op, { order_id: order.order_id });
    await reload({ quiet: true });
    setBusy(false);
  };
  const short = order.order_id.slice(-4);
  return (
    <article className={clsx(styles.ticket, section === 'gone' && styles.ticketGone)}>
      <div className={styles.ticketHead}>
        <span className={styles.short}>#{short}</span>
        <span className={styles.meta}>
          {order.order_id}
          <br />
          {timeAgo(new Date(order.created_at))}
        </span>
      </div>
      <ul className={styles.items}>
        {order.items.map((i, k) => (
          <li key={k} className={styles.item}>
            <span className={styles.qty}>{i.qty}</span>
            <span className={styles.dish}>{i.dish}</span>
          </li>
        ))}
      </ul>
      {order.others.length > 0 && (
        <span className={styles.others}>Same rider also collects from {order.others.join(', ')}</span>
      )}
      {order.rider_name && <span className={styles.rider}>Rider: {order.rider_name}</span>}
      {section === 'new' && (
        <button
          type="button"
          onClick={() => act('preparing')}
          aria-busy={busy || undefined}
          className={`${styles.action} btn-black`}
        >
          {busy ? (
            <Spinner size={18} color="var(--color-yellow)" />
          ) : (
            <Icon name="cloche" size={isMobile ? 18 : 20} color="var(--color-yellow)" />
          )}
          Start preparing
        </button>
      )}
      {(section === 'new' || section === 'cooking') && (
        <button
          type="button"
          onClick={() => act('ready')}
          aria-busy={busy || undefined}
          className={`${styles.action} ${styles.ready} btn-yellow`}
        >
          {busy ? (
            <Spinner size={18} color="var(--color-black)" />
          ) : (
            <Icon name="check" size={isMobile ? 18 : 20} color="var(--color-black)" />
          )}
          Ready for pickup
        </button>
      )}
      {section === 'ready' && <span className={styles.stamp}>Ready</span>}
      {section === 'gone' && (
        <span className={styles.gone}>{order.status === 'Delivered' ? 'Delivered' : 'Picked up'}</span>
      )}
    </article>
  );
}

// A short two-tone chime when a new order arrives (only after "Sound on" is tapped: browsers allow sound after
// a tap).
function useChime(enabled, count) {
  const ctx = useRef(null);
  const last = useRef(count);
  useEffect(() => {
    if (enabled && !ctx.current) {
      try {
        ctx.current = new (window.AudioContext || window.webkitAudioContext)();
      } catch {
        /* no sound */
      }
    }
  }, [enabled]);
  useEffect(() => {
    if (enabled && ctx.current && count > last.current) {
      const c = ctx.current;
      [880, 1320].forEach((freq, i) => {
        const osc = c.createOscillator();
        const gain = c.createGain();
        osc.frequency.value = freq;
        gain.gain.setValueAtTime(0.2, c.currentTime + i * 0.18);
        gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + i * 0.18 + 0.3);
        osc.connect(gain).connect(c.destination);
        osc.start(c.currentTime + i * 0.18);
        osc.stop(c.currentTime + i * 0.18 + 0.32);
      });
    }
    last.current = count;
  }, [enabled, count]);
}
