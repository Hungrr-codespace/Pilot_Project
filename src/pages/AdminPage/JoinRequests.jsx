import { useState } from 'react';
import clsx from 'clsx';
import { CAMPUS } from '@/config/site';
import { formatIndianPhone } from '@/lib/checkout';
import { timeAgo } from '@/lib/format';
import { OFFICIAL_CHECKS, formatFssai, formatLicence, formatVehicle } from '@/lib/partners';
import { mapsLink } from '@/lib/rider';
import { ExternalLink } from '@/components/ui/ExternalLink/ExternalLink';
import { Icon } from '@/components/ui/Icon/Icon';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { useStaffData } from '@/features/staff/useStaff';
import { RefreshButton } from './RefreshButton';
import a from './admin.module.css';
import styles from './JoinRequests.module.css';

const ROLE_LABEL = { restaurant: 'Restaurant', rider: 'Rider' };
const STATUS_LABEL = {
  approved: 'Approved',
  declined: 'Declined',
  removed: 'Access removed',
  pending: 'Waiting',
};

// Join requests: restaurants and riders who applied on the website (Partners tab). Waiting ones first, as
// application slips: their details with the website's format checks, a copy button and a link to the official
// site for each number (GST portal, FSSAI FoSCoS, Parivahan: they need a captcha, so the check is by hand), then
// Approve (restaurants: a new restaurant, closed until its menu is added, or an existing one) or Decline with a
// note they see. Approving adds them to Staff; their page opens at their next sign-in.
export function JoinRequests({ call }) {
  const data = useStaffData(call, 'applications');
  if (data.phase === 'loading') return <div className={a.loading} />;
  if (data.phase === 'failed')
    return <p className={a.problem}>Join requests couldn&apos;t load. Refresh to try again.</p>;
  const { applications = [], restaurants = [], clusters = [] } = data.data;
  const waiting = applications.filter((x) => x.status === 'pending');
  const decided = applications.filter((x) => x.status !== 'pending');
  const reload = () => data.load({ quiet: true });

  return (
    <>
      <div className={a.panelHead}>
        <div>
          <h2 className={a.panelTitle}>Join requests ({waiting.length})</h2>
          <p className={a.panelNote}>
            Restaurants and riders who applied on the website. Check their numbers on the official sites, then
            approve or decline. Approving opens their page at their next sign-in.
          </p>
        </div>
        <RefreshButton at={data.at} onRefresh={reload} />
      </div>
      {waiting.length ? (
        <div className={styles.grid}>
          {waiting.map((app) => (
            <ApplicationSlip
              key={app.phone + app.role}
              app={app}
              restaurants={restaurants}
              clusters={clusters}
              call={call}
              reload={reload}
            />
          ))}
        </div>
      ) : (
        <p className={a.empty}>No one is waiting. New applications appear here, and you get an alert.</p>
      )}
      {decided.length > 0 && (
        <>
          <h3 className={styles.subhead}>Decided</h3>
          <ul className={styles.history}>
            {decided.map((app) => (
              <HistoryRow key={app.phone + app.role} app={app} call={call} reload={reload} />
            ))}
          </ul>
        </>
      )}
    </>
  );
}

function ApplicationSlip({ app, restaurants, clusters, call, reload }) {
  const d = app.details;
  const isRestaurant = app.role === 'restaurant';
  const [linkTo, setLinkTo] = useState(''); // '' = a new restaurant
  const [cluster, setCluster] = useState(clusters[0]?.id || '');
  const [declining, setDeclining] = useState(false);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState('');
  const [problem, setProblem] = useState('');

  const decide = async (decision) => {
    setBusy(decision);
    setProblem('');
    const extra =
      decision === 'approve' && isRestaurant
        ? linkTo
          ? { restaurant_id: linkTo }
          : { restaurant_name: d.restaurant_name, cluster_id: cluster }
        : {};
    const res = await call('application_decide', {
      phone: app.phone,
      role: app.role,
      decision,
      note: decision === 'decline' ? note.trim() : '',
      ...extra,
    });
    if (!res.ok) {
      setBusy('');
      setProblem("That didn't save. Refresh and try again.");
      return;
    }
    await reload();
  };

  return (
    <article className={clsx(styles.slip, isRestaurant ? styles.slipRestaurant : styles.slipRider)}>
      <header className={styles.slipHead}>
        <span className={styles.roleChip}>
          <Icon name={isRestaurant ? 'cloche' : 'moped'} size={15} color="currentColor" />
          {ROLE_LABEL[app.role]}
        </span>
        <span className={styles.when}>Applied {timeAgo(new Date(app.applied_at))}</span>
      </header>
      <div className={styles.who}>
        <span className={styles.name}>{isRestaurant ? d.restaurant_name : app.name}</span>
        <span className={styles.contact}>
          {isRestaurant && <>{app.name} · </>}
          <a href={`tel:+91${app.phone}`}>{formatIndianPhone(app.phone)}</a>
        </span>
        {isRestaurant && d.restaurant_address && (
          <span className={styles.address}>
            <Icon name="mapMarkerOutline" size={16} color="var(--color-text-subtle)" />
            <span>
              {d.restaurant_address}{' '}
              <ExternalLink
                href={mapsLink({ address: d.restaurant_address }, CAMPUS)}
                className={styles.tool}
              >
                See on map
              </ExternalLink>
            </span>
          </span>
        )}
      </div>

      <dl className={styles.checks}>
        {isRestaurant ? (
          <>
            {d.no_gst ? (
              <CheckRow label="GST" value="Not registered for GST" plain ok={null} />
            ) : (
              <CheckRow
                label="GSTIN"
                value={d.gstin}
                ok={app.checks.gstin}
                okText="Format and check character OK"
                badText="Doesn't add up: ask them"
                official={OFFICIAL_CHECKS.gstin}
              />
            )}
            <CheckRow
              label="FSSAI"
              value={formatFssai(d.fssai)}
              copy={d.fssai}
              ok={app.checks.fssai}
              okText="14 digits"
              badText="Not 14 digits"
              official={OFFICIAL_CHECKS.fssai}
            />
          </>
        ) : (
          <>
            <CheckRow
              label="Born"
              value={dateText(d.dob)}
              plain
              ok={app.checks.age !== null && app.checks.age >= 18}
              okText={`${app.checks.age} years old`}
              badText={app.checks.age === null ? 'Not a real date' : `${app.checks.age}: under 18`}
            />
            <CheckRow
              label="Vehicle"
              value={formatVehicle(d.vehicle_no)}
              copy={d.vehicle_no}
              ok={app.checks.vehicle}
              okText="Plate format OK"
              badText="Unusual format"
              official={OFFICIAL_CHECKS.vehicle_no}
            />
            <CheckRow
              label="Licence"
              value={formatLicence(d.dl_no)}
              copy={d.dl_no}
              ok={app.checks.dl}
              okText="Licence format OK"
              badText="Unusual format"
              official={OFFICIAL_CHECKS.dl_no}
            />
          </>
        )}
      </dl>

      {isRestaurant && !declining && (
        <div className={styles.linkBox}>
          <label className={a.label}>
            On Hungrr as
            <select value={linkTo} onChange={(e) => setLinkTo(e.target.value)} className={a.select}>
              <option value="">A new restaurant: {d.restaurant_name}</option>
              {restaurants.map((r) => (
                <option key={r.id} value={r.id}>
                  Already listed: {r.name}
                </option>
              ))}
            </select>
          </label>
          {!linkTo && clusters.length > 0 && (
            <label className={a.label}>
              Cluster
              <select value={cluster} onChange={(e) => setCluster(e.target.value)} className={a.select}>
                {clusters.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.label}
                    {c.area ? ` · ${c.area}` : ''}
                  </option>
                ))}
                <option value="">Decide later</option>
              </select>
            </label>
          )}
          <p className={styles.hint}>
            {linkTo
              ? 'Their kitchen page will show this restaurant’s orders.'
              : 'A new restaurant starts closed, with this address for riders: add its dishes in the Dishes tab, then open it on Menu & notice.'}
          </p>
        </div>
      )}

      {declining ? (
        <div className={styles.decline}>
          <label className={a.label}>
            Tell them why (they see this when they sign in)
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={200}
              rows={2}
              placeholder="e.g. The FSSAI number isn't on FoSCoS. Check it and apply again."
              className={`${a.input} ${styles.textarea}`}
            />
          </label>
          <div className={styles.actions}>
            <button
              type="button"
              onClick={() => decide('decline')}
              aria-busy={busy === 'decline' || undefined}
              className={`${a.button} ${styles.declineButton} btn-light`}
            >
              {busy === 'decline' && <Spinner size={16} color="var(--color-nonveg)" />}
              Decline application
            </button>
            <button type="button" onClick={() => setDeclining(false)} className={a.textButton}>
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className={styles.actions}>
          <button
            type="button"
            onClick={() => decide('approve')}
            aria-busy={busy === 'approve' || undefined}
            className={`${a.button} ${a.primary} btn-black`}
          >
            {busy === 'approve' ? (
              <Spinner size={16} color="var(--color-yellow)" />
            ) : (
              <Icon name="check" size={16} color="var(--color-yellow)" />
            )}
            Approve {ROLE_LABEL[app.role].toLowerCase()}
          </button>
          <button type="button" onClick={() => setDeclining(true)} className={`${a.button} btn-light`}>
            Decline
          </button>
        </div>
      )}
      {problem && <p className={a.problem}>{problem}</p>}
    </article>
  );
}

// One number on the slip: what was typed, the website's check, copy, and the official site to confirm it
function CheckRow({ label, value, copy, plain = false, ok, okText, badText, official }) {
  const [copied, setCopied] = useState(false);
  const doCopy = async () => {
    try {
      await navigator.clipboard.writeText(copy || value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* clipboard blocked */
    }
  };
  return (
    <div className={styles.check}>
      <dt className={styles.checkLabel}>{label}</dt>
      <dd className={styles.checkBody}>
        <span className={plain ? styles.valuePlain : styles.value}>{value}</span>
        {ok !== null && ok !== undefined && (
          <span className={ok ? styles.ok : styles.bad}>
            <Icon name={ok ? 'checkCircle' : 'info'} size={15} color="currentColor" />
            {ok ? okText : badText}
          </span>
        )}
        {official && (
          <span className={styles.tools}>
            <button type="button" onClick={doCopy} className={styles.tool}>
              {copied ? 'Copied' : 'Copy'}
            </button>
            <ExternalLink href={official.url} className={styles.tool} title={official.how}>
              Check on {official.label} ↗
            </ExternalLink>
            <span className={styles.how}>{official.how}</span>
          </span>
        )}
      </dd>
    </div>
  );
}

function HistoryRow({ app, call, reload }) {
  const [confirming, setConfirming] = useState(false);
  const [busy, setBusy] = useState(false);
  const isRestaurant = app.role === 'restaurant';
  const remove = async () => {
    setBusy(true);
    await call('application_decide', { phone: app.phone, role: app.role, decision: 'remove' });
    await reload();
    setBusy(false);
    setConfirming(false);
  };
  return (
    <li className={styles.row}>
      <span className={styles.rowRole}>
        <Icon name={isRestaurant ? 'cloche' : 'moped'} size={16} color="var(--color-black)" />
      </span>
      <span className={styles.rowWho}>
        <strong>{isRestaurant ? app.details.restaurant_name : app.name}</strong>
        <span>
          {isRestaurant ? `${app.name} · ` : ''}
          {formatIndianPhone(app.phone)}
          {app.decided_at && ` · ${timeAgo(new Date(app.decided_at))}`}
        </span>
        {app.note && <span className={styles.rowNote}>“{app.note}”</span>}
      </span>
      <span className={clsx(styles.status, styles[app.status])}>
        {STATUS_LABEL[app.status] || app.status}
      </span>
      {app.status === 'approved' &&
        (confirming ? (
          <span className={styles.confirm}>
            <button type="button" onClick={remove} className={`${a.textButton} ${a.danger}`} disabled={busy}>
              {busy ? 'Removing…' : 'Yes, remove access'}
            </button>
            <button type="button" onClick={() => setConfirming(false)} className={a.textButton}>
              Keep
            </button>
          </span>
        ) : (
          <button type="button" onClick={() => setConfirming(true)} className={a.textButton}>
            Remove access
          </button>
        ))}
    </li>
  );
}

// "2005-03-14" → "14 Mar 2005"
function dateText(iso) {
  const d = new Date(`${iso}T00:00:00+05:30`);
  return Number.isNaN(d.getTime())
    ? iso || '—'
    : d.toLocaleDateString('en-IN', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        timeZone: 'Asia/Kolkata',
      });
}
