import clsx from 'clsx';
import { useLayout } from '@/context/layout';
import { Icon } from '@/components/ui/Icon/Icon';
import styles from './NoteButtons.module.css';

export function BackButton({ onClick }) {
  const { isMobile } = useLayout();
  return (
    <button type="button" onClick={onClick} className={styles.back}>
      <Icon name="arrowLeft" size={isMobile ? 17 : 18} color="var(--color-black)" />
      Back
    </button>
  );
}

// The main black button with a yellow icon badge. Without onClick it shows as disabled (grey).
export function PrimaryButton({ onClick, icon, className, children }) {
  const { isMobile } = useLayout();
  if (!onClick) {
    return (
      <span aria-disabled="true" className={clsx(styles.primary, styles.disabled, className)}>
        {children}
      </span>
    );
  }
  return (
    <button type="button" onClick={onClick} className={clsx(styles.primary, className)}>
      <span className={styles.badge}>
        <Icon name={icon} size={isMobile ? 18 : 22} color="var(--color-black)" />
      </span>
      {children}
    </button>
  );
}
