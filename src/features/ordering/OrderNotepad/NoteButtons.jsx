import clsx from 'clsx';
import { useLayout } from '@/context/layout';
import { Icon } from '@/components/ui/Icon/Icon';
import styles from './NoteButtons.module.css';

export function BackButton({ onClick, label = 'Back' }) {
  const { isMobile } = useLayout();
  return (
    <button type="button" onClick={onClick} className={styles.back}>
      <Icon name="arrowLeft" size={isMobile ? 17 : 18} color="var(--color-black)" />
      {label}
    </button>
  );
}

// The main black button with a yellow icon badge. Without onClick (and not a form's submit button) it shows
// as disabled (grey).
export function PrimaryButton({ onClick, icon, type = 'button', className, children }) {
  const { isMobile } = useLayout();
  if (!onClick && type !== 'submit') {
    return (
      <span aria-disabled="true" className={clsx(styles.primary, styles.disabled, className)}>
        {children}
      </span>
    );
  }
  return (
    <button type={type} onClick={onClick} className={clsx(styles.primary, className)}>
      <span className={styles.badge}>
        <Icon name={icon} size={isMobile ? 18 : 22} color="var(--color-black)" />
      </span>
      {children}
    </button>
  );
}
