import { IMAGES } from '@/config/site';
import { useLayout } from '@/context/layout';
import { useMenu } from '@/context/menu';
import { useOrder } from '@/context/order';
import { formatRupees } from '@/lib/format';
import { qrCodePath } from '@/lib/qr';
import { buildUpiLink } from '@/lib/upi';
import { NoteActions, NoteBody, NoteHeading, NoteSheet } from './NoteSheet';
import { BackButton, PrimaryButton } from './NoteButtons';
import styles from './PaymentSheet.module.css';

// The sheet under the order: a UPI QR with the exact amount (and the order ID in the payment note).
export function PaymentSheet() {
  const { isMobile } = useLayout();
  const { settings } = useMenu();
  const { state, summary, actions } = useOrder();
  const amount = formatRupees(summary.grandTotal);
  const qr = qrCodePath(
    buildUpiLink({
      upiId: settings.upiId,
      upiName: settings.upiName,
      amount: summary.grandTotal,
      orderId: state.orderId,
    }),
  );
  const qrSize = isMobile ? 196 : 236;

  return (
    <NoteSheet className={styles.sheet}>
      <NoteBody>
        <NoteHeading
          eyebrow="Hungrr · Payment"
          title="Scan & pay"
          subtitle={`Pay ${amount} with any UPI app`}
        />
      </NoteBody>
      <div className={styles.qrBlock}>
        <div className={styles.qrFrame}>
          {qr ? (
            <svg
              width={qrSize}
              height={qrSize}
              viewBox={qr.viewBox}
              role="img"
              aria-label="UPI QR code to pay Hungrr"
              className={styles.qr}
            >
              <rect x="0" y="0" width="100%" height="100%" fill="#FFFFFF" />
              <path d={qr.path} fill="#000000" />
            </svg>
          ) : (
            <img src={IMAGES.upiQrFallback} alt="UPI QR code to pay Hungrr" className={styles.qrImage} />
          )}
        </div>
        <span className={styles.amount}>{amount}</span>
        <span className={styles.upiId}>UPI ID: {settings.upiId}</span>
      </div>
      <div className={styles.steps}>
        <span>1. Scan the code and pay {amount}</span>
        <span>
          {isMobile ? '2. Send us the payment screenshot' : '2. Send us the payment screenshot below'}
        </span>
      </div>
      <NoteActions>
        <BackButton onClick={actions.backToOrder} />
        <PrimaryButton icon="whatsapp" onClick={actions.sendPaidOrder} className={styles.paid}>
          {isMobile ? 'Paid? Send it' : 'Paid? Send on WhatsApp'}
        </PrimaryButton>
      </NoteActions>
    </NoteSheet>
  );
}
