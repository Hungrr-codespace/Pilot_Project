import clsx from 'clsx';
import { useLayout } from '@/context/layout';
import styles from './BookPage.module.css';

// A cream menu page with a printed double border. Left pages have the spine shadow on their right edge.
// `number` prints "— 2 —" at the bottom (desktop only). Page content positions itself inside the page.
export function BookPage({ side = 'right', number, children }) {
  const { isMobile } = useLayout();
  return (
    <div className={clsx(styles.page, styles[side])}>
      <div aria-hidden="true" className={styles.border} />
      {!isMobile && <div aria-hidden="true" className={styles.innerBorder} />}
      {children}
      {!isMobile && number && <span className={styles.number}>— {number} —</span>}
    </div>
  );
}
