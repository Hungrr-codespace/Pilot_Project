import { useState } from 'react';
import clsx from 'clsx';
import { useLayout } from '@/context/layout';
import { formatIndianPhone } from '@/lib/checkout';
import { formatRupees, plural, timeAgo } from '@/lib/format';
import { Icon } from '@/components/ui/Icon/Icon';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { Switch } from '@/components/ui/Switch/Switch';
import { StaffPage } from '@/features/staff/StaffPage';
import { usePolling, useStaff, useStaffData } from '@/features/staff/useStaff';
import { RefreshButton } from '@/pages/AdminPage/RefreshButton';
import { useLocationSharing } from './useLocationSharing';
import a from '@/pages/AdminPage/admin.module.css';
import styles from './RiderPage.module.css';

const STATUS_TEXT = {
  off: 'Not sharing. Turn it on before you set off.',
  starting: 'Finding your location…',
  sharing: '',
  blocked:
    'Location is blocked for this site. Allow it in your browser settings, then turn sharing on again.',
  unsupported: "This browser can't share location. Try Chrome.",
  failed: "Couldn't send your location. Check your internet; it keeps trying.",
};

// The rider's page (/rider, for numbers listed as rider on the Staff tab): share live location (customers see it
// on their tracking page while their order is out for delivery), and the orders assigned to you as delivery
// slips: what to pick up where, who to deliver to, "Picked up" and "Delivered".
export function RiderPage() {
  const { call, denied } = useStaff('rider');
  return (
    <StaffPage role="rider" title="Deliveries" denied={denied} wide={false}>
      <RiderBody call={call} />
    </StaffPage>
  );
}

function RiderBody({ call }) {
  const { isMobile } = useLayout();
  const jobs = useStaffData(call, 'jobs');
  usePolling(jobs.load, 30000);
  const sharing = useLocationSharing((pos) => call('location', pos));

  const list = jobs.data?.jobs || [];
  return (
    <div className={styles.layout}>
      <section className={clsx(styles.share, sharing.on && styles.shareOn)} aria-label="Live location">
        <div className={styles.shareHead}>
          <span className={styles.shareIcon}>
            <Icon name="mapMarker" size={isMobile ? 22 : 26} color="var(--color-black)" />
          </span>
          <span className={styles.shareTitle}>Live location</span>
          <Switch
            checked={sharing.on}
            onChange={sharing.setOn}
            label="Share my location"
            onLabel="On"
            offLabel="Off"
            tone="dark"
          />
        </div>
        <p className={styles.shareText}>
          {sharing.status === 'sharing'
            ? `Sharing. Last sent ${timeAgo(new Date(sharing.sentAt))}. Customers see you on their map while their order is on the way.`
            : STATUS_TEXT[sharing.status]}
        </p>
        {sharing.on && (
          <p className={styles.shareNote}>
            Keep this page open while you deliver: the screen stays on, and closing it stops sharing.
          </p>
        )}
      </section>

      <div className={a.panelHead}>
        <div>
          <h2 className={a.panelTitle}>Your orders</h2>
          {jobs.data && (
            <p className={a.panelNote}>
              {plural(list.length, 'order')} to deliver · {jobs.data.delivered_today} delivered today
            </p>
          )}
        </div>
        <RefreshButton at={jobs.at} onRefresh={() => jobs.load({ quiet: true })} />
      </div>
      {jobs.phase === 'loading' && <div className={a.loading} />}
      {jobs.phase === 'failed' && (
        <p className={a.problem}>Your orders couldn&apos;t load. Refresh to try again.</p>
      )}
      {jobs.data && !list.length && (
        <p className={a.empty}>No orders for you right now. New ones appear here by themselves.</p>
      )}
      <div className={styles.jobs}>
        {list.map((job) => (
          <Slip key={job.order_id} job={job} call={call} reload={jobs.load} />
        ))}
      </div>
    </div>
  );
}

// One order as a delivery slip: pick up, drop, and the next step
function Slip({ job, call, reload }) {
  const { isMobile } = useLayout();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const onTheWay = job.status === 'Out for delivery';
  const groups = [...new Set(job.items.map((i) => i.restaurant))].map((name) => ({
    name,
    items: job.items.filter((i) => i.restaurant === name),
  }));
  const allReady = job.items.every((i) => i.ready);

  const step = async () => {
    const op = onTheWay ? 'delivered' : 'picked_up';
    if (
      !onTheWay &&
      !allReady &&
      !window.confirm('Not every restaurant has marked the food ready. Picked up anyway?')
    )
      return;
    setBusy(true);
    setProblem('');
    const res = await call(op, { order_id: job.order_id });
    if (!res.ok) setProblem("Didn't save. Try again.");
    await reload({ quiet: true });
    setBusy(false);
  };

  return (
    <article className={styles.slip}>
      <header className={styles.slipHead}>
        <span className={styles.slipId}>{job.order_id}</span>
        <span className={clsx(styles.slipStatus, onTheWay && styles.slipStatusOn)}>
          {onTheWay ? 'On the way' : job.status === 'Paid' ? 'Waiting' : 'Being prepared'}
        </span>
      </header>
      <div className={styles.leg}>
        <span className={styles.legLabel}>{onTheWay ? 'Picked up' : 'Pick up'}</span>
        {groups.map((g) => {
          const ready = g.items.every((i) => i.ready);
          return (
            <div key={g.name} className={styles.stop}>
              <span className={styles.stopName}>
                {g.name}
                {!onTheWay && (
                  <span className={clsx(styles.ready, ready && styles.readyOn)}>
                    {ready ? 'Ready' : 'Not ready yet'}
                  </span>
                )}
              </span>
              {g.items.map((i, k) => (
                <span key={k} className={styles.item}>
                  {i.qty} × {i.dish}
                </span>
              ))}
            </div>
          );
        })}
      </div>
      <div className={styles.leg}>
        <span className={styles.legLabel}>Deliver to</span>
        <span className={styles.customer}>{job.customer_name}</span>
        <span className={styles.address}>{job.address}</span>
        <span className={styles.paid}>Paid online ({formatRupees(job.grand_total)}): nothing to collect</span>
      </div>
      {problem && <p className={a.problem}>{problem}</p>}
      <div className={styles.slipActions}>
        <button
          type="button"
          onClick={step}
          aria-busy={busy || undefined}
          className={`${styles.stepButton} btn-black`}
        >
          {busy ? (
            <Spinner size={18} color="var(--color-yellow)" />
          ) : (
            <Icon name={onTheWay ? 'check' : 'moped'} size={isMobile ? 18 : 20} color="var(--color-yellow)" />
          )}
          {onTheWay ? 'Delivered' : 'Picked up'}
        </button>
        {job.phone && (
          <a
            href={`tel:+91${job.phone}`}
            className={`${styles.call} btn-light`}
            aria-label={`Call ${job.customer_name}`}
          >
            <Icon name="phone" size={18} color="var(--color-black)" />
            {isMobile ? 'Call' : `Call ${formatIndianPhone(job.phone)}`}
          </a>
        )}
      </div>
    </article>
  );
}
