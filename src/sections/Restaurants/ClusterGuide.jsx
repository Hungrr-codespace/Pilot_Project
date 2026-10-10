import { ClusterMap } from './components/ClusterMap';
import { CLUSTERS_INTRO, ClusterNote } from './components/ClusterNote';
import { OrnamentHeading } from './components/OrnamentHeading';
import styles from './ClusterGuide.module.css';

// Mobile: "How clusters work" card under the menu (on desktop this is page 1 of the menu book).
export function ClusterGuide() {
  return (
    <div className={styles.guide}>
      <OrnamentHeading sparkles={false}>How clusters work</OrnamentHeading>
      <p className={styles.text}>{CLUSTERS_INTRO}</p>
      <ClusterMap />
      <ClusterNote />
    </div>
  );
}
