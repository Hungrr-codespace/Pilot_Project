import clsx from 'clsx';
import { ClusterMap } from './components/ClusterMap';
import { CLUSTERS_INTRO, ClusterNote } from './components/ClusterNote';
import { OrnamentHeading } from './components/OrnamentHeading';
import styles from './ClusterGuide.module.css';

// Mobile: "How clusters work" card under the menu. On desktop this explanation is the menu book's left page
// (IntroPage) while the customer picks a restaurant.
export function ClusterGuide({ className }) {
  return (
    <div className={clsx(styles.guide, className)}>
      <OrnamentHeading sparkles={false}>How clusters work</OrnamentHeading>
      <p className={styles.text}>{CLUSTERS_INTRO}</p>
      <ClusterMap />
      <ClusterNote />
    </div>
  );
}
