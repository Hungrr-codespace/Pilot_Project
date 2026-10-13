import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAccount } from '@/context/account';
import { fetchAccount } from '@/services/accountApi';

// The signed-in customer's orders from the sheet.
//   phase: 'loading' | 'ready' | 'failed' (and 'idle' when signed out)
//   orders (newest first), unclaimed (earlier orders with this number not in the khata yet), reload()
// The sheet answering "signed out" (PIN reset, or 60 days passed) ends the sign-in on this device.
export function useKhata() {
  const account = useAccount();
  const { token } = account;
  const accountRef = useRef(account);
  useLayoutEffect(() => {
    accountRef.current = account;
  });
  const [data, setData] = useState({ phase: token ? 'loading' : 'idle', orders: [], unclaimed: 0 });
  const latest = useRef(0);

  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!token) return;
      const request = ++latest.current;
      if (!quiet) setData((d) => ({ ...d, phase: 'loading' }));
      const res = await fetchAccount(token, { orders: true });
      if (request !== latest.current) return;
      const acc = accountRef.current;
      if (res.ok) {
        if (res.user && res.user.name !== acc.user?.name) acc.setUser(res.user);
        setData({ phase: 'ready', orders: res.orders || [], unclaimed: res.unclaimed || 0 });
      } else if (res.error === 'signed_out') {
        acc.forgetSignIn();
      } else {
        setData((d) => ({ ...d, phase: d.phase === 'ready' && quiet ? 'ready' : 'failed' }));
      }
    },
    [token],
  );

  useEffect(() => {
    load();
  }, [load]);

  return { ...data, reload: load };
}
