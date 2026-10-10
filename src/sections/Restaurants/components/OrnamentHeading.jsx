import { Icon } from '@/components/ui/Icon/Icon';
import styles from './OrnamentHeading.module.css';

// A small caps heading between two rules, like on a printed menu: ——✦ HOW CLUSTERS WORK ✦——
export function OrnamentHeading({ children, sparkles = true }) {
  const sparkle = sparkles && <Icon name="sparkle" size={12} color="var(--color-black)" />;
  return (
    <div className={styles.ornament}>
      <div className={styles.row}>
        <span className={styles.rule} />
        {sparkle}
        <span className={styles.text}>{children}</span>
        {sparkle}
        <span className={styles.rule} />
      </div>
    </div>
  );
}
