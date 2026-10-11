import clsx from 'clsx';
import styles from './SectionHeader.module.css';

// The heading block at the top of each section: a pill label, a big title and a short intro.
//   layout="split"    desktop: title on the left, intro on the right (bottom-aligned)
//   layout="stacked"  desktop: intro under the title
// On mobile it is always stacked.
export function SectionHeader({ label, title, intro, introWidth, layout = 'split', className }) {
  return (
    <div className={clsx(styles.header, styles[layout], className)} data-reveal="">
      <div className={styles.titleGroup}>
        <div className={styles.label}>{label}</div>
        <h2 className={styles.title}>{title}</h2>
      </div>
      <p className={styles.intro} style={introWidth ? { '--intro-width': `${introWidth}px` } : undefined}>
        {intro}
      </p>
    </div>
  );
}

// The highlighted second part of a section title (green, or yellow on a dark panel).
export function Highlight({ children }) {
  return <span className={styles.highlight}>{children}</span>;
}
