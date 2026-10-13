import clsx from 'clsx';
import { ICONS } from '@/components/ui/Icon/icons';
import styles from './StarRating.module.css';

// Five stars filled up to `value` (4.6 fills four and most of the fifth). For showing a rating, not choosing one.
export function StarRating({ value = 0, size = 20, tone = 'light', label, className }) {
  const rounded = Math.max(0, Math.min(5, value));
  return (
    <span
      className={clsx(styles.stars, styles[tone], className)}
      role="img"
      aria-label={label || `${Math.round(rounded * 10) / 10} out of 5 stars`}
    >
      {[0, 1, 2, 3, 4].map((i) => {
        const fill = Math.max(0, Math.min(1, rounded - i));
        return (
          <span key={i} className={styles.star} style={{ width: size, height: size }}>
            <svg viewBox="0 0 24 24" width={size} height={size} aria-hidden="true" className={styles.empty}>
              <path d={ICONS.star} />
            </svg>
            {fill > 0 && (
              <span className={styles.fillClip} style={{ width: `${fill * 100}%` }}>
                <svg
                  viewBox="0 0 24 24"
                  width={size}
                  height={size}
                  aria-hidden="true"
                  className={styles.full}
                >
                  <path d={ICONS.star} />
                </svg>
              </span>
            )}
          </span>
        );
      })}
    </span>
  );
}
