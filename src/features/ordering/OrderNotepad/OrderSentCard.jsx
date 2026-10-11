import { useLayout } from '@/context/layout';
import { useMenu } from '@/context/menu';
import { useOrder } from '@/context/order';
import { formatUpiRef } from '@/lib/checkout';
import { buildOrderMessage, whatsappLink } from '@/lib/whatsapp';
import { Icon } from '@/components/ui/Icon/Icon';
import { ExternalLink } from '@/components/ui/ExternalLink/ExternalLink';
import styles from './OrderSentCard.module.css';

// Under the bill: the payment is in for checking. Send the bill on WhatsApp to speed things up, download it
// again, or start a new order.
export function OrderSentCard() {
  const { isMobile } = useLayout();
  const { settings } = useMenu();
  const { state, summary, actions } = useOrder();
  const { upiRef } = state.sentOrder;
  const message = buildOrderMessage({ summary, orderId: state.orderId, customer: state.customer, upiRef });
  const whatsappHref = whatsappLink(settings.whatsapp, message);

  return (
    <div className={styles.card}>
      <span className={styles.message}>
        Payment submitted! We&apos;ll check UPI ref no. {formatUpiRef(upiRef)} and start your order. Send your
        bill on WhatsApp to get it moving faster.
      </span>
      <span className={styles.saved}>
        <Icon name="download" size={isMobile ? 16 : 18} color="var(--color-green)" />
        Bill not in your downloads? Press Download bill.
      </span>
      <div className={styles.actions}>
        <ExternalLink href={whatsappHref} className={styles.whatsapp}>
          <span className={styles.whatsappIcon}>
            <Icon name="whatsapp" size={isMobile ? 19 : 22} color="var(--color-yellow)" />
          </span>
          Send bill on WhatsApp
        </ExternalLink>
        <div className={styles.secondary}>
          <button type="button" onClick={actions.downloadBillAgain} className={styles.download}>
            <Icon name="download" size={isMobile ? 16 : 18} color="var(--color-black)" />
            Download bill
          </button>
          <button type="button" onClick={actions.startNewOrder} className={styles.newOrder}>
            New order
          </button>
        </div>
      </div>
    </div>
  );
}
