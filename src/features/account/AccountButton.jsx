import { Link } from 'react-router';
import clsx from 'clsx';
import { ROUTES } from '@/config/site';
import { useAccount } from '@/context/account';
import { useLayout } from '@/context/layout';
import { firstName, initials } from '@/lib/account';
import { Icon } from '@/components/ui/Icon/Icon';
import styles from './AccountButton.module.css';

// Top-right of the page: "Sign in" (opens the sign-in), or once signed in, the customer's initials and first
// name, linking to their khata. On phones it is a round button.
export function AccountButton({ className }) {
  const { isMobile } = useLayout();
  const { user, openSignIn } = useAccount();

  if (!user) {
    return (
      <button
        type="button"
        onClick={() => openSignIn({ reason: 'nav' })}
        aria-label={isMobile ? 'Sign in' : undefined}
        className={clsx(styles.button, isMobile && styles.round, 'btn-light', className)}
      >
        <Icon name="account" size={isMobile ? 22 : 22} color="var(--color-black)" />
        {!isMobile && 'Sign in'}
      </button>
    );
  }

  return (
    <Link
      to={ROUTES.account}
      aria-label={`Your khata (${user.name})`}
      className={clsx(styles.button, styles.signedIn, isMobile && styles.round, 'btn-light', className)}
    >
      <span aria-hidden="true" className={styles.token}>
        {initials(user.name)}
      </span>
      {!isMobile && <span className={styles.name}>{firstName(user.name)}</span>}
    </Link>
  );
}
