import clsx from 'clsx';
import { ResponsiveImage } from '@/components/ui/ResponsiveImage/ResponsiveImage';
import styles from './PhoneMockup.module.css';

// An app screenshot in a black phone frame. Position and shadow come from `className`. `image` as in
// ResponsiveImage; `priority` for the one people see first.
export function PhoneMockup({ image, alt, className, priority }) {
  return (
    <div className={clsx(styles.frame, className)}>
      <ResponsiveImage image={image} alt={alt} className={styles.screen} priority={priority} />
    </div>
  );
}
