import { forwardRef } from 'react';
import { TextField } from '@/components/ui/TextField/TextField';
import { PrimaryButton } from '@/features/ordering/OrderNotepad/NoteButtons';
import styles from './TrackForm.module.css';

// Order ID and phone number. The page owns the values, so a recent order can fill them in.
export const TrackForm = forwardRef(function TrackForm({ values, errors, onChange, onSubmit, busy }, ref) {
  const field = (name) => ({
    name,
    value: values[name],
    error: errors[name],
    onChange: (event) => onChange(name, event.target.value),
  });

  return (
    <form ref={ref} onSubmit={onSubmit} noValidate className={styles.card}>
      <h2 className={styles.heading}>Find your order</h2>
      <TextField
        label="Order ID"
        placeholder="HG-261011-K7Q2"
        autoCapitalize="characters"
        autoComplete="off"
        spellCheck={false}
        maxLength={20}
        hint="It's on your bill and starts with HG."
        inputClassName={styles.orderId}
        {...field('orderId')}
      />
      <TextField
        label="Phone number"
        type="tel"
        inputMode="tel"
        autoComplete="tel-national"
        prefix="+91"
        placeholder="98765 43210"
        maxLength={16}
        hint="The number you ordered with."
        {...field('phone')}
      />
      <PrimaryButton type="submit" icon="moped" busy={busy} className={styles.submit}>
        {busy ? 'Finding your order…' : 'Track order'}
      </PrimaryButton>
    </form>
  );
});
