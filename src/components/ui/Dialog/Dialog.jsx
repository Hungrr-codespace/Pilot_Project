import { useEffect, useId, useLayoutEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import clsx from 'clsx';
import { useLayout } from '@/context/layout';
import { Icon } from '@/components/ui/Icon/Icon';
import styles from './Dialog.module.css';

const FOCUSABLE = 'a[href], button:not([disabled]), input, textarea, select, [tabindex]:not([tabindex="-1"])';

// A pop-up box over the page: dims everything behind it, keeps keyboard focus inside, closes with Escape or the
// × button. It is drawn outside the page canvas, so it scales itself to match the design (see PageCanvas).
// It puts the cursor in its first text box, unless `focusInput` is false (then the keyboard stays down on phones
// until the customer taps a box).
export function Dialog({ eyebrow, title, description, onClose, focusInput = true, className, children }) {
  const { scale } = useLayout();
  const titleId = useId();
  const cardRef = useRef(null);
  const onCloseRef = useRef(onClose);
  useLayoutEffect(() => {
    onCloseRef.current = onClose;
  });

  useEffect(() => {
    const card = cardRef.current;
    const previous = document.activeElement;
    const { overflow } = document.body.style;
    document.body.style.overflow = 'hidden'; // the page behind stays put

    ((focusInput && card.querySelector('input, textarea')) || card).focus({ preventScroll: true });

    const onKeyDown = (event) => {
      if (event.key === 'Escape') onCloseRef.current?.();
      if (event.key !== 'Tab') return;
      // Keep Tab inside the dialog
      const items = [...card.querySelectorAll(FOCUSABLE)];
      const first = items[0];
      const last = items[items.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = overflow;
      previous?.focus?.({ preventScroll: true });
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, when the dialog opens
  }, []);

  return createPortal(
    <div className={styles.overlay}>
      <div
        ref={cardRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        className={clsx(styles.card, className)}
        style={{ zoom: scale }}
      >
        <button
          type="button"
          onClick={() => onCloseRef.current?.()}
          aria-label="Close"
          className={`${styles.close} btn-soft`}
        >
          <Icon name="close" size={20} color="var(--color-black)" />
        </button>
        {eyebrow && <span className={styles.eyebrow}>{eyebrow}</span>}
        <h2 id={titleId} className={styles.title}>
          {title}
        </h2>
        {description && <p className={styles.description}>{description}</p>}
        <div className={styles.body}>{children}</div>
      </div>
    </div>,
    document.body,
  );
}

// The row of buttons at the bottom of a dialog.
export function DialogActions({ children }) {
  return <div className={styles.actions}>{children}</div>;
}
