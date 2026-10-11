import clsx from 'clsx';
import styles from './BookLeaf.module.css';

// A page that turns: `front` faces up, `back` shows once it has turned over (rotated 180°).
export function BookLeaf({ isTurned, className, style, front, back }) {
  return (
    <div
      className={clsx(styles.leaf, className)}
      style={{ ...style, transform: `rotateY(${isTurned ? -180 : 0}deg)` }}
    >
      <div className={styles.face}>{front}</div>
      {back && <div className={clsx(styles.face, styles.backFace)}>{back}</div>}
    </div>
  );
}
