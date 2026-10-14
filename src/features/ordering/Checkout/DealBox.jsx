import { useState } from 'react';
import { useLayout } from '@/context/layout';
import { useOrder } from '@/context/order';
import { COUPON_PROBLEMS, couponChoices, dealAmount, describeDeal, minOrderGap } from '@/lib/deals';
import { formatRupees } from '@/lib/format';
import { dateRange } from '@/lib/staff';
import { Icon } from '@/components/ui/Icon/Icon';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import styles from './DealBox.module.css';

// At checkout (step 3): the automatic offer this order gets, and a coupon code, with the coupons this customer
// can apply listed under the field (those the team marked "Listed at checkout"). Only one is used: whichever
// saves more, and the box says which. Shaped like a tear-off coupon.
export function DealBox() {
  const { isMobile } = useLayout();
  const { summary, deals, actions } = useOrder();
  const [code, setCode] = useState(deals.code || '');
  const { offer, coupon, error, checking } = deals;
  const applied = summary.deal;

  const apply = (value = code) => {
    if (!value.trim()) return;
    setCode(value);
    actions.applyCoupon(value);
  };

  // A valid coupon that isn't used: below its minimum order, or the offer saves more
  let couponNote = '';
  if (coupon && applied !== coupon) {
    const gap = minOrderGap(coupon, summary.itemTotal);
    if (gap)
      couponNote = `Add ${formatRupees(gap)} more to use ${coupon.code} (minimum ${formatRupees(coupon.min_order)}).`;
    else if (applied === offer)
      couponNote = `Your ${offer.name.toLowerCase()} saves more, so it's used instead. One offer per order.`;
  }
  const couponSaves = coupon ? dealAmount(coupon, summary.itemTotal, summary.delivery) : null;
  const hasList = !couponSaves && deals.available.length > 0;

  return (
    <div className={styles.box}>
      {!hasList && (
        <>
          <span aria-hidden="true" className={styles.notchLeft} />
          <span aria-hidden="true" className={styles.notchRight} />
        </>
      )}

      {offer && (
        <div className={applied === offer ? styles.offerOn : styles.offerOff}>
          <Icon name="tag" size={isMobile ? 16 : 18} color="currentColor" />
          <span>
            <b>{offer.name}</b>
            {applied === offer
              ? ` · −${formatRupees(summary.discount)}`
              : ' · not used (your coupon saves more)'}
          </span>
        </div>
      )}

      {coupon && couponSaves ? (
        <div className={styles.applied}>
          <span className={styles.code}>{coupon.code}</span>
          <span className={styles.what}>
            {describeDeal(coupon)}
            {applied === coupon && <b className={styles.saving}> · −{formatRupees(summary.discount)}</b>}
          </span>
          <button
            type="button"
            onClick={() => {
              actions.removeCoupon();
              setCode('');
            }}
            aria-label={`Remove coupon ${coupon.code}`}
            className={`${styles.remove} btn-soft`}
          >
            <Icon name="close" size={16} color="var(--color-black)" />
          </button>
        </div>
      ) : (
        <div className={styles.row}>
          <label htmlFor="coupon-code" className={styles.label}>
            Coupon code
          </label>
          <div className={styles.inputRow}>
            <input
              id="coupon-code"
              value={code}
              onChange={(event) => setCode(event.target.value.toUpperCase().replace(/\s/g, ''))}
              onKeyDown={(event) => {
                if (event.key === 'Enter') {
                  event.preventDefault(); // don't send the delivery form
                  apply();
                }
              }}
              placeholder="Have a code?"
              maxLength={16}
              autoComplete="off"
              autoCapitalize="characters"
              aria-invalid={error ? 'true' : undefined}
              aria-describedby={error ? 'coupon-problem' : undefined}
              className={styles.input}
            />
            <button
              type="button"
              onClick={() => apply()}
              aria-busy={checking || undefined}
              className={`${styles.apply} btn-black`}
            >
              {checking ? <Spinner size={16} color="var(--color-yellow)" /> : 'Apply'}
            </button>
          </div>
        </div>
      )}
      {error && (
        <span id="coupon-problem" role="alert" className={styles.problem}>
          {COUPON_PROBLEMS[error] || COUPON_PROBLEMS.unavailable}
        </span>
      )}
      {couponNote && <span className={styles.note}>{couponNote}</span>}
      {hasList && (
        <CouponList
          coupons={deals.available}
          summary={summary}
          offer={applied === offer ? offer : null}
          checkingCode={checking ? deals.code : ''}
          onApply={apply}
        />
      )}
    </div>
  );
}

const SHOW_FIRST = 3;

// "Coupons for you": each listed coupon with what it saves on this order, or how much more food it needs
function CouponList({ coupons, summary, offer, checkingCode, onApply }) {
  const { isMobile } = useLayout();
  const [showAll, setShowAll] = useState(false);
  const choices = couponChoices(coupons, summary.itemTotal, summary.delivery);
  const shown = showAll ? choices : choices.slice(0, SHOW_FIRST);
  const offerSaves = offer ? summary.discount : 0;

  return (
    <div className={styles.list}>
      {/* The perforation: the coupon's notches sit on this line */}
      <div className={styles.listHead}>
        <span aria-hidden="true" className={`${styles.notchLeft} ${styles.onLine}`} />
        <span>Coupons for you</span>
        <span aria-hidden="true" className={styles.listRule} />
        <span aria-hidden="true" className={`${styles.notchRight} ${styles.onLine}`} />
      </div>
      <ul className={styles.choices}>
        {shown.map(({ rule, saves, gap }) => {
          let line = `Saves ${formatRupees(saves)}`;
          if (gap) line = `Add ${formatRupees(gap)} more to use it`;
          else if (offer && offerSaves >= saves)
            line = `Your offer already saves ${formatRupees(offerSaves)}`;
          const until = rule.ends_on ? dateRange('', rule.ends_on) : '';
          const muted = gap > 0 || (offer && offerSaves >= saves);
          return (
            <li key={rule.code} className={muted ? styles.choiceMuted : styles.choice}>
              <span className={styles.choiceCode}>{rule.code}</span>
              <span className={styles.choiceText}>
                <span className={styles.choiceDeal}>
                  {describeDeal(rule)}
                  {rule.min_order > 0 && ` · on food over ${formatRupees(rule.min_order)}`}
                </span>
                <span className={gap ? styles.choiceGap : styles.choiceSaves}>
                  {line}
                  {until && !isMobile && ` · ${until}`}
                </span>
              </span>
              {!gap && (
                <button
                  type="button"
                  onClick={() => onApply(rule.code)}
                  aria-busy={checkingCode === rule.code || undefined}
                  aria-label={`Apply coupon ${rule.code}`}
                  className={`${styles.choiceApply} btn-light`}
                >
                  {checkingCode === rule.code ? <Spinner size={14} color="var(--color-black)" /> : 'Apply'}
                </button>
              )}
            </li>
          );
        })}
      </ul>
      {choices.length > SHOW_FIRST && (
        <button type="button" onClick={() => setShowAll((v) => !v)} className={styles.more}>
          {showAll ? 'Show fewer' : `Show all ${choices.length} coupons`}
        </button>
      )}
    </div>
  );
}
