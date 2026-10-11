import clsx from 'clsx';
import styles from './CategoryTabs.module.css';

// Menu sections of a restaurant (Starters, Mains…) as pill tabs.
export function CategoryTabs({ categories, activeId, onSelect }) {
  return (
    <div className={styles.tabs}>
      {categories.map((category) => (
        <button
          key={category.id}
          type="button"
          onClick={() => onSelect(category.id)}
          className={clsx(styles.tab, category.id === activeId ? styles.active : 'btn-light')}
        >
          {category.name}
        </button>
      ))}
    </div>
  );
}
