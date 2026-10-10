import clsx from 'clsx';
import { Icon } from '@/components/ui/Icon/Icon';
import { Wordmark } from '@/components/ui/Wordmark/Wordmark';
import { useLayout } from '@/context/layout';
import styles from './ChatPreview.module.css';

// A sample WhatsApp chat: the customer sends the order photo and payment screenshot, we confirm and deliver.
export function ChatPreview() {
  const { isMobile } = useLayout();
  const icon = (desktop, mobile) => (isMobile ? mobile : desktop);
  return (
    <div className={styles.card} data-reveal="" style={{ '--reveal-delay': '150ms' }}>
      <div className={styles.header}>
        <Wordmark className={styles.logo} />
        <span className={styles.channel}>
          <Icon name="whatsapp" size={icon(20, 17)} color="var(--color-black)" />
          On WhatsApp
        </span>
      </div>
      <div className={styles.messages}>
        <div className={clsx(styles.sent, styles.withAttachment)}>
          <div className={styles.attachment}>
            <span className={styles.attachmentThumb}>
              <Icon name="notebook" size={icon(24, 18)} color="var(--color-black)" />
            </span>
            <span className={styles.attachmentText}>
              <span className={styles.attachmentTitle}>Order summary photo</span>
              <span className={styles.attachmentMeta}>Babai Tiffins · Al Daaz</span>
            </span>
          </div>
          <div className={styles.caption}>Hi Hungrr! Here is my order from the website. Paid by UPI.</div>
        </div>
        <div className={styles.sent}>
          <span className={styles.row}>
            <span className={styles.imageThumb}>
              <Icon name="image" size={icon(24, 17)} color={icon('#676767', '#4A4A4A')} />
            </span>
            Payment screenshot
          </span>
        </div>
        <div className={styles.received}>
          Got it! Checking your payment and confirming with both restaurants.
        </div>
        <div className={styles.received}>
          <span className={styles.row}>
            <Icon
              name="checkCircle"
              size={icon(20, 17)}
              color="var(--color-green)"
              style={isMobile ? undefined : { flexShrink: 0 }}
            />
            Payment received. Your food is being prepared.
          </span>
        </div>
        <div className={clsx(styles.received, styles.withLocation)}>
          Your rider has picked up your full order and is on the way.
          <span className={styles.location}>
            <Icon name="mapMarker" size={icon(20, 16)} color="var(--color-green)" />
            Live location shared
          </span>
        </div>
      </div>
    </div>
  );
}
