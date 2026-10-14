import { useMenu } from '@/context/menu';
import { Icon } from '@/components/ui/Icon/Icon';
import styles from './SiteBanner.module.css';

// The notice at the very top of every page (Settings → site_banner, set from the admin page's "Menu & notice").
// Hidden when empty.
export function SiteBanner() {
  const { settings } = useMenu();
  const text = settings.siteBanner;
  if (!text) return null;
  return (
    <div className={styles.banner} role="status">
      <Icon name="info" size={18} color="var(--color-yellow)" />
      <span>{text}</span>
    </div>
  );
}
