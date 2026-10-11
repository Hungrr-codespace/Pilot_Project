import { forwardRef, useId } from 'react';
import clsx from 'clsx';
import styles from './TextField.module.css';

// A labelled text box with an optional fixed prefix ("+91"), a hint, and an error message in red.
// `multiline` makes it a text area. Other props (value, onChange, placeholder…) and `ref` go to the input itself.
export const TextField = forwardRef(function TextField(
  { label, hint, error, prefix, multiline = false, className, inputClassName, ...props },
  ref,
) {
  const id = useId();
  const noteId = `${id}-note`;
  const Input = multiline ? 'textarea' : 'input';
  const note = error || hint;
  return (
    <div className={clsx(styles.field, error && styles.invalid, className)}>
      <label htmlFor={id} className={styles.label}>
        {label}
      </label>
      <div className={clsx(styles.control, multiline && styles.multiline)}>
        {prefix && (
          <span aria-hidden="true" className={styles.prefix}>
            {prefix}
          </span>
        )}
        <Input
          ref={ref}
          id={id}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={note ? noteId : undefined}
          className={clsx(styles.input, inputClassName)}
          {...props}
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
