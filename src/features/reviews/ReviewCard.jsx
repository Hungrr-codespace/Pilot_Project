import clsx from 'clsx';
import { useLayout } from '@/context/layout';
import { reviewMonth } from '@/lib/reviews';
import { Icon } from '@/components/ui/Icon/Icon';
import { StarRating } from './StarRating';
import styles from './ReviewCard.module.css';

// One review, like a restaurant's comment card: stars, the words in handwriting, tags, and who wrote it.
// `tilt` turns it slightly (cards in a row alternate). `placeholder` replaces an empty comment (the preview on
// the feedback page); otherwise a card without words just says the rating.
export function ReviewCard({ review, tilt = 0, placeholder, className, ...rest }) {
  const { isMobile } = useLayout();
  const month = reviewMonth(review.date);
  return (
    <article
      className={clsx(styles.card, className)}
      style={tilt ? { '--tilt': `${tilt}deg` } : undefined}
      {...rest}
    >
      <div className={styles.top}>
        <StarRating value={review.rating} size={isMobile ? 18 : 22} />
        <span className={styles.verified}>
          <Icon name="checkCircle" size={isMobile ? 13 : 15} color="var(--color-green)" />
          Verified order
        </span>
      </div>
      {review.comment ? (
        <p className={styles.comment}>{review.comment}</p>
      ) : (
        <p className={clsx(styles.comment, styles.noComment)}>
          {placeholder || `Rated ${review.rating} out of 5.`}
        </p>
      )}
      {review.tags?.length > 0 && (
        <ul className={styles.tags}>
          {review.tags.map((tag) => (
            <li key={tag} className={styles.tag}>
              {tag}
            </li>
          ))}
        </ul>
      )}
      <div className={styles.by}>
        <span className={styles.name}>{review.name || 'Pilot customer'}</span>
        {month && <span className={styles.month}>{month}</span>}
      </div>
      {review.restaurants && <span className={styles.from}>Ordered from {review.restaurants}</span>}
    </article>
  );
}
