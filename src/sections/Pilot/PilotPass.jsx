import { Link } from 'react-router';
import { CAMPUS, ROUTES } from '@/config/site';
import { useLayout } from '@/context/layout';
import { useShopStatus } from '@/context/shopStatus';
import { ShopStatusPill } from '@/components/ui/ShopStatusPill/ShopStatusPill';
import { Icon } from '@/components/ui/Icon/Icon';
import { Wordmark } from '@/components/ui/Wordmark/Wordmark';
import styles from './PilotPass.module.css';

// A black "pass" for the pilot: when orders are open (and whether they are open right now), where we deliver,
// how to pay, the button into the pilot menu, and the way to track an order.
export function PilotPass() {
  const { isMobile } = useLayout();
  const { hours } = useShopStatus();
  const details = [
    { icon: 'clock', label: 'Orders open', value: hours.label, live: true },
    { icon: 'mapMarker', label: 'Delivering to', value: `${CAMPUS} campus` },
    { icon: 'check', label: 'Pay with', value: 'Any UPI app' },
  ];
  return (
    <div className={styles.pass} data-reveal="">
      <span aria-hidden="true" className={styles.frame} />
      <span className={styles.eyebrow}>The pilot menu</span>
      <Wordmark tone="light" className={styles.wordmark} />
      <dl className={styles.details}>
        {details.map((detail) => (
          <div key={detail.label} className={styles.detail}>
            <span aria-hidden="true" className={styles.detailIcon}>
              <Icon name={detail.icon} size={isMobile ? 17 : 24} color="var(--color-black)" />
            </span>
            <span className={styles.detailText}>
              <dt className={styles.detailLabel}>{detail.label}</dt>
              <dd className={styles.detailValue}>
                {detail.value}
                {detail.live && <ShopStatusPill short tone="dark" className={styles.status} />}
              </dd>
            </span>
          </div>
        ))}
      </dl>
      <div className={styles.actions}>
        <Link to={ROUTES.pilot} className={`${styles.cta} btn-yellow`}>
          <span className={styles.ctaIcon}>
            <Icon name="bookOpen" size={isMobile ? 20 : 26} color="var(--color-yellow)" />
          </span>
          Open the pilot menu
          <Icon name="arrowRight" size={isMobile ? 20 : 24} color="var(--color-black)" />
        </Link>
        <Link to={ROUTES.track} className={`${styles.track} btn-ghost`}>
          <Icon name="moped" size={isMobile ? 20 : 24} color="var(--color-yellow)" />
          Track order
        </Link>
      </div>
    </div>
  );
}
