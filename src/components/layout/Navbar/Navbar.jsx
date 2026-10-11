import { useState } from 'react';
import { Link } from 'react-router';
import clsx from 'clsx';
import { NAV_LINKS, ROUTES } from '@/config/site';
import { useLayout } from '@/context/layout';
import { useWhatsAppContact } from '@/hooks/useWhatsAppContact';
import { Icon } from '@/components/ui/Icon/Icon';
import { Wordmark } from '@/components/ui/Wordmark/Wordmark';
import motion from '@/styles/motion.module.css';
import { ExternalLink } from '@/components/ui/ExternalLink/ExternalLink';
import styles from './Navbar.module.css';

// Main page navigation: section links and an "Order now" button (to the pilot menu) on desktop; a WhatsApp
// button and a menu on mobile.
export function Navbar() {
  const { isMobile } = useLayout();
  return isMobile ? <MobileNavbar /> : <DesktopNavbar />;
}

function HomeLink() {
  return (
    <a href="#" aria-label="Hungrr home" className={styles.home}>
      <Wordmark className={styles.logo} />
    </a>
  );
}

function DesktopNavbar() {
  return (
    <nav className={styles.nav}>
      <HomeLink />
      <div className={styles.links}>
        {NAV_LINKS.map((link) => (
          <a key={link.href} href={link.href}>
            {link.label}
          </a>
        ))}
      </div>
      <Link to={ROUTES.pilot} className={`${styles.orderNow} btn-black`}>
        <Icon name="cutlery" size={20} color="var(--color-yellow)" />
        Order now
      </Link>
    </nav>
  );
}

function MobileNavbar() {
  const whatsapp = useWhatsAppContact();
  const [isOpen, setIsOpen] = useState(false);
  const close = () => setIsOpen(false);
  return (
    <>
      <nav className={styles.nav}>
        <HomeLink />
        <div className={styles.actions}>
          <ExternalLink
            href={whatsapp.href}
            aria-label="Message us on WhatsApp"
            className={`${styles.roundWhatsapp} btn-black`}
          >
            <Icon name="whatsapp" size={22} color="var(--color-yellow)" />
          </ExternalLink>
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-label="Menu"
            aria-expanded={isOpen ? 'true' : 'false'}
            className={`${styles.menuButton} btn-light`}
          >
            <Icon name={isOpen ? 'close' : 'menu'} size={22} color="var(--color-black)" />
          </button>
        </div>
      </nav>
      {isOpen && (
        <div className={clsx(styles.menu, motion.fadeIn)}>
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={close} className={`${styles.menuLink} btn-row`}>
              {link.label}
              <Icon name="chevronRight" size={22} color="var(--color-black)" />
            </a>
          ))}
          <Link to={ROUTES.pilot} onClick={close} className={`${styles.menuOrder} btn-black`}>
            <Icon name="cutlery" size={20} color="var(--color-yellow)" />
            Order now
          </Link>
        </div>
      )}
    </>
  );
}
