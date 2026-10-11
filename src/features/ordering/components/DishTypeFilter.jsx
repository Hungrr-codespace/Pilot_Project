import { useLayout } from '@/context/layout';
import { Icon } from '@/components/ui/Icon/Icon';
import { DishPhoto } from './DishPhoto';
import styles from './DishTypeFilter.module.css';

// "Restaurants serving [🍕 Pizza ✕]" — the dish picked on the table; tap it to clear the filter.
export function DishTypeFilter({ dishType, onClear }) {
  const { isMobile } = useLayout();
  return (
    <div className={styles.filter}>
      <span className={styles.label}>Restaurants serving</span>
      <button
        type="button"
        onClick={onClear}
        aria-label={`Remove the ${dishType.name} filter`}
        className={`${styles.chip} btn-black`}
      >
        {dishType.photo ? (
          <DishPhoto dishType={dishType} className={styles.photo} />
        ) : (
          <span aria-hidden="true" className={styles.noPhoto}>
            <Icon name="cutlery" size={isMobile ? 14 : 15} color="var(--color-black)" />
          </span>
        )}
        {dishType.name}
        <Icon name="close" size={isMobile ? 15 : 16} color="var(--color-yellow)" />
      </button>
    </div>
  );
}
