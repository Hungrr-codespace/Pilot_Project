import { CHECK_BOLD_512, ICONS } from './icons';

// A single-colour SVG icon. Decorative by default (hidden from screen readers); pass `label` when the icon is
// the only thing that explains something.
//   <Icon name="whatsapp" size={20} color="var(--color-yellow)" />
export function Icon({ name, size = 24, color = 'currentColor', label, className, style }) {
  const isBoldCheck = name === 'checkBold';
  const path = isBoldCheck ? CHECK_BOLD_512 : ICONS[name];
  if (!path) throw new Error(`Unknown icon: ${name}`);
  return (
    <svg
      width={size}
      height={size}
      viewBox={isBoldCheck ? '0 0 512 512' : '0 0 24 24'}
      aria-hidden={label ? undefined : 'true'}
      aria-label={label}
      role={label ? 'img' : undefined}
      className={className}
      style={style}
    >
      <path fill={color} d={path} />
    </svg>
  );
}
