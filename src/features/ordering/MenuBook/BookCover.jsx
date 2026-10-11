import { useLayout } from '@/context/layout';
import { Icon } from '@/components/ui/Icon/Icon';
import { Wordmark } from '@/components/ui/Wordmark/Wordmark';
import styles from './BookCover.module.css';

// The menu's black cover. Tapping anywhere on it opens the book.
export function BookCover({ onOpen }) {
  const { isMobile } = useLayout();
  return (
    <div className={styles.cover}>
      <div aria-hidden="true" className={styles.spine} />
      <div aria-hidden="true" className={styles.frame} />
      <div aria-hidden="true" className={styles.innerFrame} />
      <button type="button" onClick={onOpen} aria-label="Open the menu" className={styles.open}>
        <span className={styles.eyebrow}>The menu</span>
        <Wordmark tone="light" className={styles.logo} />
        <span className={styles.ornament}>
          <span className={styles.ornamentRule} />
          <Icon name="cutlery" size={isMobile ? 20 : 22} color="var(--color-yellow)" />
          <span className={styles.ornamentRule} />
        </span>
        <span className={styles.title}>Restaurant Partners</span>
        <span className={styles.cta}>
          <Icon name="bookOpen" size={isMobile ? 19 : 20} color="var(--color-yellow)" />
          {isMobile ? 'Tap to open the menu' : 'Open the menu'}
        </span>
      </button>
    </div>
  );
}
