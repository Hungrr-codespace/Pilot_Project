import clsx from 'clsx';
import { Icon } from '@/components/ui/Icon/Icon';
import { plural } from '@/lib/format';
import { DishPhoto } from '../components/DishPhoto';
import { TABLE, normalizeAngle, plateOpacity } from './tableGeometry';
import styles from './TablePlate.module.css';

// One plate on the table: a dish photo with its name and how many restaurants serve it.
//   angle     the plate's place on the table, in degrees
//   rotation  how far the table is turned, in degrees
export function TablePlate({ dishType, angle, rotation, servedBy, isSelected, isMobile, onPick }) {
  const geometry = isMobile ? TABLE.mobile : TABLE.desktop;
  const total = angle + rotation;
  const fromFront = Math.abs(normalizeAngle(total));

  return (
    <div
      className={styles.anchor}
      style={{
        transform: `rotate(${angle}deg) translateY(-${geometry.radius}px)`,
        // mobile: plates nearer the front are drawn on top
        zIndex: isMobile ? 200 - Math.round(fromFront) : undefined,
      }}
    >
      <div
        data-angle={angle}
        className={styles.plate}
        style={{
          transform: `rotate(${-total}deg)`,
          opacity: isMobile ? plateOpacity(total, true) : undefined,
        }}
      >
        <div className={styles.upright}>
          <button
            type="button"
            onClick={onPick}
            tabIndex={fromFront < 40 ? 0 : -1}
            aria-label={`Show restaurants serving ${dishType.name}`}
            aria-pressed={isSelected ? 'true' : 'false'}
            className={clsx(styles.dish, isSelected && styles.selected)}
          >
            {dishType.photo ? (
              <DishPhoto dishType={dishType} className={styles.photo} />
            ) : (
              <span aria-hidden="true" className={styles.noPhoto}>
                <Icon name="imageOutline" size={isMobile ? 14 : 26} color="#A6A6A6" />
                {isMobile ? 'Photo' : 'Dish photo'}
              </span>
            )}
            {isSelected && (
              <span aria-hidden="true" className={styles.tick}>
                <Icon name="check" size={isMobile ? 11 : 18} color="var(--color-black)" />
              </span>
            )}
          </button>
          <span className={clsx(styles.card, isSelected && styles.cardSelected)}>
            <span className={styles.name}>{dishType.name}</span>
            <span className={styles.served}>{servedBy ? plural(servedBy, 'restaurant') : 'Coming soon'}</span>
          </span>
        </div>
      </div>
    </div>
  );
}
