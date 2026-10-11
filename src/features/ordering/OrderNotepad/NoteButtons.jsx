import clsx from 'clsx';
import { useLayout } from '@/context/layout';
import { Icon } from '@/components/ui/Icon/Icon';
import { Spinner } from '@/components/ui/Spinner/Spinner';
import styles from './NoteButtons.module.css';

export function BackButton({ onClick, label = 'Back' }) {
  const { isMobile } = useLayout();
  return (
    <button type="button" onClick={onClick} className={`${styles.back} btn-light`}>
      <Icon name="arrowLeft" size={isMobile ? 17 : 18} color="var(--color-black)" />
      {label}
    </button>
  );
}

// The main black button with a yellow icon badge. Without onClick (and not a form's submit button) it shows
// as disabled (grey). `busy` shows a spinner in the badge and ignores clicks while something loads.
export function PrimaryButton({ onClick, icon, type = 'button', busy = false, className, children }) {
  const { isMobile } = useLayout();
  if (!onClick && type !== 'submit') {
    return (
      <span aria-disabled="true" className={clsx(styles.primary, styles.disabled, className)}>
        {children}
      </span>
    );
  }
  return (
    <button
      type={type}
      onClick={busy ? undefined : onClick}
      aria-busy={busy || undefined}
      className={clsx(styles.primary, 'btn-black', busy && styles.busy, className)}
    >
      <span className={styles.badge}>
        {busy ? (
          <Spinner size={isMobile ? 18 : 22} color="var(--color-black)" />
        ) : (
          <Icon name={icon} size={isMobile ? 18 : 22} color="var(--color-black)" />
        )}
      </span>
      {children}
    </button>
  );
}
