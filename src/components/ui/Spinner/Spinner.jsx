import clsx from 'clsx';
import styles from './Spinner.module.css';

// A small loading ring in the current text colour (or `color`). Hidden from screen readers: the button or
// text next to it says what is loading.
export function Spinner({ size = 18, color, className }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(styles.spinner, className)}
      style={{ width: size, height: size, ...(color ? { color } : null) }}
    />
  );
}
