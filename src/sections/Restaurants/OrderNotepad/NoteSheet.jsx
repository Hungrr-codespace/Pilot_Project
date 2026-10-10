import clsx from 'clsx';
import styles from './NoteSheet.module.css';

// A ruled notepad sheet with a red margin and the pad's black top strip.
export function NoteSheet({ className, style, children }) {
  return (
    <div className={clsx(styles.sheet, className)} style={style}>
      <div aria-hidden="true" className={styles.margin} />
      <div aria-hidden="true" className={styles.strip} />
      {children}
    </div>
  );
}

// The handwritten text column, right of the margin.
export function NoteBody({ children }) {
  return <div className={styles.body}>{children}</div>;
}

// "HUNGRR · ORDER NOTE" / "Your order" / "Deliver to: …" at the top of a sheet.
export function NoteHeading({ eyebrow, title, subtitle }) {
  return (
    <>
      <span className={styles.eyebrow}>{eyebrow}</span>
      <span className={styles.title}>{title}</span>
      <span className={styles.subtitle}>{subtitle}</span>
    </>
  );
}

// The row of buttons along the bottom of a sheet.
export function NoteActions({ children }) {
  return <div className={styles.actions}>{children}</div>;
}
