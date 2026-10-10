import clsx from 'clsx';
import { IMAGES } from '@/config/site';
import styles from './Wordmark.module.css';

// The "hungrr" logo. `tone="dark"` (black letters) for light backgrounds, `tone="light"` for dark ones.
// Size it with a className (width and height).
export function Wordmark({ tone = 'dark', decorative = false, className }) {
  return (
    <img
      src={tone === 'light' ? IMAGES.wordmarkWhite : IMAGES.wordmarkBlack}
      alt={decorative ? '' : 'hungrr'}
      aria-hidden={decorative ? 'true' : undefined}
      className={clsx(styles.wordmark, className)}
    />
  );
}
