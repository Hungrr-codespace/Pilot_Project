import { Icon } from '@/components/ui/Icon/Icon';
import { useLayout } from '@/context/layout';
import styles from './SearchField.module.css';

// Search box for restaurants and dishes, with a clear button once something is typed.
export function SearchField({ id, value, onChange, onClear }) {
  const { isMobile } = useLayout();
  return (
    <label htmlFor={id} className={styles.field}>
      <Icon name="search" size={isMobile ? 20 : 22} color="var(--color-black)" />
      <input
        id={id}
        type="text"
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder="Search restaurants or dishes"
        aria-label="Search restaurants or dishes"
        autoComplete="off"
        spellCheck="false"
        className={styles.input}
      />
      {value && (
        <button
          type="button"
          onClick={onClear}
          aria-label="Clear search"
          className={`${styles.clear} btn-soft`}
        >
          <Icon name="close" size={isMobile ? 17 : 18} color="var(--color-black)" />
        </button>
      )}
    </label>
  );
}
