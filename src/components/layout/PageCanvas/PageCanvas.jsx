import { useLayout } from '@/context/layout';
import styles from './PageCanvas.module.css';

// The page's drawing board: 1440 px wide on desktop, 390 px on mobile, scaled to fit the screen (CSS zoom keeps
// text crisp and layout exact at every size).
export function PageCanvas({ canvasRef, children }) {
  const { scale } = useLayout();
  return (
    <div className={styles.viewport}>
      <div ref={canvasRef} className={styles.canvas} style={{ zoom: scale }}>
        {children}
      </div>
    </div>
  );
}
