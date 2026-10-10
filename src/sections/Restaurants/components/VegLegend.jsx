import { VegMark } from '@/components/ui/VegMark/VegMark';
import styles from './VegLegend.module.css';

// "▣ Veg  ▲ Non-veg" key at the top of a menu page.
export function VegLegend() {
  return (
    <span className={styles.legend}>
      <span className={styles.item}>
        <VegMark veg />
        Veg
      </span>
      <span className={styles.item}>
        <VegMark veg={false} />
        Non-veg
      </span>
    </span>
  );
}
