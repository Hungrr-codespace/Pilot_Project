import { PageNav } from '@/components/layout/PageNav/PageNav';
import { ShopStatusPill } from '@/components/ui/ShopStatusPill/ShopStatusPill';
import styles from './TrackHeader.module.css';

// Top of the tracking page: the way back, today's ordering status, and what to enter.
export function TrackHeader() {
  return (
    <header className={styles.header}>
      <div aria-hidden="true" className={styles.backdrop} />
      <PageNav className={styles.nav} />
      <div className={styles.intro}>
        <div className={styles.pills}>
          <span className={styles.pill}>Order tracking</span>
          <ShopStatusPill />
        </div>
        <h1 className={styles.title}>Track your order</h1>
        <p className={styles.lead}>
          Enter your order ID and the phone number you ordered with to see where your food is, from payment to
          your door.
        </p>
      </div>
    </header>
  );
}
