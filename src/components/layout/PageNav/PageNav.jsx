import clsx from 'clsx';
import { Link } from 'react-router';
import { ROUTES } from '@/config/site';
import { useLayout } from '@/context/layout';
import { useWhatsAppContact } from '@/hooks/useWhatsAppContact';
import { Icon } from '@/components/ui/Icon/Icon';
import { Wordmark } from '@/components/ui/Wordmark/Wordmark';
import { ExternalLink } from '@/components/ui/ExternalLink/ExternalLink';
import { AccountButton } from '@/features/account/AccountButton';
import styles from './PageNav.module.css';

// The top bar of the inner pages (pilot menu, policies): the logo, a way back to the main site, sign-in (or the
// customer's khata), and help on WhatsApp. The page's header positions it through `className`.
export function PageNav({ className }) {
  const { isMobile } = useLayout();
  const whatsapp = useWhatsAppContact();
  return (
    <nav className={clsx(styles.nav, className)}>
      <Link to={ROUTES.home} aria-label="Hungrr home" className={styles.home}>
        <Wordmark className={styles.logo} />
      </Link>
      <div className={styles.actions}>
        <Link to={ROUTES.home} className={clsx(styles.back, isMobile && 'btn-light')}>
          <Icon name="arrowLeft" size={isMobile ? 17 : 20} color="var(--color-black)" />
          {isMobile ? 'Home' : 'Back to Hungrr'}
        </Link>
        <AccountButton />
        <ExternalLink
          href={whatsapp.href}
          aria-label="Help on WhatsApp"
          className={`${styles.help} btn-black`}
        >
          <Icon name="whatsapp" size={isMobile ? 22 : 20} color="var(--color-yellow)" />
          {!isMobile && 'Need help?'}
        </ExternalLink>
      </div>
    </nav>
  );
}
