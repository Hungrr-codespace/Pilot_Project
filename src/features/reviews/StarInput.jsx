import { useState } from 'react';
import clsx from 'clsx';
import { ICONS } from '@/components/ui/Icon/icons';
import { RATING_WORDS } from '@/lib/reviews';
import styles from './StarInput.module.css';

// Choose 1–5 stars: tap (or use the arrow keys, it is a radio group). Hovering previews the rating.
export function StarInput({ value, onChange, size = 44, error, id = 'rating' }) {
  const [preview, setPreview] = useState(0);
  const shown = preview || value;
  return (
    <div className={styles.wrap}>
      <div
        role="radiogroup"
        aria-label="Your rating"
        aria-invalid={error ? 'true' : undefined}
        aria-describedby={error ? `${id}-error` : undefined}
        className={styles.stars}
        onMouseLeave={() => setPreview(0)}
      >
        {[1, 2, 3, 4, 5].map((star) => (
          <label
            key={star}
            className={clsx(styles.star, star <= shown && styles.on)}
            onMouseEnter={() => setPreview(star)}
            style={{ width: size, height: size }}
          >
            <input
              type="radio"
              name={id}
              value={star}
              checked={value === star}
              onChange={() => onChange(star)}
              className={styles.input}
              aria-label={`${star} star${star > 1 ? 's' : ''}: ${RATING_WORDS[star]}`}
            />
            <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true">
              <path d={ICONS.star} />
            </svg>
          </label>
        ))}
      </div>
      <span className={clsx(styles.word, !shown && styles.wordEmpty)} aria-hidden="true">
        {shown ? RATING_WORDS[shown] : 'Tap a star'}
      </span>
      {error && (
        <span id={`${id}-error`} className={styles.error}>
          {error}
        </span>
      )}
    </div>
  );
}
