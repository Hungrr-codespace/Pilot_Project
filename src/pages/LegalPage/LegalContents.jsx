import clsx from 'clsx';
import { Link } from 'react-router';
import { LEGAL_LINKS } from '@/config/site';
import { useLayout } from '@/context/layout';
import { useActiveSection } from '@/hooks/useActiveSection';
import { Icon } from '@/components/ui/Icon/Icon';
import styles from './LegalContents.module.css';

const twoDigits = (n) => String(n).padStart(2, '0');

// The policy's sections as a list of links. Desktop: a column that stays in view beside the text, with the
// section being read highlighted and the other policies below. Mobile: a card that opens and closes.
export function LegalContents({ doc }) {
  const { isMobile } = useLayout();
  const active = useActiveSection(doc.sections.map((section) => section.id));

  const list = (
    <ol className={styles.list}>
      {doc.sections.map((section, i) => (
        <li key={section.id}>
          <a
            href={`#${section.id}`}
            className={clsx(styles.link, !isMobile && section.id === active && styles.active)}
            aria-current={!isMobile && section.id === active ? 'location' : undefined}
          >
            <span className={styles.number}>{twoDigits(i + 1)}</span>
            {section.title}
          </a>
        </li>
      ))}
    </ol>
  );

  if (isMobile) {
    return (
      <details className={styles.card}>
        <summary className={styles.summary}>
          On this page
          <Icon name="chevronRight" size={20} color="var(--color-black)" className={styles.chevron} />
        </summary>
        {list}
      </details>
    );
  }

  return (
    <aside className={styles.aside}>
      <nav aria-label="On this page">
        <span className={styles.eyebrow}>On this page</span>
        {list}
      </nav>
      <nav aria-label="Other policies" className={styles.others}>
        <span className={styles.eyebrow}>Also read</span>
        {LEGAL_LINKS.filter((link) => link.id !== doc.id).map((link) => (
          <Link key={link.id} to={link.to} className={styles.other}>
            {link.label}
            <Icon name="arrowRight" size={18} color="var(--color-black)" />
          </Link>
        ))}
      </nav>
    </aside>
  );
}
