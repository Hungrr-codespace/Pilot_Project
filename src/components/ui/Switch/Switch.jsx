import clsx from 'clsx';
import styles from './Switch.module.css';

// An on/off switch (a button with role="switch"). `label` is read out; `onLabel`/`offLabel` show beside it.
export function Switch({
  checked,
  onChange,
  label,
  onLabel,
  offLabel,
  busy = false,
  tone = 'light',
  className,
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked ? 'true' : 'false'}
      aria-label={label}
      aria-busy={busy || undefined}
      onClick={() => !busy && onChange(!checked)}
      className={clsx(styles.switch, styles[tone], checked && styles.on, busy && styles.busy, className)}
    >
      <span aria-hidden="true" className={styles.track}>
        <span className={styles.knob} />
      </span>
      {(onLabel || offLabel) && <span className={styles.text}>{checked ? onLabel : offLabel}</span>}
    </button>
  );
}
