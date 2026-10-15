import { lazy, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { ROUTES } from '@/config/site';
import { loadSession, saveSession } from '@/lib/account';
import { fetchAccount } from '@/services/accountApi';
import { AccountContext } from './account';

// The sign-in dialog (with the restaurant and rider applications) is its own download: it isn't needed to show
// a page, so it loads after the visitor first touches, types or scrolls, or when it opens (whichever is first).
const loadDialog = () => import('@/features/account/SignInDialog');
const SignInDialog = lazy(() => loadDialog().then((m) => ({ default: m.SignInDialog })));

// Who is signed in on this device, and the sign-in dialog. Any part of the site opens the dialog with
// openSignIn({ reason, onDone, as }): `reason` picks its title ('nav', 'pilot', 'order', 'account', 'staff'),
// `onDone(user)` runs once signed in (for example, to carry on with the order), and `as` ('customer',
// 'restaurant', 'rider') skips the "who is signing in" step. A restaurant or rider signing in from the Sign in
// button lands on their page.
export function AccountProvider({ children }) {
  const [session, setSession] = useState(loadSession);
  const [dialog, setDialog] = useState(null);
  const navigate = useNavigate();
  const dialogRef = useRef(dialog);
  useLayoutEffect(() => {
    dialogRef.current = dialog;
  });

  const remember = useCallback((next) => {
    saveSession(next);
    setSession(next);
  }, []);

  // Fetch it in the background at the first tap, key press or scroll, so it's ready when Sign in is tapped
  useEffect(() => {
    const events = ['pointerdown', 'keydown', 'scroll'];
    const warm = () => {
      events.forEach((e) => window.removeEventListener(e, warm));
      loadDialog().catch(() => {}); // offline: it loads when Sign in is tapped
    };
    events.forEach((e) => window.addEventListener(e, warm, { passive: true }));
    return () => events.forEach((e) => window.removeEventListener(e, warm));
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
      openSignIn: ({ reason = 'nav', onDone, as } = {}) => setDialog({ reason, onDone, as }),
      signOut: () => remember(null),
      setUser: (user) => session && remember({ ...session, user }),
      // The sheet no longer accepts this sign-in (PIN reset, or 60 days passed)
      forgetSignIn: () => remember(null),
    }),
    [session, remember],
  );

  const PAGES = { rider: ROUTES.rider, restaurant: ROUTES.partner };
  const finish = (user, as) => {
    const onDone = dialogRef.current?.onDone;
    const opened = dialogRef.current?.as;
    setDialog(null);
    if (onDone) onDone(user);
    else if (PAGES[as] && !opened) navigate(PAGES[as]); // chose "restaurant" or "rider" at the Sign in button
  };

  return (
    <AccountContext.Provider value={value}>
      {children}
      {dialog && (
        <Suspense fallback={null}>
          <SignInDialog
            reason={dialog.reason}
            as={dialog.as}
            onSignedIn={remember}
            onFinished={finish}
            onClose={() => setDialog(null)}
          />
        </Suspense>
      )}
    </AccountContext.Provider>
  );
}
