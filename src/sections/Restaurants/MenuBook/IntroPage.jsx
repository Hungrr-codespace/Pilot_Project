import { Icon } from '@/components/ui/Icon/Icon';
import { Wordmark } from '@/components/ui/Wordmark/Wordmark';
import { ClusterMap } from '../components/ClusterMap';
import { CLUSTERS_INTRO, ClusterNote } from '../components/ClusterNote';
import { OrnamentHeading } from '../components/OrnamentHeading';
import styles from './IntroPage.module.css';

// Desktop page 1 (inside the cover): what clusters are, and how to find food.
export function IntroPage() {
  return (
    <div className={styles.page}>
      <div className={styles.intro}>
        <Wordmark className={styles.logo} />
        <h3 className={styles.title}>Restaurant Partners</h3>
        <p className={styles.text}>{CLUSTERS_INTRO}</p>
      </div>
      <div className={styles.clusters}>
        <OrnamentHeading>How clusters work</OrnamentHeading>
        <ClusterMap />
        <ClusterNote />
      </div>
      <div className={styles.tips}>
        <Tip icon="search">Search for a restaurant or a dish on the next page.</Tip>
        <Tip icon="swipe">Or turn the table above and tap a dish.</Tip>
      </div>
    </div>
  );
}

function Tip({ icon, children }) {
  return (
    <div className={styles.tip}>
      <span className={styles.tipIcon}>
        <Icon name={icon} size={20} color="var(--color-black)" />
      </span>
      <span className={styles.tipText}>{children}</span>
    </div>
  );
}
