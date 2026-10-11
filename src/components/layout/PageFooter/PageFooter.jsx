import { Link, NavLink } from 'react-router';
import { BRAND, LAUNCH_YEAR, LEGAL_LINKS, ROUTES } from '@/config/site';
import { useLayout } from '@/context/layout';
import { useWhatsAppContact } from '@/hooks/useWhatsAppContact';
import { Icon } from '@/components/ui/Icon/Icon';
import { Wordmark } from '@/components/ui/Wordmark/Wordmark';
import { ExternalLink } from '@/components/ui/ExternalLink/ExternalLink';
import styles from './PageFooter.module.css';

// A short footer for the inner pages (pilot menu, policies): help on WhatsApp, the main site and the policy
// pages (the one being read is marked as the current page).
export function PageFooter({ helpText = 'Questions about your order?' }) {
  const { isMobile } = useLayout();
  const whatsapp = useWhatsAppContact();
  return (
    <footer className={styles.footer}>
      <div className={styles.top}>
        <div className={styles.brand}>
          <Wordmark tone="light" className={styles.logo} />
          <span className={styles.tagline}>{BRAND.tagline}</span>
        </div>
        <div className={styles.help}>
          <span className={styles.helpText}>{helpText}</span>
          <ExternalLink href={whatsapp.href} className={`${styles.whatsapp} btn-yellow`}>
            <span className={styles.whatsappIcon}>
              <Icon name="whatsapp" size={isMobile ? 20 : 26} color="var(--color-yellow)" />
            </span>
            {whatsapp.displayNumber}
          </ExternalLink>
        </div>
      </div>
      <div className={styles.bottom}>
        <span>
          © {LAUNCH_YEAR} {BRAND.name}
        </span>
        <nav aria-label="More from Hungrr" className={styles.links}>
          <Link to={ROUTES.home}>Main site</Link>
          {LEGAL_LINKS.map((link) => (
            <NavLink key={link.id} to={link.to}>
              {link.label}
            </NavLink>
          ))}
        </nav>
      </div>
    </footer>
  );
}
