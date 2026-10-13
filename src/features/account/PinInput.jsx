import { forwardRef, useId, useState } from 'react';
import clsx from 'clsx';
import { useLayout } from '@/context/layout';
import { PIN_LENGTH, cleanPin } from '@/lib/account';
import { Icon } from '@/components/ui/Icon/Icon';
import styles from './PinInput.module.css';

// Six boxes for the PIN, like the cells of a ledger. One real input sits over the boxes (so typing, pasting,
// password managers and the number pad all work); the boxes show a dot per digit, or the digits with "Show".
export const PinInput = forwardRef(function PinInput(
  { label, value, onChange, error, hint, autoComplete = 'current-password', name = 'pin', autoFocus },
  ref,
) {
  const { isMobile } = useLayout();
  const id = useId();
  const noteId = `${id}-note`;
  const [focused, setFocused] = useState(false);
  const [shown, setShown] = useState(false);
  const digits = value.split('');
  const current = Math.min(digits.length, PIN_LENGTH - 1);
  const note = error || hint;
  return (
    <div className={clsx(styles.field, error && styles.invalid)}>
      <div className={styles.labelRow}>
        <label htmlFor={id} className={styles.label}>
          {label}
        </label>
        <button
          type="button"
          onClick={() => setShown((s) => !s)}
          aria-pressed={shown ? 'true' : 'false'}
          className={`${styles.show} btn-soft`}
        >
          <Icon name={shown ? 'eyeOff' : 'eye'} size={isMobile ? 16 : 18} color="currentColor" />
          {shown ? 'Hide' : 'Show'}
        </button>
      </div>
      <div className={styles.cells}>
        {Array.from({ length: PIN_LENGTH }, (_, i) => (
          <span
            key={i}
            aria-hidden="true"
            className={clsx(
              styles.cell,
              i < digits.length && styles.filled,
              focused && i === current && styles.current,
            )}
          >
            {i < digits.length && (shown ? digits[i] : <span className={styles.dot} />)}
          </span>
        ))}
        <input
          ref={ref}
          id={id}
          name={name}
          type={shown ? 'text' : 'password'}
          inputMode="numeric"
          pattern="[0-9]*"
          autoComplete={autoComplete}
          maxLength={PIN_LENGTH}
          value={value}
          autoFocus={autoFocus}
          onChange={(event) => onChange(cleanPin(event.target.value))}
          onFocus={() => setFocused(true)}
          onBlur={() => setFocused(false)}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={note ? noteId : undefined}
          className={styles.input}
        />
      </div>
      {note && (
        <span id={noteId} className={error ? styles.error : styles.hint}>
          {note}
        </span>
      )}
    </div>
  );
});
