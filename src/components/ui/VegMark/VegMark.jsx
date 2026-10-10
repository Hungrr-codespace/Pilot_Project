import styles from './VegMark.module.css';

// The Indian food label: green square with a dot for veg, red square with a triangle for non-veg.
export function VegMark({ veg = true, size = 16 }) {
  const color = veg ? 'var(--color-green)' : 'var(--color-nonveg)';
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 18 18"
      role="img"
      aria-label={veg ? 'Veg' : 'Non-veg'}
      className={styles.mark}
    >
      <rect x="1" y="1" width="16" height="16" rx="3" fill="#FFFFFF" stroke={color} strokeWidth="2" />
      {veg ? (
        <circle cx="9" cy="9" r="4.2" fill={color} />
      ) : (
        <path d="M9 4.4 L13.6 12.6 L4.4 12.6 Z" fill={color} />
      )}
    </svg>
  );
}
