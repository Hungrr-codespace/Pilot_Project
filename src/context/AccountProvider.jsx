import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { loadSession, saveSession } from '@/lib/account';
import { fetchAccount } from '@/services/accountApi';
import { SignInDialog } from '@/features/account/SignInDialog';
import { AccountContext } from './account';

// Who is signed in on this device, and the sign-in dialog. Any part of the site opens the dialog with
// openSignIn({ reason, onDone }): `reason` picks its title ('nav', 'pilot', 'order', 'account') and `onDone(user)`
// runs once the customer has signed in (for example, to carry on with the order).
export function AccountProvider({ children }) {
  const [session, setSession] = useState(loadSession);
  const [dialog, setDialog] = useState(null);
  const dialogRef = useRef(dialog);
  useLayoutEffect(() => {
    dialogRef.current = dialog;
  });

  const remember = useCallback((next) => {
    saveSession(next);
    setSession(next);
  }, []);

  // Check the saved sign-in once per visit: the team may have changed the name, or reset the PIN (which ends
  // the sign-in). Without a connection the saved sign-in is kept.
  useEffect(() => {
    const saved = loadSession();
    if (!saved) return undefined;
    let live = true;
    fetchAccount(saved.token).then((res) => {
      if (!live) return;
      if (res.ok && res.user) remember({ token: saved.token, user: { ...res.user, roles: res.roles || [] } });
      else if (res.error === 'signed_out') remember(null);
    });
    return () => {
      live = false;
    };
  }, [remember]);

  const value = useMemo(
    () => ({
      user: session?.user || null,
      token: session?.token || '',
      signedIn: Boolean(session),
      openSignIn: ({ reason = 'nav', onDone } = {}) => setDialog({ reason, onDone }),
      signOut: () => remember(null),
      setUser: (user) => session && remember({ ...session, user }),
      // The sheet no longer accepts this sign-in (PIN reset, or 60 days passed)
      forgetSignIn: () => remember(null),
    }),
    [session, remember],
  );

  const finish = (user) => {
    const onDone = dialogRef.current?.onDone;
    setDialog(null);
    if (onDone) onDone(user);
  };

  return (
    <AccountContext.Provider value={value}>
      {children}
      {dialog && (
        <SignInDialog
          reason={dialog.reason}
          onSignedIn={remember}
          onFinished={finish}
          onClose={() => setDialog(null)}
        />
      )}
    </AccountContext.Provider>
  );
}
