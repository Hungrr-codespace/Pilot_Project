import { useLayout } from '@/context/layout';
import { useMenu } from '@/context/menu';
import { useOrder } from '@/context/order';
import { buildOrderMessage, whatsappLink } from '@/lib/whatsapp';
import { Icon } from '@/components/ui/Icon/Icon';
import { ExternalLink } from '@/components/ui/ExternalLink/ExternalLink';
import styles from './OrderSentCard.module.css';

// Under the order photo: what to do next — send it on WhatsApp — plus download again or start a new order.
export function OrderSentCard() {
  const { isMobile } = useLayout();
  const { settings } = useMenu();
  const { state, summary, actions } = useOrder();
  const whatsappHref = whatsappLink(settings.whatsapp, buildOrderMessage(summary, state.orderId));

  return (
    <div className={styles.card}>
      <span className={styles.message}>
        Send the transaction screenshot and details along with this order summary photo on WhatsApp.
      </span>
      <span className={styles.saved}>
        <Icon name="download" size={isMobile ? 16 : 18} color="var(--color-green)" />
        Photo not in your downloads? Press the Download button and save it.
      </span>
      <div className={styles.actions}>
        <ExternalLink href={whatsappHref} className={styles.whatsapp}>
          <span className={styles.whatsappIcon}>
            <Icon name="whatsapp" size={isMobile ? 19 : 22} color="var(--color-yellow)" />
          </span>
          Open WhatsApp
        </ExternalLink>
        <div className={styles.secondary}>
          <button type="button" onClick={actions.downloadPhotoAgain} className={styles.download}>
            <Icon name="download" size={isMobile ? 16 : 18} color="var(--color-black)" />
            Download photo
          </button>
          <button type="button" onClick={actions.startNewOrder} className={styles.newOrder}>
            New order
          </button>
        </div>
      </div>
    </div>
  );
}
