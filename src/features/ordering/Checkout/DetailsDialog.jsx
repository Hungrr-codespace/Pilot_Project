import { useRef, useState } from 'react';
import { useAccount } from '@/context/account';
import { useLayout } from '@/context/layout';
import { useOrder } from '@/context/order';
import { formatIndianPhone, validateDetails } from '@/lib/checkout';
import { formatRupees } from '@/lib/format';
import { Dialog, DialogActions } from '@/components/ui/Dialog/Dialog';
import { TextField } from '@/components/ui/TextField/TextField';
import { BackButton, PrimaryButton } from '../OrderNotepad/NoteButtons';
import styles from './Checkout.module.css';

// Step 3, after "Confirm order": who is ordering and where to deliver. The QR shows once these are filled in.
// Signed in, the name and phone number come from the account and only the address is asked for.
export function DetailsDialog() {
  const { isMobile } = useLayout();
  const { state, summary, actions } = useOrder();
  const { user, signOut, openSignIn } = useAccount();
  const [form, setForm] = useState(state.customer);
  const [errors, setErrors] = useState({});
  const formRef = useRef(null);

  const field = (name) => ({
    name,
    value: form[name],
    error: errors[name],
    onChange: (event) => {
      setForm((current) => ({ ...current, [name]: event.target.value }));
      if (errors[name]) setErrors(({ [name]: _fixed, ...rest }) => rest);
    },
  });

  const submit = (event) => {
    event.preventDefault();
    const { values, errors: problems } = validateDetails(
      user ? { ...form, name: user.name, phone: user.phone } : form,
    );
    if (Object.keys(problems).length) {
      setErrors(problems);
      // Put the cursor in the first box that needs fixing
      const first = ['name', 'phone', 'address'].find((name) => problems[name]);
      formRef.current?.elements[first]?.focus();
      return;
    }
    actions.saveDetails(values);
  };

  // "Not you?": sign out, sign in with the right number, then come back to this step
  const switchAccount = () => {
    signOut();
    actions.closeDialog();
    openSignIn({ reason: 'order', onDone: actions.confirmOrder });
  };

  return (
    <Dialog
      eyebrow="Step 3 of 5 · Your details"
      title="Where should we deliver?"
      description={
        user
          ? "We'll call this number if anything changes. Your address is saved on this device for next time."
          : "We need these to bring your order and to call you if anything changes. They're saved on this device for your next order."
      }
      onClose={actions.closeDialog}
    >
      <form ref={formRef} onSubmit={submit} noValidate className={styles.form}>
        {user ? (
          <div className={styles.orderingAs}>
            <span className={styles.asLabel}>Ordering as</span>
            <span className={styles.asName}>{user.name}</span>
            <span className={styles.asPhone}>{formatIndianPhone(user.phone)}</span>
            <button type="button" onClick={switchAccount} className={styles.notYou}>
              Not you?
            </button>
          </div>
        ) : (
          <>
            <TextField
              label="Name"
              autoComplete="name"
              placeholder="Your full name"
              maxLength={60}
              {...field('name')}
            />
            <TextField
              label="Phone number"
              type="tel"
              inputMode="tel"
              autoComplete="tel-national"
              prefix="+91"
              placeholder="10-digit mobile number"
              maxLength={16}
              {...field('phone')}
            />
          </>
        )}
        <TextField
          label="Delivery address"
          multiline
          rows={2}
          autoComplete="street-address"
          placeholder="Hostel, room number, landmark"
          maxLength={200}
          {...field('address')}
        />
        <DialogActions>
          <BackButton onClick={actions.closeDialog} />
          <PrimaryButton type="submit" icon="arrowRight">
            {isMobile ? 'Continue to pay' : `Continue to pay · ${formatRupees(summary.grandTotal)}`}
          </PrimaryButton>
        </DialogActions>
      </form>
    </Dialog>
  );
}
