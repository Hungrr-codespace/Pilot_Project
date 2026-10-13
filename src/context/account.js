import { createContext, useContext } from 'react';

// The customer's account: { user, token, signedIn, openSignIn({ reason, onDone }), signOut, setUser,
// forgetSignIn }. Provided by AccountProvider.
export const AccountContext = createContext(null);

export function useAccount() {
  const account = useContext(AccountContext);
  if (!account) throw new Error('useAccount must be used inside <AccountProvider>');
  return account;
}
