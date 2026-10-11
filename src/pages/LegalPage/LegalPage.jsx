import { useLayout } from '@/context/layout';
import { LEGAL_DOCS } from '@/content/legal';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageCanvas } from '@/components/layout/PageCanvas/PageCanvas';
import { PageFooter } from '@/components/layout/PageFooter/PageFooter';
import { LegalHeader } from './LegalHeader';
import { LegalContents } from './LegalContents';
import { LegalDocument } from './LegalDocument';
import styles from './LegalPage.module.css';

// A policy page: Privacy Policy, Terms & Conditions or Refund & Cancellation Policy (`docId`). The text is in
// src/content/legal/.
export function LegalPage({ docId }) {
  const doc = LEGAL_DOCS[docId];
  const { isMobile } = useLayout();
  useDocumentTitle(`${doc.title} – Hungrr`);

  return (
    <PageCanvas key={isMobile ? 'mobile' : 'desktop'}>
      <LegalHeader doc={doc} />
      <main className={styles.body}>
        <LegalContents doc={doc} />
        <LegalDocument doc={doc} />
      </main>
      <PageFooter helpText="Questions about this policy?" />
    </PageCanvas>
  );
}
