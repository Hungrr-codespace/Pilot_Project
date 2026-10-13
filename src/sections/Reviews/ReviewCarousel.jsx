import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import { useLayout } from '@/context/layout';
import { Icon } from '@/components/ui/Icon/Icon';
import { ReviewCard } from '@/features/reviews/ReviewCard';
import styles from './ReviewCarousel.module.css';

const TILTS = [-1.5, 1, -0.5, 1.5, -1];

// The review cards in a row that scrolls sideways (swipe on phones, arrows on desktop). Before any review is
// approved, one dashed card invites the first review (the button to rate is on the rating card beside it).
export function ReviewCarousel({ reviews, loading }) {
  const { isMobile } = useLayout();
  const rowRef = useRef(null);
  const [edges, setEdges] = useState({ start: true, end: true });

  const measure = useCallback(() => {
    const row = rowRef.current;
    if (!row) return;
    setEdges({ start: row.scrollLeft < 8, end: row.scrollLeft + row.clientWidth > row.scrollWidth - 8 });
  }, []);

  useEffect(() => {
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [measure, reviews.length]);

  const scrollBy = (direction) => {
    const row = rowRef.current;
    const card = row?.querySelector('article');
    if (!row || !card) return;
    row.scrollBy({ left: direction * (card.offsetWidth + 28), behavior: 'smooth' });
  };

  if (loading) {
    return (
      <div className={styles.carousel} aria-busy="true">
        <div className={styles.row}>
          {[0, 1].map((i) => (
            <div key={i} className={styles.skeleton} />
          ))}
        </div>
      </div>
    );
  }

  if (!reviews.length) {
    return (
      <div className={styles.carousel}>
        <div className={styles.first} data-reveal="">
          <span className={styles.firstIcon}>
            <Icon name="star" size={isMobile ? 24 : 32} color="var(--color-black)" />
          </span>
          <h3 className={styles.firstTitle}>Your review could be the first one here</h3>
          <p className={styles.firstText}>
            Ordered during the pilot? Rate your order with the order ID on your bill. Reviews appear here once
            you agree to share them and our team has checked them.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.carousel}>
      <div ref={rowRef} className={styles.row} onScroll={measure} tabIndex={0} aria-label="Reviews">
        {reviews.map((review, i) => (
          <ReviewCard
            key={`${review.name}-${review.date}-${i}`}
            review={review}
            tilt={isMobile ? 0 : TILTS[i % TILTS.length]}
            className={styles.card}
          />
        ))}
      </div>
      {!isMobile && !(edges.start && edges.end) && (
        <div className={styles.arrows}>
          <button
            type="button"
            onClick={() => scrollBy(-1)}
            disabled={edges.start}
            aria-label="Earlier reviews"
            className={clsx(styles.arrow, 'btn-ghost')}
          >
            <Icon name="chevronLeft" size={26} color="currentColor" />
          </button>
          <button
            type="button"
            onClick={() => scrollBy(1)}
            disabled={edges.end}
            aria-label="More reviews"
            className={clsx(styles.arrow, 'btn-ghost')}
          >
            <Icon name="chevronRight" size={26} color="currentColor" />
          </button>
        </div>
      )}
    </div>
  );
}
