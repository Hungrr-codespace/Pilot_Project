import { NavLink } from 'react-router';
import { LEGAL_LINKS } from '@/config/site';
import { useLayout } from '@/context/layout';
import { POLICIES_UPDATED } from '@/content/legal';
import { PageNav } from '@/components/layout/PageNav/PageNav';
import { LegalText } from './LegalText';
import styles from './LegalHeader.module.css';

// Top of a policy page: the way back to the main site, the three policies as tabs, the title and the date.
export function LegalHeader({ doc }) {
  const { isMobile } = useLayout();
  return (
    <header className={styles.header}>
      <div aria-hidden="true" className={styles.backdrop} />
      <PageNav className={styles.nav} />

      <div className={styles.intro}>
        <div className={styles.topRow}>
          <span className={styles.pill}>The fine print</span>
          <nav aria-label="Policies" className={styles.tabs}>
            {LEGAL_LINKS.map((link) => (
              <NavLink key={link.id} to={link.to} className={styles.tab}>
                {isMobile ? link.short : link.label}
              </NavLink>
            ))}
          </nav>
        </div>
        <h1 className={styles.title}>{doc.title}</h1>
        <p className={styles.lead}>{doc.lead}</p>
        <p className={styles.updated}>
          <span className={styles.updatedLabel}>Last updated</span>
          <LegalText text={POLICIES_UPDATED} />
        </p>
      </div>
    </header>
  );
}
