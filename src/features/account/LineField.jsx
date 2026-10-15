import { useId } from 'react';
import styles from './SignInDialog.module.css';

// A text box drawn as a line in the khata: the label above, what is typed in ink handwriting on the line.
export function LineField({ label, prefix, error, hint, ...props }) {
  const id = useId();
  const noteId = `${id}-note`;
  const note = error || hint;
  return (
    <div className={styles.lineField}>
      <label htmlFor={id} className={styles.lineLabel}>
        {label}
      </label>
      <div className={`${styles.line} ${error ? styles.lineInvalid : ''}`}>
        {prefix && <span className={styles.linePrefix}>{prefix}</span>}
        <input
          id={id}
          aria-invalid={error ? 'true' : undefined}
          aria-describedby={note ? noteId : undefined}
          className={styles.lineInput}
          {...props}
        />
      </div>
      {note && (
        <span id={noteId} className={error ? styles.lineError : styles.lineHint}>
          {note}
        </span>
      )}
    </div>
  );
}
