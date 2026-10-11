import clsx from 'clsx';
import { formatRupees } from '@/lib/format';
import styles from './OrderCharges.module.css';

// Item total, GST, delivery and the grand total, written on the note.
//   writeDelay  when set (seconds), the lines appear one after another as if being written
//   variant     'note' (the order notepad) or 'slip' (the torn-off order photo)
export function OrderCharges({ summary, writeDelay, variant = 'note' }) {
  const lines = [
    ['Item total', summary.itemTotal, 0.1],
    [summary.gstLabel, summary.gst, 0.22],
    [summary.deliveryLabel, summary.delivery, 0.34],
  ];
  const write = (offset) =>
    writeDelay === undefined ? undefined : { animationDelay: `${(writeDelay + offset).toFixed(2)}s` };
  const lineClass = clsx(styles.line, styles[variant], writeDelay !== undefined && styles.write);

  return (
    <div className={clsx(styles.charges, styles[variant])}>
      {lines.map(([label, amount, offset]) => (
        <span key={label} className={lineClass} style={write(offset)}>
          <span>{label}</span>
          <span>{formatRupees(amount)}</span>
        </span>
      ))}
      <span className={clsx(lineClass, styles.grand)} style={write(0.5)}>
        <span>Grand total</span>
        <span>{formatRupees(summary.grandTotal)}</span>
      </span>
    </div>
  );
}
