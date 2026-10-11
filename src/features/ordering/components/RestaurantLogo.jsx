import clsx from 'clsx';
import styles from './RestaurantLogo.module.css';

// A restaurant's round badge with its initials (black with yellow letters), or a "LOGO" placeholder when the
// sheet has no initials for it. Size it with `className`; style the placeholder with `[data-placeholder]`.
export function RestaurantLogo({ restaurant, className, title }) {
  const isPlaceholder = !restaurant.initials;
  return (
    <span
      className={clsx(styles.logo, className)}
      data-placeholder={isPlaceholder || undefined}
      title={title}
    >
      {isPlaceholder ? 'LOGO' : restaurant.initials}
    </span>
  );
}
