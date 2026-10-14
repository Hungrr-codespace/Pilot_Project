import clsx from 'clsx';
import { formatRupees } from '@/lib/format';
import { chargeLines } from '@/lib/pricing';
import styles from './OrderCharges.module.css';

// Item total, the offer or coupon (as "−₹39"), GST, delivery and the grand total, written on the note.
//   writeDelay  when set (seconds), the lines appear one after another as if being written
//   variant     'note' (the order notepad) or 'slip' (the torn-off order photo)
export function OrderCharges({ summary, writeDelay, variant = 'note' }) {
  const lines = chargeLines(summary).map((line, i) => ({ ...line, offset: 0.1 + i * 0.12 }));
  const write = (offset) =>
    writeDelay === undefined ? undefined : { animationDelay: `${(writeDelay + offset).toFixed(2)}s` };
  const lineClass = clsx(styles.line, styles[variant], writeDelay !== undefined && styles.write);

  return (
    <div className={clsx(styles.charges, styles[variant])}>
      {lines.map(({ label, text, discount, offset }) => (
        <span key={label} className={clsx(lineClass, discount && styles.discount)} style={write(offset)}>
          <span className={styles.label}>{label}</span>
          <span>{text}</span>
        </span>
      ))}
      <span className={clsx(lineClass, styles.grand)} style={write(0.14 + lines.length * 0.12)}>
        <span>Grand total</span>
        <span>{formatRupees(summary.grandTotal)}</span>
      </span>
    </div>
  );
}
