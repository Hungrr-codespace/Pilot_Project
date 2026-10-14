import { useState } from 'react';
import clsx from 'clsx';
import { reviewMonth } from '@/lib/reviews';
import { Icon } from '@/components/ui/Icon/Icon';
import { StarRating } from '@/features/reviews/StarRating';
import { useStaffData } from '@/features/staff/useStaff';
import { RefreshButton } from './RefreshButton';
import a from './admin.module.css';
import styles from './ReviewsQueue.module.css';

// Reviews: the ones customers agreed to share and that nobody has checked yet come first, as cards with
// "Show on website" / "Don't show" (this sets approved to Yes or No on the Reviews tab). Then the latest others.
// Approve for what the review says (no abuse, no personal details), not for its stars.
export function ReviewsQueue({ call }) {
  const reviews = useStaffData(call, 'reviews');
  if (reviews.phase === 'loading') return <div className={a.loading} />;
  if (reviews.phase === 'failed')
    return <p className={a.problem}>Reviews couldn&apos;t load. Refresh to try again.</p>;
  const { waiting = [], recent = [] } = reviews.data;

  return (
    <>
      <div className={a.panelHead}>
        <div>
          <h2 className={a.panelTitle}>Reviews to check ({waiting.length})</h2>
          <p className={a.panelNote}>
            Approve for what the words say (no abuse or personal details), not for the stars. The rating on
            the website counts every review either way.
          </p>
        </div>
        <RefreshButton at={reviews.at} onRefresh={() => reviews.load({ quiet: true })} />
      </div>
      {waiting.length ? (
        <div className={styles.grid}>
          {waiting.map((r) => (
            <ReviewItem key={r.order_id} review={r} call={call} reload={reviews.load} />
          ))}
        </div>
      ) : (
        <p className={a.empty}>No reviews waiting. New ones that customers agree to share show up here.</p>
      )}
      {recent.length > 0 && (
        <>
          <h3 className={styles.subhead}>Earlier reviews</h3>
          <div className={styles.grid}>
            {recent.map((r) => (
              <ReviewItem key={r.order_id} review={r} call={call} reload={reviews.load} compact />
            ))}
          </div>
        </>
      )}
    </>
  );
}

function ReviewItem({ review, call, reload, compact = false }) {
  const [busy, setBusy] = useState('');
  const decide = async (approved) => {
    setBusy(approved);
    await call('review_set', { order_id: review.order_id, approved });
    await reload({ quiet: true });
    setBusy('');
  };
  const state = !review.show
    ? 'Private (not shared by the customer)'
    : review.approved === 'Yes'
      ? 'Shown on the website'
      : review.approved
        ? 'Not shown'
        : 'Waiting for you';
  return (
    <article className={clsx(styles.card, review.rating <= 2 && styles.low, compact && styles.compact)}>
      <div className={styles.top}>
        <StarRating value={review.rating} size={18} />
        <span className={styles.meta}>
          {review.order_id} · {reviewMonth(review.created_at)}
        </span>
      </div>
      {review.comment ? (
        <p className={styles.comment}>{review.comment}</p>
      ) : (
        <p className={styles.noComment}>No words, just stars.</p>
      )}
      {review.tags.length > 0 && <span className={styles.tags}>{review.tags.join(' · ')}</span>}
      {review.improve && (
        <p className={styles.improve}>
          <b>For the team:</b> {review.improve}
        </p>
      )}
      <span className={styles.by}>
        {review.name || 'No name'} · {review.restaurants}
      </span>
      <div className={styles.foot}>
        <span className={styles.state}>{state}</span>
        {review.show && (
          <span className={styles.actions}>
            {review.approved !== 'Yes' && (
              <button
                type="button"
                onClick={() => decide('Yes')}
                aria-busy={busy === 'Yes' || undefined}
                className={`${a.button} ${a.small} ${a.primary} btn-black`}
              >
                <Icon name="check" size={15} color="var(--color-yellow)" />
                Show on website
              </button>
            )}
            {review.approved !== 'No' && (
              <button
                type="button"
                onClick={() => decide('No')}
                aria-busy={busy === 'No' || undefined}
                className={`${a.button} ${a.small} btn-light`}
              >
                Don&apos;t show
              </button>
            )}
          </span>
        )}
      </div>
    </article>
  );
}
