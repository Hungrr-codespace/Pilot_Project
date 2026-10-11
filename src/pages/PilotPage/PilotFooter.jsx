import { Link } from 'react-router';
import { BRAND, LAUNCH_YEAR, LEGAL_LINKS, ROUTES } from '@/config/site';
import { useLayout } from '@/context/layout';
import { useWhatsAppContact } from '@/hooks/useWhatsAppContact';
import { Icon } from '@/components/ui/Icon/Icon';
import { Wordmark } from '@/components/ui/Wordmark/Wordmark';
import { ExternalLink } from '@/components/ui/ExternalLink/ExternalLink';
import styles from './PilotFooter.module.css';

// A short footer for the pilot page: help on WhatsApp, the main site and the policy pages.
export function PilotFooter() {
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
          <span className={styles.helpText}>Questions about your order?</span>
          <ExternalLink href={whatsapp.href} className={styles.whatsapp}>
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
            <a key={link.href} href={link.href}>
              {link.label}
            </a>
          ))}
        </nav>
      </div>
    </footer>
  );
}
