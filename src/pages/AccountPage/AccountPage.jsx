import { useEffect } from 'react';
import { useAccount } from '@/context/account';
import { useLayout } from '@/context/layout';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { firstName } from '@/lib/account';
import { PageCanvas } from '@/components/layout/PageCanvas/PageCanvas';
import { PageFooter } from '@/components/layout/PageFooter/PageFooter';
import { PageHeader } from '@/components/layout/PageHeader/PageHeader';
import { PrimaryButton } from '@/features/ordering/OrderNotepad/NoteButtons';
import { RegularCard } from './RegularCard';
import { KhataLedger } from './KhataLedger';
import { useKhata } from './useKhata';
import styles from './AccountPage.module.css';

// The customer's khata (/account): their name and number, and every order they have placed, with its dishes,
// a way to track it and to rate it. Signed out, it asks them to sign in.
export function AccountPage() {
  useDocumentTitle('Your khata – Hungrr');
  const { isMobile } = useLayout();
  const { user, openSignIn } = useAccount();
  const khata = useKhata();

  useEffect(() => {
    if (!user) openSignIn({ reason: 'account' });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arriving at the page
  }, []);

  const name = firstName(user?.name);
  return (
    <PageCanvas key={isMobile ? 'mobile' : 'desktop'}>
      <PageHeader
        pill="Your khata"
        title={user ? `${name}'s khata` : 'Your khata'}
        lead={
          user
            ? 'Every order you have placed with Hungrr, written down in one place. Open one to see what you ordered, track it or rate it.'
            : 'Sign in with your phone number and PIN to see every order you have placed with Hungrr.'
        }
      />
      <main className={styles.body}>
        {user ? (
          <>
            <RegularCard />
            <KhataLedger khata={khata} />
          </>
        ) : (
          <div className={styles.closed}>
            <div aria-hidden="true" className={styles.cover}>
              <span className={styles.coverTitle}>Hungrr khata</span>
              <span className={styles.coverLine} />
            </div>
            <div className={styles.closedText}>
              <h2 className={styles.closedTitle}>Your khata is closed</h2>
              <p className={styles.closedLead}>
                Sign in to open it. New here? Use your phone number to open a khata: it takes a minute.
              </p>
              <PrimaryButton icon="account" onClick={() => openSignIn({ reason: 'account' })}>
                Sign in
              </PrimaryButton>
            </div>
          </div>
        )}
      </main>
      <PageFooter />
    </PageCanvas>
  );
}
