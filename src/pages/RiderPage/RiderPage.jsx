import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import clsx from 'clsx';
import { CAMPUS } from '@/config/site';
import { useLayout } from '@/context/layout';
import { formatIndianPhone } from '@/lib/checkout';
import { formatRupees, plural, timeAgo } from '@/lib/format';
import { RIDER_PROBLEMS, alertText, arrivals, mapsLink, pickupStage, shortOrderId } from '@/lib/rider';
import { Icon } from '@/components/ui/Icon/Icon';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { Switch } from '@/components/ui/Switch/Switch';
import { StaffPage, StaffTab } from '@/features/staff/StaffPage';
import { useStaff, useStaffData } from '@/features/staff/useStaff';
import { RefreshButton } from '@/pages/AdminPage/RefreshButton';
import { useLocationSharing } from './useLocationSharing';
import { useOrderAlerts } from './useOrderAlerts';
import a from '@/pages/AdminPage/admin.module.css';
import styles from './RiderPage.module.css';

const CHECK_MS = 20000; // new orders: checked every 20 seconds
const NEW_FOR_MS = 5 * 60000; // an order that came in while the page was open is marked New for 5 minutes

const STATUS_TEXT = {
  off: 'Not sharing. Turn it on before you set off.',
  starting: 'Finding your location…',
  sharing: '',
  blocked:
    'Location is blocked for this site. Allow it in your browser settings, then turn sharing on again.',
  unsupported: "This browser can't share location. Try Chrome.",
  failed: "Couldn't send your location. Check your internet; it keeps trying.",
};

const ALERT_TEXT = {
  off: 'Off. Turn on to hear a chime when a new order comes in.',
  on: 'On: a chime and a buzz for each new order, and a phone notification while this page is in the background. Keep the page open.',
  ask: 'Chime on. For phone notifications too, turn this off and on again and choose Allow.',
  blocked:
    'Chime only: notifications are blocked for this site. Allow them in your browser settings to get them in the background.',
  no_notifications:
    "Chime only: this browser can't show notifications. On iPhone, add Hungrr to your Home Screen and open it from there.",
};

// The rider's page (/rider, for numbers listed as rider on the Staff tab):
//  - On duty: share live location (customers see it while their order is on the way) and new-order alerts.
//  - New orders: orders whose payment the team has checked and no rider has taken yet, with where to pick up
//    (restaurant addresses, directions) and the area it goes to. First to tap Accept gets it.
//  - My orders: the orders you accepted or the team assigned to you, as delivery slips: pick up, deliver to,
//    "Picked up" and "Delivered". Restaurants mark the food ready; the rest of the way is the rider's to update.
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
  const [params, setParams] = useSearchParams();
  const jobs = useStaffData(call, 'jobs');
  const alerts = useOrderAlerts();
  useRiderChecks(jobs.load, alerts.on);
  const sharing = useLocationSharing((pos) => call('location', pos));

  const mine = jobs.data?.jobs || [];
  const open = jobs.data?.available || [];
  const asked = params.get('tab');
  const tab = asked === 'new' || asked === 'mine' ? asked : mine.length ? 'mine' : 'new';
  const showTab = (id) => setParams({ tab: id }, { replace: true });

  // What's new since the last check: chime, buzz and notification, and a New mark on the card
  const seen = useRef(null);
  const ownMoves = useRef(new Set()); // orders this rider just accepted or gave back: no alert for those
  const [arrivedAt, setArrivedAt] = useState({});
  const { ring } = alerts;
  useEffect(() => {
    const data = jobs.data;
    if (!data) return;
    const openNow = data.available || [];
    const mineNow = data.jobs || [];
    const fresh = arrivals(seen.current?.open ?? null, openNow).filter(
      (o) => !ownMoves.current.has(o.order_id),
    );
    const assigned = arrivals(seen.current?.mine ?? null, mineNow).filter(
      (o) => !ownMoves.current.has(o.order_id),
    );
    if (fresh.length || assigned.length) {
      ring(alertText(fresh, assigned));
      const now = Date.now();
      setArrivedAt((m) => ({ ...m, ...Object.fromEntries(fresh.map((o) => [o.order_id, now])) }));
    }
    seen.current = {
      open: new Set(openNow.map((o) => o.order_id)),
      mine: new Set(mineNow.map((o) => o.order_id)),
    };
    ownMoves.current.clear();
  }, [jobs.data, ring]);

  // The tab's title counts open orders, so a rider with another tab open still sees them
  useEffect(() => {
    document.title = open.length ? `(${open.length}) Deliveries – Hungrr` : 'Deliveries – Hungrr';
  }, [open.length]);

  // Tapping a notification while the page is open: the service worker asks it to show the new orders
  const { load } = jobs;
  useEffect(() => {
    if (!('serviceWorker' in navigator)) return undefined;
    const onMessage = (e) => {
      if (e.data?.type !== 'hungrr-open') return;
      setParams({ tab: e.data.tab === 'mine' ? 'mine' : 'new' }, { replace: true });
      load({ quiet: true });
    };
    navigator.serviceWorker.addEventListener('message', onMessage);
    return () => navigator.serviceWorker.removeEventListener('message', onMessage);
  }, [load, setParams]);

  const accepted = (id) => {
    ownMoves.current.add(id);
    showTab('mine');
  };

  return (
    <div className={styles.layout}>
      <section className={clsx(styles.share, sharing.on && styles.shareOn)} aria-label="On duty">
        <div className={styles.duty}>
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
        </div>
        <div className={styles.duty}>
          <div className={styles.shareHead}>
            <span className={clsx(styles.shareIcon, alerts.on && styles.bellOn)}>
              <Icon name="bell" size={isMobile ? 21 : 25} color="var(--color-black)" />
            </span>
            <span className={styles.shareTitle}>New-order alerts</span>
            <Switch
              checked={alerts.on}
              onChange={alerts.setOn}
              label="Alerts for new orders"
              onLabel="On"
              offLabel="Off"
              tone="dark"
            />
          </div>
          <p className={styles.shareText}>{ALERT_TEXT[alerts.status]}</p>
        </div>
      </section>

      <div>
        <div className={styles.tabRow}>
          <div className={styles.tabs} role="group" aria-label="Orders">
            <StaffTab active={tab === 'new'} count={open.length} onClick={() => showTab('new')}>
              New orders
            </StaffTab>
            <StaffTab active={tab === 'mine'} count={mine.length} onClick={() => showTab('mine')}>
              My orders
            </StaffTab>
          </div>
          <RefreshButton at={jobs.at} onRefresh={() => jobs.load({ quiet: true })} />
        </div>
        {jobs.data && (
          <p className={styles.tabNote}>
            {tab === 'new'
              ? 'Payment checked, no rider yet. First to accept gets it. Checks every 20 seconds.'
              : `${plural(mine.length, 'order')} to deliver · ${jobs.data.delivered_today} delivered today`}
          </p>
        )}
      </div>

      {jobs.phase === 'loading' && <div className={a.loading} />}
      {jobs.phase === 'failed' && (
        <p className={a.problem}>Your orders couldn&apos;t load. Refresh to try again.</p>
      )}

      {jobs.data && tab === 'new' && (
        <>
          {!open.length && (
            <p className={a.empty}>
              No new orders right now. They appear here by themselves
              {alerts.on ? ', with a chime.' : '. Turn on alerts to hear them.'}
            </p>
          )}
          <div className={styles.jobs}>
            {open.map((order) => (
              <OpenOrder
                key={order.order_id}
                order={order}
                isNew={Date.now() - (arrivedAt[order.order_id] || 0) < NEW_FOR_MS}
                call={call}
                reload={jobs.load}
                onAccepted={accepted}
              />
            ))}
          </div>
        </>
      )}

      {jobs.data && tab === 'mine' && (
        <>
          {!mine.length && (
            <p className={a.empty}>
              Nothing to deliver right now. Accept a new order, or the team will assign you one.
            </p>
          )}
          <div className={styles.jobs}>
            {mine.map((job) => (
              <Slip
                key={job.order_id}
                job={job}
                call={call}
                reload={jobs.load}
                onGaveBack={(id) => ownMoves.current.add(id)}
              />
            ))}
          </div>
        </>
      )}
    </div>
  );
}

// Checks for new orders every 20 seconds while the page is on screen, and also in the background while alerts
// are on (browsers may slow this to about once a minute there). Checks at once on coming back to the page.
function useRiderChecks(load, inBackground) {
  useEffect(() => {
    const tick = () => {
      if (inBackground || document.visibilityState === 'visible') load({ quiet: true });
    };
    const back = () => {
      if (document.visibilityState === 'visible') load({ quiet: true });
    };
    const timer = setInterval(tick, CHECK_MS);
    document.addEventListener('visibilitychange', back);
    return () => {
      clearInterval(timer);
      document.removeEventListener('visibilitychange', back);
    };
  }, [load, inBackground]);
}

// "Directions" to a place, in Google Maps (the app, on a phone)
function Directions({ place, near, label = 'Directions' }) {
  const href = mapsLink(place, near);
  if (!href) return null;
  return (
    <a href={href} target="_blank" rel="noreferrer" className={styles.directions}>
      <Icon name="directions" size={16} color="var(--color-black)" />
      {label}
    </a>
  );
}

// An order no rider has taken: the route (each restaurant to pick up from, then the drop area) and Accept
function OpenOrder({ order, isNew, call, reload, onAccepted }) {
  const { isMobile } = useLayout();
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState('');
  const stage = pickupStage(order);

  const accept = async () => {
    setBusy(true);
    setProblem('');
    const res = await call('accept', { order_id: order.order_id });
    if (res.ok) {
      onAccepted(order.order_id);
      await reload({ quiet: true });
      return;
    }
    setProblem(RIDER_PROBLEMS[res.error] || "Couldn't accept it. Check your internet and try again.");
    setBusy(false);
    if (res.error === 'taken' || res.error === 'not_open') setTimeout(() => reload({ quiet: true }), 2500);
  };

  return (
    <article className={clsx(styles.offer, isNew && styles.offerNew)}>
      <header className={styles.offerHead}>
        <span className={styles.offerId}>#{shortOrderId(order.order_id)}</span>
        {isNew && <span className={styles.newChip}>New</span>}
        <span className={styles.offerAge}>Ordered {timeAgo(new Date(order.created_at))}</span>
        <span className={clsx(styles.stage, styles[`stage_${stage.tone}`])}>{stage.text}</span>
      </header>
      <ol className={styles.route}>
        {order.pickups.map((p) => (
          <li key={p.restaurant_id || p.name} className={styles.routeStop}>
            <span className={styles.routeDot} aria-hidden="true" />
            <span className={styles.routeLabel}>Pick up</span>
            <span className={styles.routeName}>
              {p.name}
              <span className={clsx(styles.ready, p.ready && styles.readyOn)}>
                {p.ready ? 'Ready' : plural(p.dishes, 'dish', 'dishes')}
              </span>
            </span>
            <span className={clsx(styles.routeAddress, !p.address && styles.routeMissing)}>
              {p.address || 'Address not added yet: ask the team'}
            </span>
            <Directions place={p} near={CAMPUS} />
          </li>
        ))}
        <li className={clsx(styles.routeStop, styles.routeDrop)}>
          <span className={clsx(styles.routeDot, styles.routeDotDrop)} aria-hidden="true" />
          <span className={styles.routeLabel}>Drop</span>
          <span className={styles.routeName}>{order.drop || 'Address on accepting'}</span>
          <span className={styles.routeAddress}>
            {plural(order.dishes, 'dish', 'dishes')} · Full address and phone number once you accept
          </span>
        </li>
      </ol>
      {problem && <p className={clsx(a.problem, styles.slipProblem)}>{problem}</p>}
      <div className={styles.slipActions}>
        <button
          type="button"
          onClick={accept}
          disabled={busy}
          aria-busy={busy || undefined}
          className={`${styles.stepButton} btn-black`}
        >
          {busy ? (
            <Spinner size={18} color="var(--color-yellow)" />
          ) : (
            <Icon name="moped" size={isMobile ? 20 : 22} color="var(--color-yellow)" />
          )}
          {busy ? 'Accepting…' : 'Accept order'}
        </button>
      </div>
    </article>
  );
}

// One of the rider's orders as a delivery slip: pick up (with addresses), deliver to, and the next step
function Slip({ job, call, reload, onGaveBack }) {
  const { isMobile } = useLayout();
  const [busy, setBusy] = useState('');
  const [problem, setProblem] = useState('');
  const onTheWay = job.status === 'Out for delivery';
  const stops = job.pickups?.length
    ? job.pickups
    : [...new Set(job.items.map((i) => i.restaurant))].map((name) => ({ name }));
  const groups = stops.map((p) => ({
    ...p,
    items: job.items.filter((i) =>
      p.restaurant_id && i.restaurant_id ? i.restaurant_id === p.restaurant_id : i.restaurant === p.name,
    ),
  }));
  const allReady = job.items.every((i) => i.ready);

  const run = async (op) => {
    setBusy(op);
    setProblem('');
    const res = await call(op, { order_id: job.order_id });
    if (!res.ok) setProblem(RIDER_PROBLEMS[res.error] || "Didn't save. Try again.");
    await reload({ quiet: true });
    setBusy('');
  };

  const step = () => {
    if (
      !onTheWay &&
      !allReady &&
      !window.confirm('Not every restaurant has marked the food ready. Picked up anyway?')
    )
      return;
    run(onTheWay ? 'delivered' : 'picked_up');
  };

  const giveBack = () => {
    if (!window.confirm('Give this order back? It goes back to New orders for the other riders.')) return;
    onGaveBack(job.order_id);
    run('release');
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
            <div key={g.restaurant_id || g.name} className={styles.stop}>
              <span className={styles.stopName}>
                {g.name}
                {!onTheWay && (
                  <span className={clsx(styles.ready, ready && styles.readyOn)}>
                    {ready ? 'Ready' : 'Not ready yet'}
                  </span>
                )}
              </span>
              {!onTheWay && 'address' in g && (
                <span className={clsx(styles.stopAddress, !g.address && styles.routeMissing)}>
                  {g.address || 'Address not added yet: ask the team'}
                </span>
              )}
              {g.items.map((i, k) => (
                <span key={k} className={styles.item}>
                  {i.qty} × {i.dish}
                </span>
              ))}
              {!onTheWay && <Directions place={g} near={CAMPUS} />}
            </div>
          );
        })}
      </div>
      <div className={styles.leg}>
        <span className={styles.legLabel}>Deliver to</span>
        <span className={styles.customer}>{job.customer_name}</span>
        <span className={styles.address}>{job.address}</span>
        <span className={styles.paid}>Paid online ({formatRupees(job.grand_total)}): nothing to collect</span>
        <Directions place={{ address: job.address }} near={CAMPUS} />
      </div>
      {problem && <p className={clsx(a.problem, styles.slipProblem)}>{problem}</p>}
      <div className={styles.slipActions}>
        <button
          type="button"
          onClick={step}
          disabled={Boolean(busy)}
          aria-busy={busy === 'picked_up' || busy === 'delivered' || undefined}
          className={`${styles.stepButton} btn-black`}
        >
          {busy === 'picked_up' || busy === 'delivered' ? (
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
      {!onTheWay && (
        <button type="button" onClick={giveBack} disabled={Boolean(busy)} className={styles.giveBack}>
          {busy === 'release' ? 'Giving back…' : 'Can’t take it? Give it back'}
        </button>
      )}
    </article>
  );
}
