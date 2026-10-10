import clsx from 'clsx';
import styles from './DishPhoto.module.css';

// A round dish photo (from the sheet's QuickPicks tab). Size and placeholder look come from the caller.
export function DishPhoto({ dishType, className }) {
  return (
    <span
      aria-hidden="true"
      className={clsx(styles.photo, className)}
      style={{ backgroundImage: `url("${dishType.photo.replace(/"/g, '%22')}")` }}
    />
  );
}
