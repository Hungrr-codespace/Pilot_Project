import { Link } from 'react-router';
import { CAMPUS_SHORT, IMAGES, ROUTES } from '@/config/site';
import { useLayout } from '@/context/layout';
import { Icon } from '@/components/ui/Icon/Icon';
import { Navbar } from '@/components/layout/Navbar/Navbar';
import { Section } from '@/components/layout/Section/Section';
import { PhoneMockup } from './PhoneMockup';
import styles from './Hero.module.css';

const FEATURES = ['Multiple restaurants', 'One checkout', 'One delivery'];

export function Hero() {
  const { isMobile } = useLayout();
  return (
    <Section as="header" className={styles.hero}>
      <div aria-hidden="true" className={styles.backdrop} />
      <Navbar />

      <div className={styles.copy}>
        <div className={styles.launchPill}>
          <Icon name="mapMarker" size={isMobile ? 17 : 20} color="var(--color-black)" />
          Launching soon at {CAMPUS_SHORT}
        </div>
        <h1 className={styles.title}>
          Order Smarter,
          <br />
          Not Harder.
        </h1>
        <p className={styles.lead}>
          Multiple restaurants, one delivery, zero hassle. Welcome to the future of hyper-local eating.
        </p>
        <div className={styles.ctaRow}>
          <Link to={ROUTES.pilot} className={`${styles.cta} btn-light`}>
            <span className={styles.ctaLabel}>
              {isMobile && <Icon name="cutlery" size={19} color="var(--color-yellow)" />}
              Order now
            </span>
            {isMobile ? (
              <Icon name="arrowRight" size={22} color="var(--color-black)" />
            ) : (
              <Icon name="arrowRightThin" size={28} color="#979797" />
            )}
          </Link>
        </div>
      </div>

      <PhoneMockup
        src={IMAGES.appHome}
        alt="Hungrr app home screen with offers, cuisines and restaurants"
        className={styles.phoneBack}
      />
      <PhoneMockup
        src={IMAGES.appCart}
        alt="Hungrr multi-restaurant cart with Babai Tiffins and Al Daaz in one order"
        className={styles.phoneFront}
      />
      <span className={styles.comingSoon}>App coming soon</span>
      <img
        src={IMAGES.itemsAddedCard}
        alt="4 items added from Babai Tiffins and Al Daaz"
        className={styles.itemsCard}
      />

      <div className={styles.features}>
        {FEATURES.map((feature) => (
          <span key={feature} className={styles.feature}>
            {isMobile ? (
              <Icon name="check" size={17} color="var(--color-yellow)" />
            ) : (
              <Icon name="checkBold" size={14} color="var(--color-yellow)" />
            )}
            {feature}
          </span>
        ))}
      </div>
    </Section>
  );
}
