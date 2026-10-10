import clsx from 'clsx';
import styles from './PhoneMockup.module.css';

// An app screenshot in a black phone frame. Position and shadow come from `className`.
export function PhoneMockup({ src, alt, className }) {
  return (
    <div className={clsx(styles.frame, className)}>
      <img src={src} alt={alt} className={styles.screen} />
    </div>
  );
}
