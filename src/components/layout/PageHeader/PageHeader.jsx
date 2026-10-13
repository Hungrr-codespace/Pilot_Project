import { PageNav } from '@/components/layout/PageNav/PageNav';
import { ShopStatusPill } from '@/components/ui/ShopStatusPill/ShopStatusPill';
import styles from './PageHeader.module.css';

// The yellow top of the smaller pages (tracking, feedback): the way back, a pill naming the page, today's
// ordering status, the title and one line on what to do.
export function PageHeader({ pill, title, lead }) {
  return (
    <header className={styles.header}>
      <div aria-hidden="true" className={styles.backdrop} />
      <PageNav className={styles.nav} />
      <div className={styles.intro}>
        <div className={styles.pills}>
          <span className={styles.pill}>{pill}</span>
          <ShopStatusPill />
        </div>
        <h1 className={styles.title}>{title}</h1>
        <p className={styles.lead}>{lead}</p>
      </div>
    </header>
  );
}
