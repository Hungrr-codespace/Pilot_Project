import { useState } from 'react';
import clsx from 'clsx';
import { useLayout } from '@/context/layout';
import { describeDeal } from '@/lib/deals';
import { formatRupees } from '@/lib/format';
import { cleanCode, couponState, dateRange, newCouponCode, ordinal } from '@/lib/staff';
import { Icon } from '@/components/ui/Icon/Icon';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import { Switch } from '@/components/ui/Switch/Switch';
import { useStaffData } from '@/features/staff/useStaff';
import a from './admin.module.css';
import styles from './OffersPanel.module.css';

const TYPES = [
  { id: 'amount', label: '₹ off' },
  { id: 'percent', label: '% off' },
  { id: 'free_delivery', label: 'Free delivery' },
];

const PROBLEMS = {
  bad_name: 'Give it a name of at least 2 letters.',
  bad_type: 'Pick the kind of discount.',
  bad_value: 'Enter the discount: more than 0, and at most 100 for a percentage.',
  bad_dates: "Check the dates: the last day can't be before the first.",
  bad_code: 'A code is 4 to 16 letters or digits.',
  code_taken: 'Another coupon already has this code. Pick another, or tap "Make a code".',
  bad_every: 'Every 2nd to every 50th order.',
};

const EMPTY = {
  was: '',
  name: '',
  code: '',
  type: 'amount',
  value: '',
  max_discount: '',
  min_order: '',
  starts_on: '',
  ends_on: '',
  max_uses: '',
  per_customer: '1',
  active: true,
  show_at_checkout: true,
};

// Offers and coupons: the automatic offer (every Nth order), a form to make or edit a coupon (with a code made
// for you, or your own), and the coupons with how often each was used: first those customers can apply today
// (and whether each is listed at checkout), then the rest. The sheet checks codes are unique.
export function OffersPanel({ call }) {
  const offers = useStaffData(call, 'coupons');
  const [form, setForm] = useState(EMPTY);

  if (offers.phase === 'loading') return <div className={a.loading} />;
  if (offers.phase === 'failed')
    return <p className={a.problem}>Offers couldn&apos;t load. Refresh to try again.</p>;
  const { coupons = [], offers: auto = [] } = offers.data;
  const live = coupons.filter((c) => c.state === 'live');
  const resting = coupons.filter((c) => c.state !== 'live');
  const edit = (c) =>
    setForm({
      ...EMPTY,
      ...Object.fromEntries(
        Object.entries(c).map(([k, v]) => [k, typeof v === 'boolean' ? v : v === 0 ? '' : String(v)]),
      ),
      was: c.code,
    });
  const stubs = (list) => (
    <div className={styles.list}>
      {list.map((c) => (
        <CouponStub key={c.code} coupon={c} call={call} reload={offers.load} onEdit={() => edit(c)} />
      ))}
    </div>
  );

  return (
    <div className={styles.layout}>
      <div className={styles.side}>
        <AutoOffer offer={auto[0]} call={call} reload={offers.load} />
        <CouponForm form={form} setForm={setForm} call={call} reload={offers.load} />
      </div>
      <section className={styles.listArea} aria-labelledby="coupon-list">
        <div className={a.panelHead}>
          <div>
            <h2 id="coupon-list" className={a.panelTitle}>
              Coupons
            </h2>
            <p className={a.panelNote}>One offer per order: customers get whichever saves them more.</p>
          </div>
        </div>
        {coupons.length ? (
          <>
            <GroupHead
              title="Active now"
              count={live.length}
              note="Customers can apply these today. Those listed at checkout show under the coupon field; the others work when typed."
            />
            {live.length ? stubs(live) : <p className={styles.groupEmpty}>No coupon can be applied today.</p>}
            {resting.length > 0 && (
              <>
                <GroupHead
                  title="Not active"
                  count={resting.length}
                  note="Switched off, not started yet, expired or used up. Customers can't apply these."
                />
                {stubs(resting)}
              </>
            )}
          </>
        ) : (
          <p className={a.empty}>No coupons yet. Make the first one on the left.</p>
        )}
      </section>
    </div>
  );
}

// The automatic offer: every Nth paid order of a customer gets it
function AutoOffer({ offer, call, reload }) {
  const [draft, setDraft] = useState(() => ({
    offer_id: offer?.offer_id || 'nth-order',
    every_n: String(offer?.every_n || 5),
    reward: offer?.reward || 'free_delivery',
    value: offer?.value ? String(offer.value) : '',
    max_discount: offer?.max_discount ? String(offer.max_discount) : '',
    name: offer?.name || '',
    active: offer ? offer.active : true,
  }));
  const [state, setState] = useState({ busy: false, problem: '', saved: false });
  const suggested = offerName(draft);
  const set = (key, value) =>
    setDraft((d) => {
      const next = { ...d, [key]: value };
      // Keep the name in step with the offer, unless it was written by hand
      if (key !== 'name' && (!d.name || d.name === offerName(d))) next.name = offerName(next);
      return next;
    });

  const save = async (event) => {
    event.preventDefault();
    setState({ busy: true, problem: '', saved: false });
    const res = await call('offer_save', { offer: { ...draft, name: draft.name || suggested } });
    setState({
      busy: false,
      problem: res.ok ? '' : PROBLEMS[res.error] || "Didn't save. Try again.",
      saved: res.ok,
    });
    if (res.ok) reload({ quiet: true });
  };

  return (
    <form onSubmit={save} className={styles.offer}>
      <div className={styles.offerHead}>
        <h2 className={styles.formTitle}>Automatic offer</h2>
        <Switch
          checked={draft.active}
          onChange={(v) => set('active', v)}
          label="Offer on"
          onLabel="On"
          offLabel="Off"
          tone="dark"
        />
      </div>
      <p className={styles.offerText}>
        Every customer&apos;s
        <input
          type="number"
          min="2"
          max="50"
          value={draft.every_n}
          onChange={(e) => set('every_n', e.target.value)}
          aria-label="Every how many orders"
          className={styles.inlineNumber}
        />
        <span>{ordinal(Number(draft.every_n) || 0).replace(/^\d+/, '')} paid order gets:</span>
      </p>
      <Segmented value={draft.reward} onChange={(v) => set('reward', v)} dark label="Offer" />
      {draft.reward !== 'free_delivery' && (
        <div className={styles.pair}>
          <label className={styles.darkLabel}>
            {draft.reward === 'percent' ? 'Percent off' : 'Rupees off'}
            <input
              type="number"
              min="1"
              value={draft.value}
              onChange={(e) => set('value', e.target.value)}
              className={a.input}
            />
          </label>
          {draft.reward === 'percent' && (
            <label className={styles.darkLabel}>
              Up to ₹ (optional)
              <input
                type="number"
                min="0"
                value={draft.max_discount}
                onChange={(e) => set('max_discount', e.target.value)}
                className={a.input}
              />
            </label>
          )}
        </div>
      )}
      <label className={styles.darkLabel}>
        Name customers see
        <input
          value={draft.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder={suggested}
          maxLength={60}
          className={a.input}
        />
      </label>
      {state.problem && <p className={a.problem}>{state.problem}</p>}
      <div className={styles.formActions}>
        <button
          type="submit"
          aria-busy={state.busy || undefined}
          className={`${a.button} ${a.yellow} btn-yellow`}
        >
          {state.busy ? (
            <Spinner size={16} color="var(--color-black)" />
          ) : (
            <Icon name="check" size={16} color="var(--color-black)" />
          )}
          Save offer
        </button>
        {state.saved && <span className={styles.saved}>Saved. Customers see it within a minute.</span>}
      </div>
    </form>
  );
}

// "Every 5th order: free delivery"
function offerName(d) {
  const n = Number(d.every_n);
  if (!(n >= 2)) return '';
  const rule = { type: d.reward, value: Number(d.value), max_discount: Number(d.max_discount) };
  return `Every ${ordinal(n)} order: ${describeDeal(rule).toLowerCase()}`;
}

function CouponForm({ form, setForm, call, reload }) {
  const [state, setState] = useState({ busy: false, problem: '', done: '' });
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const editing = Boolean(form.was);

  const save = async (event) => {
    event.preventDefault();
    setState({ busy: true, problem: '', done: '' });
    const res = await call('coupon_save', { coupon: { ...form, code: cleanCode(form.code) } });
    if (res.ok) {
      setState({ busy: false, problem: '', done: `${editing ? 'Saved' : 'Made'} coupon ${res.code}.` });
      setForm(EMPTY);
      reload({ quiet: true });
    } else setState({ busy: false, problem: PROBLEMS[res.error] || "Didn't save. Try again.", done: '' });
  };

  return (
    <form onSubmit={save} className={styles.form}>
      <h2 className={styles.formTitle}>{editing ? `Edit ${form.was}` : 'New coupon'}</h2>
      <label className={a.label}>
        Name
        <input
          value={form.name}
          onChange={(e) => set('name', e.target.value)}
          placeholder="e.g. Exam week treat"
          maxLength={60}
          className={a.input}
        />
      </label>
      <div className={styles.codeRow}>
        <label className={`${a.label} ${styles.grow}`}>
          Code
          <input
            value={form.code}
            onChange={(e) => set('code', cleanCode(e.target.value))}
            placeholder="Leave empty to make one"
            className={`${a.input} ${styles.code}`}
          />
        </label>
        <button
          type="button"
          onClick={() => set('code', newCouponCode())}
          className={`${a.button} btn-light ${styles.make}`}
        >
          <Icon name="sparkle" size={16} color="var(--color-black)" />
          Make a code
        </button>
      </div>
      <span className={a.label}>Discount</span>
      <Segmented value={form.type} onChange={(v) => set('type', v)} label="Discount" />
      {form.type !== 'free_delivery' && (
        <div className={styles.pair}>
          <label className={a.label}>
            {form.type === 'percent' ? 'Percent off the food' : 'Rupees off the food'}
            <input
              type="number"
              min="1"
              value={form.value}
              onChange={(e) => set('value', e.target.value)}
              className={a.input}
            />
          </label>
          {form.type === 'percent' && (
            <label className={a.label}>
              Up to ₹ (optional)
              <input
                type="number"
                min="0"
                value={form.max_discount}
                onChange={(e) => set('max_discount', e.target.value)}
                className={a.input}
              />
            </label>
          )}
        </div>
      )}
      <label className={a.label}>
        Minimum food total ₹ (optional)
        <input
          type="number"
          min="0"
          value={form.min_order}
          onChange={(e) => set('min_order', e.target.value)}
          className={a.input}
        />
      </label>
      <div className={styles.pair}>
        <label className={a.label}>
          First day
          <input
            type="date"
            value={form.starts_on}
            onChange={(e) => set('starts_on', e.target.value)}
            className={a.input}
          />
        </label>
        <label className={a.label}>
          Last day
          <input
            type="date"
            value={form.ends_on}
            onChange={(e) => set('ends_on', e.target.value)}
            className={a.input}
          />
        </label>
      </div>
      <div className={styles.pair}>
        <label className={a.label}>
          Uses in total
          <input
            type="number"
            min="0"
            value={form.max_uses}
            onChange={(e) => set('max_uses', e.target.value)}
            placeholder="No limit"
            className={a.input}
          />
        </label>
        <label className={a.label}>
          Uses per customer
          <input
            type="number"
            min="0"
            value={form.per_customer}
            onChange={(e) => set('per_customer', e.target.value)}
            placeholder="No limit"
            className={a.input}
          />
        </label>
      </div>
      <div className={styles.switches}>
        <Switch
          checked={form.active}
          onChange={(v) => set('active', v)}
          label="Coupon on"
          onLabel="On: customers can use it"
          offLabel="Off: saved, not usable"
        />
        <Switch
          checked={form.show_at_checkout}
          onChange={(v) => set('show_at_checkout', v)}
          label="Listed at checkout"
          onLabel="Listed at checkout"
          offLabel="Code only: not listed"
        />
        <span className={styles.switchHint}>
          {form.show_at_checkout
            ? 'Every signed-in customer sees it under the coupon field.'
            : 'Hidden from the list; it works for whoever types the code.'}
        </span>
      </div>
      {state.problem && <p className={a.problem}>{state.problem}</p>}
      {state.done && <p className={styles.done}>{state.done}</p>}
      <div className={styles.formActions}>
        <button
          type="submit"
          aria-busy={state.busy || undefined}
          className={`${a.button} ${a.primary} btn-black`}
        >
          {state.busy ? (
            <Spinner size={16} color="var(--color-yellow)" />
          ) : (
            <Icon name="tag" size={16} color="var(--color-yellow)" />
          )}
          {editing ? 'Save coupon' : 'Make coupon'}
        </button>
        {editing && (
          <button type="button" onClick={() => setForm(EMPTY)} className={a.textButton}>
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}

// One coupon, shaped like a tear-off stub
function CouponStub({ coupon, call, reload, onEdit }) {
  const { isMobile } = useLayout();
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const toggle = async (active) => {
    setBusy(true);
    await call('coupon_active', { code: coupon.code, active });
    await reload({ quiet: true });
    setBusy(false);
  };
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(coupon.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      /* clipboard blocked */
    }
  };
  const rules = [];
  if (coupon.min_order) rules.push(`on food over ${formatRupees(coupon.min_order)}`);
  if (coupon.starts_on || coupon.ends_on) rules.push(dateRange(coupon.starts_on, coupon.ends_on));
  if (coupon.per_customer) rules.push(`${coupon.per_customer} per customer`);
  const isLive = coupon.state === 'live';
  return (
    <article className={clsx(styles.stub, !isLive && styles.stubOff)}>
      <div className={styles.stubCode}>
        <span className={styles.stubCodeText}>{coupon.code}</span>
        <button type="button" onClick={copy} className={styles.copy}>
          {copied ? 'Copied' : 'Copy'}
        </button>
      </div>
      <div className={styles.stubBody}>
        <span className={styles.stubTop}>
          <span className={styles.stubName}>{coupon.name}</span>
          {isLive ? (
            <span
              className={clsx(styles.chip, coupon.show_at_checkout ? styles.chipListed : styles.chipCode)}
            >
              <Icon name={coupon.show_at_checkout ? 'eye' : 'eyeOff'} size={14} color="currentColor" />
              {coupon.show_at_checkout ? 'Listed at checkout' : 'Code only'}
            </span>
          ) : (
            <span className={clsx(styles.chip, styles.chipOff)}>{couponState(coupon)}</span>
          )}
        </span>
        <span className={styles.stubDeal}>{describeDeal(coupon)}</span>
        {rules.length > 0 && <span className={styles.stubRules}>{rules.join(' · ')}</span>}
        <span className={styles.stubUses}>
          {coupon.max_uses
            ? `Used ${coupon.used} of ${coupon.max_uses} times`
            : `Used ${coupon.used} ${coupon.used === 1 ? 'time' : 'times'}`}
        </span>
      </div>
      <div className={styles.stubSide}>
        <Switch
          checked={coupon.active}
          onChange={toggle}
          busy={busy}
          label={`${coupon.code} on`}
          onLabel={isMobile ? '' : 'On'}
          offLabel={isMobile ? '' : 'Off'}
        />
        <button type="button" onClick={onEdit} className={a.textButton}>
          Edit
        </button>
      </div>
    </article>
  );
}

function GroupHead({ title, count, note }) {
  return (
    <div className={styles.groupHead}>
      <div className={styles.groupTitleRow}>
        <h3 className={styles.groupTitle}>{title}</h3>
        <span className={styles.groupCount}>{count}</span>
        <span aria-hidden="true" className={styles.groupRule} />
      </div>
      <p className={styles.groupNote}>{note}</p>
    </div>
  );
}

function Segmented({ value, onChange, label, dark = false }) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={clsx(styles.segmented, dark && styles.segmentedDark)}
    >
      {TYPES.map((t) => (
        <button
          key={t.id}
          type="button"
          role="radio"
          aria-checked={value === t.id ? 'true' : 'false'}
          onClick={() => onChange(t.id)}
          className={clsx(styles.segment, value === t.id && styles.segmentOn)}
        >
          {t.label}
        </button>
      ))}
    </div>
  );
}
