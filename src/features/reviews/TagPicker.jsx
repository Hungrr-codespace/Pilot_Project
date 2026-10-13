import clsx from 'clsx';
import styles from './TagPicker.module.css';

// Tap tags on and off (toggle buttons).
export function TagPicker({ options, selected, onChange, label }) {
  const toggle = (tag) =>
    onChange(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag]);
  return (
    <div className={styles.tags} role="group" aria-label={label}>
      {options.map((tag) => {
        const on = selected.includes(tag);
        return (
          <button
            key={tag}
            type="button"
            aria-pressed={on}
            onClick={() => toggle(tag)}
            className={clsx(styles.tag, on ? styles.on : 'btn-light')}
          >
            {tag}
          </button>
        );
      })}
    </div>
  );
}
