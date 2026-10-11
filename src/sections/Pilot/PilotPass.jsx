import { Link } from 'react-router';
import { CAMPUS, ORDER_HOURS, ROUTES } from '@/config/site';
import { useLayout } from '@/context/layout';
import { Icon } from '@/components/ui/Icon/Icon';
import { Wordmark } from '@/components/ui/Wordmark/Wordmark';
import styles from './PilotPass.module.css';

const DETAILS = [
  { icon: 'clock', label: 'Orders open', value: ORDER_HOURS },
  { icon: 'mapMarker', label: 'Delivering to', value: `${CAMPUS} campus` },
  { icon: 'check', label: 'Pay with', value: 'Any UPI app' },
];

// A black "pass" for the pilot: when orders are open, where we deliver, how to pay, and the button into the
// pilot menu.
export function PilotPass() {
  const { isMobile } = useLayout();
  return (
    <div className={styles.pass} data-reveal="">
      <span aria-hidden="true" className={styles.frame} />
      <span className={styles.eyebrow}>The pilot menu</span>
      <Wordmark tone="light" className={styles.wordmark} />
      <dl className={styles.details}>
        {DETAILS.map((detail) => (
          <div key={detail.label} className={styles.detail}>
            <span aria-hidden="true" className={styles.detailIcon}>
              <Icon name={detail.icon} size={isMobile ? 17 : 24} color="var(--color-black)" />
            </span>
            <span className={styles.detailText}>
              <dt className={styles.detailLabel}>{detail.label}</dt>
              <dd className={styles.detailValue}>{detail.value}</dd>
            </span>
          </div>
        ))}
      </dl>
      <Link to={ROUTES.pilot} className={styles.cta}>
        <span className={styles.ctaIcon}>
          <Icon name="bookOpen" size={isMobile ? 20 : 26} color="var(--color-yellow)" />
        </span>
        Open the pilot menu
        <Icon name="arrowRight" size={isMobile ? 20 : 24} color="var(--color-black)" />
      </Link>
    </div>
  );
}
