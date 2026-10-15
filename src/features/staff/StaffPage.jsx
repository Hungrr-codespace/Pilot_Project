import { useEffect } from 'react';
import { useAccount } from '@/context/account';
import { useLayout } from '@/context/layout';
import { useDocumentTitle } from '@/hooks/useDocumentTitle';
import { PageCanvas } from '@/components/layout/PageCanvas/PageCanvas';
import { PageNav } from '@/components/layout/PageNav/PageNav';
import { PrimaryButton } from '@/features/ordering/OrderNotepad/NoteButtons';
import styles from './StaffPage.module.css';

const ROLE_NAMES = { admin: 'Admin', rider: 'Rider', restaurant: 'Restaurant' };
// Riders and restaurants sign in (and apply) as such; the admin signs in with their usual account
const SIGN_IN_AS = { admin: 'customer', rider: 'rider', restaurant: 'restaurant' };

// The frame of the staff pages (admin, rider, restaurant): a compact yellow header with the page's name, and
// the page itself only for a signed-in account listed with `role` on the sheet's Staff tab.
export function StaffPage({ role, title, subtitle, denied, tabs, wide = true, children }) {
  useDocumentTitle(`${title} – Hungrr`);
  const { isMobile } = useLayout();
  const { user, openSignIn } = useAccount();
  const hasRole = Boolean(user?.roles?.some((r) => r.role === role));

  const signIn = () => openSignIn({ reason: 'staff', as: SIGN_IN_AS[role] });

  useEffect(() => {
    if (!user) signIn();
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once, on arriving at the page
  }, []);

  let body;
  if (!user) {
    body = (
      <Gate title="Sign in to continue" text="Use the phone number and PIN of your Hungrr account.">
        <PrimaryButton icon="account" onClick={signIn}>
          Sign in
        </PrimaryButton>
      </Gate>
    );
  } else if (!hasRole || denied) {
    body =
      role === 'admin' ? (
        <Gate
          title="This page is for the Hungrr team"
          text={`${user.name}'s account isn't listed as admin on the Staff tab of the sheet. If it should be, ask the team to add your number there, then sign out and in again.`}
        />
      ) : (
        <Gate
          title={`Not approved as a ${ROLE_NAMES[role].toLowerCase()} yet`}
          text={`This page is for ${ROLE_NAMES[role].toLowerCase()}s the team has approved. Apply with your details, or see where your application stands, using your number and PIN.`}
        >
          <PrimaryButton icon="arrowRight" onClick={signIn}>
            Apply or check my application
          </PrimaryButton>
        </Gate>
      );
  } else body = children;

  return (
    <PageCanvas key={isMobile ? 'mobile' : 'desktop'}>
      <header className={styles.header}>
        <PageNav />
        <div className={styles.titleRow}>
          <h1 className={styles.title}>{title}</h1>
          <span className={styles.role}>{ROLE_NAMES[role]}</span>
          {subtitle && <span className={styles.subtitle}>{subtitle}</span>}
        </div>
        {tabs && hasRole && !denied && <div className={styles.tabs}>{tabs}</div>}
      </header>
      <main className={wide ? styles.body : `${styles.body} ${styles.narrow}`}>{body}</main>
    </PageCanvas>
  );
}

function Gate({ title, text, children }) {
  return (
    <div className={styles.gate}>
      <h2 className={styles.gateTitle}>{title}</h2>
      <p className={styles.gateText}>{text}</p>
      {children}
    </div>
  );
}

// A tab on a staff page's header (admin: Orders, Offers…)
export function StaffTab({ active, onClick, count, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={`${styles.tab} ${active ? styles.tabActive : ''} ${active ? 'btn-black' : 'btn-light'}`}
    >
      {children}
      {count > 0 && <span className={styles.count}>{count}</span>}
    </button>
  );
}
