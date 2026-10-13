import { Link } from 'react-router';
import { ROUTES } from '@/config/site';
import { useLayout } from '@/context/layout';
import { plural } from '@/lib/format';
import { Icon } from '@/components/ui/Icon/Icon';
import { StarRating } from '@/features/reviews/StarRating';
import styles from './ReviewSummary.module.css';

// The yellow card: the average rating, how many reviews, how the stars split, the most-mentioned good things,
// and the way to add a review.
export function ReviewSummary({ summary, loading }) {
  const { isMobile } = useLayout();
  const { count, average, stars, topTags } = summary;
  const most = Math.max(1, ...stars.map((s) => s.count));

  return (
    <div className={styles.card} data-reveal="">
      <span className={styles.eyebrow}>Pilot rating</span>
      {count > 0 ? (
        <div className={styles.score}>
          <span className={styles.average}>{average.toFixed(1)}</span>
          <span className={styles.scoreSide}>
            <StarRating value={average} size={isMobile ? 20 : 26} tone="onYellow" />
            <span className={styles.count}>from {plural(count, 'review')}</span>
          </span>
        </div>
      ) : (
        <div className={styles.score}>
          <span className={styles.none}>{loading ? 'Loading…' : 'No ratings yet'}</span>
          {!loading && (
            <span className={styles.noneText}>The first ratings from the pilot will show up here.</span>
          )}
        </div>
      )}

      {count > 0 && (
        <ul className={styles.bars} aria-label="Ratings by stars">
          {stars.map(({ star, count: n }) => (
            <li key={star} className={styles.bar}>
              <span className={styles.barLabel}>
                {star}
                <Icon name="star" size={isMobile ? 12 : 14} color="var(--color-black)" />
              </span>
              <span className={styles.track}>
                <span className={styles.fill} style={{ width: `${(n / most) * 100}%` }} />
              </span>
              <span className={styles.barCount}>{n}</span>
            </li>
          ))}
        </ul>
      )}

      {topTags.length > 0 && (
        <div className={styles.loved}>
          <span className={styles.lovedLabel}>Most loved</span>
          <ul className={styles.tags}>
            {topTags.map(({ tag }) => (
              <li key={tag} className={styles.tag}>
                {tag}
              </li>
            ))}
          </ul>
        </div>
      )}

      <Link to={ROUTES.feedback} className={`${styles.cta} btn-black`}>
        <span className={styles.ctaIcon}>
          <Icon name="star" size={isMobile ? 18 : 22} color="var(--color-black)" />
        </span>
        Rate your order
      </Link>
      <span className={styles.ctaNote}>Ordered during the pilot? Use the order ID on your bill.</span>
    </div>
  );
}
