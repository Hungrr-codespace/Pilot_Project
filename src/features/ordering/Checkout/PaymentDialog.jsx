import { useRef, useState } from 'react';
import { useOrder } from '@/context/order';
import { formatUpiRef, isValidUpiRef, normalizeUpiRef, UPI_REF_LENGTH } from '@/lib/checkout';
import { formatRupees } from '@/lib/format';
import { Icon } from '@/components/ui/Icon/Icon';
import { Dialog, DialogActions } from '@/components/ui/Dialog/Dialog';
import { TextField } from '@/components/ui/TextField/TextField';
import { BackButton, PrimaryButton } from '../OrderNotepad/NoteButtons';
import styles from './Checkout.module.css';

// Step 5, after paying: the 12-digit UPI reference number of the payment. It goes on the bill and into the
// Orders sheet, so we can match the payment and start the order quickly.
export function PaymentDialog() {
  const { state, summary, actions } = useOrder();
  const [upiRef, setUpiRef] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef(null);

  const submit = (event) => {
    event.preventDefault();
    if (!isValidUpiRef(upiRef)) {
      setError(`Enter all ${UPI_REF_LENGTH} digits of the UPI reference number.`);
      inputRef.current?.focus();
      return;
    }
    actions.confirmPayment(upiRef);
  };

  return (
    <Dialog
      eyebrow="Step 5 of 5 · Confirm payment"
      title="Enter your UPI reference number"
      description="Open the payment in your UPI app. The 12-digit number is in its details, called UPI Ref. No., UPI transaction ID or UTR."
      onClose={actions.closeDialog}
    >
      <div className={styles.paidFor}>
        <Icon name="checkCircle" size={22} color="var(--color-green)" />
        <span>
          {formatRupees(summary.grandTotal)} paid for order <b>{state.orderId}</b>
        </span>
      </div>
      <form onSubmit={submit} noValidate className={styles.form}>
        <TextField
          ref={inputRef}
          label="UPI reference number"
          inputMode="numeric"
          autoComplete="off"
          placeholder="1234 5678 9012"
          maxLength={UPI_REF_LENGTH + 2}
          value={formatUpiRef(upiRef)}
          onChange={(event) => {
            setUpiRef(normalizeUpiRef(event.target.value));
            setError('');
          }}
          error={error}
          hint={`${upiRef.length} of ${UPI_REF_LENGTH} digits`}
          inputClassName={styles.refInput}
        />
        <DialogActions>
          <BackButton onClick={actions.closeDialog} />
          <PrimaryButton type="submit" icon="check">
            Confirm payment
          </PrimaryButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
