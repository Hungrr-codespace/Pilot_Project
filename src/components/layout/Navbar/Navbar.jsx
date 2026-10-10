import { useState } from 'react';
import clsx from 'clsx';
import { NAV_LINKS } from '@/config/site';
import { useLayout } from '@/context/layout';
import { useWhatsAppContact } from '@/hooks/useWhatsAppContact';
import { Icon } from '@/components/ui/Icon/Icon';
import { Wordmark } from '@/components/ui/Wordmark/Wordmark';
import motion from '@/styles/motion.module.css';
import { ExternalLink } from '@/components/ui/ExternalLink/ExternalLink';
import styles from './Navbar.module.css';

// Top navigation: links and a WhatsApp button on desktop; a WhatsApp button and a menu on mobile.
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
  const whatsapp = useWhatsAppContact();
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
      <ExternalLink href={whatsapp.href} className={styles.whatsapp}>
        <Icon name="whatsapp" size={20} color="var(--color-white)" />
        Order on WhatsApp
      </ExternalLink>
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
          <ExternalLink href={whatsapp.href} aria-label="Order on WhatsApp" className={styles.roundWhatsapp}>
            <Icon name="whatsapp" size={22} color="var(--color-yellow)" />
          </ExternalLink>
          <button
            type="button"
            onClick={() => setIsOpen((open) => !open)}
            aria-label="Menu"
            aria-expanded={isOpen ? 'true' : 'false'}
            className={styles.menuButton}
          >
            <Icon name={isOpen ? 'close' : 'menu'} size={22} color="var(--color-black)" />
          </button>
        </div>
      </nav>
      {isOpen && (
        <div className={clsx(styles.menu, motion.fadeIn)}>
          {NAV_LINKS.map((link) => (
            <a key={link.href} href={link.href} onClick={close} className={styles.menuLink}>
              {link.label}
              <Icon name="chevronRight" size={22} color="var(--color-black)" />
            </a>
          ))}
          <ExternalLink href={whatsapp.href} className={styles.menuWhatsapp}>
            <Icon name="whatsapp" size={20} color="var(--color-yellow)" />
            Order on WhatsApp
          </ExternalLink>
        </div>
      )}
    </>
  );
}
