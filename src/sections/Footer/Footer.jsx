import { CONTACT_EMAIL, CONTACT_EMAIL_LINK, LAUNCH_YEAR, SOCIAL_LINKS } from '@/config/site';
import { useLayout } from '@/context/layout';
import { useWhatsAppContact } from '@/hooks/useWhatsAppContact';
import { Icon } from '@/components/ui/Icon/Icon';
import { Wordmark } from '@/components/ui/Wordmark/Wordmark';
import { Section } from '@/components/layout/Section/Section';
import { FooterRoad } from './FooterRoad';
import { Receipt } from './Receipt';
import { CONTACT_ROUTE } from './shapes';
import { ExternalLink } from '@/components/ui/ExternalLink/ExternalLink';
import styles from './Footer.module.css';

export function Footer() {
  const { isMobile } = useLayout();
  const whatsapp = useWhatsAppContact();

  return (
    <Section as="footer" id="footer" className={styles.footer}>
      <FooterRoad />

      <div className={styles.columns}>
        <div className={styles.contact}>
          <div className={styles.contactMain}>
            <div className={styles.orderCard}>
              {!isMobile && (
                <svg
                  width="600"
                  height="363"
                  viewBox={CONTACT_ROUTE.viewBox}
                  aria-hidden="true"
                  className={styles.route}
                >
                  <path d={CONTACT_ROUTE.d} />
                </svg>
              )}
              <div className={styles.orderCardContent}>
                <span className={styles.eyebrow}>Hungry already?</span>
                <h2 className={styles.orderTitle}>
                  Your next meal is{isMobile ? ' ' : <br />}one message away.
                </h2>
                <ExternalLink href={whatsapp.href} className={`${styles.phoneLink} btn-black`}>
                  <span className={styles.phoneIcon}>
                    <Icon name="whatsapp" size={isMobile ? 20 : 30} color="var(--color-black)" />
                  </span>
                  {whatsapp.displayNumber}
                </ExternalLink>
              </div>
            </div>
            <p className={styles.note}>
              Tap the number above to message us on WhatsApp.
              <br />
              Have a question or feedback? Email us.
            </p>
            <ExternalLink
              href={CONTACT_EMAIL_LINK}
              aria-label={`Email Hungrr at ${CONTACT_EMAIL}`}
              className={`${styles.emailLink} btn-ghost`}
            >
              <Icon name="email" size={isMobile ? 20 : 24} color="var(--color-yellow)" />
              {CONTACT_EMAIL}
            </ExternalLink>
          </div>

          <div className={styles.social}>
            <span className={styles.socialTitle}>Follow us</span>
            <div className={styles.socialLinks}>
              {SOCIAL_LINKS.map((link) => (
                <a
                  key={link.id}
                  href={link.href}
                  aria-label={`Hungrr on ${link.label}`}
                  className={`${styles.socialLink} btn-ghost`}
                >
                  <span className={styles.socialIcon}>
                    <Icon name={link.id} size={isMobile ? 18 : 24} color="var(--color-black)" />
                  </span>
                  {link.label}
                </a>
              ))}
            </div>
          </div>
        </div>

        <Receipt />
      </div>

      <div className={styles.copyright}>© {LAUNCH_YEAR} Hungrr</div>
      <Wordmark tone="light" decorative className={styles.watermark} />
    </Section>
  );
}
