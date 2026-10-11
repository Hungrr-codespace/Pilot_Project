import clsx from 'clsx';
import { useLayout } from '@/context/layout';
import { Icon } from '@/components/ui/Icon/Icon';
import styles from './EmptyState.module.css';

// A centred "nothing here yet" message with a cutlery icon. `size="large"` is for a whole menu page.
export function EmptyState({ title, text, size = 'normal' }) {
  const { isMobile } = useLayout();
  const iconSize = { normal: isMobile ? 28 : 34, large: isMobile ? 30 : 36 }[size];
  return (
    <div className={clsx(styles.empty, styles[size])}>
      <span className={styles.icon}>
        <Icon name="cutlery" size={iconSize} color="var(--color-black)" />
      </span>
      <span className={styles.title}>{title}</span>
      <span className={styles.text}>{text}</span>
    </div>
  );
}
