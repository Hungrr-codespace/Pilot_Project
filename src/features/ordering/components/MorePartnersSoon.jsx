import { useLayout } from '@/context/layout';
import { Icon } from '@/components/ui/Icon/Icon';
import styles from './MorePartnersSoon.module.css';

// Dashed placeholder row at the end of the restaurant list.
export function MorePartnersSoon() {
  const { isMobile } = useLayout();
  return (
    <div className={styles.row}>
      <span className={styles.icon}>
        <Icon name="plus" size={isMobile ? 16 : 20} color="#A6A6A6" />
      </span>
      <span className={styles.text}>More partners are joining soon</span>
    </div>
  );
}
