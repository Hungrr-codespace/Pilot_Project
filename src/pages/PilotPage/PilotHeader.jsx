import { CAMPUS } from '@/config/site';
import { useLayout } from '@/context/layout';
import { Icon } from '@/components/ui/Icon/Icon';
import { PageNav } from '@/components/layout/PageNav/PageNav';
import { ShopStatusPill } from '@/components/ui/ShopStatusPill/ShopStatusPill';
import { useShopStatus } from '@/context/shopStatus';
import { ShopNotice } from './ShopNotice';
import styles from './PilotHeader.module.css';

// Top of the pilot page: the way back to the main site, help on WhatsApp, and the title. (The five order steps
// sit with the menu, in OrderingArea, so they stay in view while ordering.)
export function PilotHeader() {
  const { isMobile } = useLayout();
  const { state } = useShopStatus();
  return (
    <header className={styles.header}>
      <div aria-hidden="true" className={styles.backdrop} />
      <PageNav className={styles.nav} />

      <div className={styles.intro}>
        <div className={styles.titleBlock}>
          <span className={styles.pills}>
            <span className={styles.pill}>
              <Icon name="mapMarker" size={isMobile ? 17 : 20} color="var(--color-black)" />
              Pilot menu · {CAMPUS}
            </span>
            <ShopStatusPill />
          </span>
          <h1 className={styles.title}>
            Open the menu,
            <br />
            pick your restaurants.
          </h1>
        </div>
        {state === 'open' || isMobile ? (
          <p className={styles.lead}>
            Turn the table or open the menu, add dishes from one or more restaurants, then pay by UPI and
            confirm your payment right here.
          </p>
        ) : (
          <ShopNotice />
        )}
        {state !== 'open' && isMobile && <ShopNotice />}
      </div>
    </header>
  );
}
