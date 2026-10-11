import clsx from 'clsx';
import { CAMPUS } from '@/config/site';
import { FAQ_GROUPS } from '@/content/faq';
import { Icon } from '@/components/ui/Icon/Icon';
import { Wordmark } from '@/components/ui/Wordmark/Wordmark';
import styles from './FaqMenu.module.css';

// The black "FAQ menu" card, with the questions grouped like courses. `renderQuestion` draws each question.
export function FaqMenu({ renderQuestion, className, ...rest }) {
  return (
    <div className={clsx(styles.menu, className)} {...rest}>
      <div className={styles.head}>
        <div className={styles.brand}>
          <Wordmark tone="light" className={styles.logo} />
          <span className={styles.edition}>Pilot special · {CAMPUS}</span>
        </div>
        <span className={styles.badge}>FAQ MENU</span>
      </div>
      {FAQ_GROUPS.map((group) => (
        <div key={group.course} className={styles.group}>
          <div className={styles.course}>
            <span className={styles.courseName}>{group.course}</span>
            <span className={styles.courseLine} />
          </div>
          {group.questions.map(renderQuestion)}
        </div>
      ))}
    </div>
  );
}

// The green "veg" dot in front of each question.
export function MenuDot({ compact = false }) {
  return compact ? (
    <svg width="14" height="14" viewBox="0 0 18 18" aria-hidden="true" className={styles.dot}>
      <rect x="1" y="1" width="16" height="16" rx="3" fill="none" stroke="#2DBE4A" strokeWidth="2" />
      <circle cx="9" cy="9" r="4.2" fill="#2DBE4A" />
    </svg>
  ) : (
    <svg width="20" height="20" viewBox="0 0 20 20" aria-hidden="true" className={styles.dot}>
      <rect x="1" y="1" width="18" height="18" rx="3" fill="none" stroke="#1FAE2B" strokeWidth="1.8" />
      <circle cx="10" cy="10" r="5" fill="#1FAE2B" />
    </svg>
  );
}

// The round "+" button that turns into a green tick for the question being served.
export function ToggleMark({ isOn, iconSize, className }) {
  return (
    <span className={clsx(styles.mark, isOn && styles.markOn, className)}>
      {isOn ? (
        <Icon name="check" size={iconSize} color="var(--color-white)" />
      ) : (
        <Icon name="plus" size={iconSize} color="var(--color-yellow)" />
      )}
    </span>
  );
}
