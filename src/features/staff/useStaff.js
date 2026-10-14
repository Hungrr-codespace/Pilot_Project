import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { useAccount } from '@/context/account';
import { staffCall } from '@/services/staffApi';

// For a staff page: call(op, extra) → the sheet's answer. If the sheet says the sign-in has ended, the device
// forgets it; if this account isn't on the Staff tab for this page, `denied` turns true.
export function useStaff(area) {
  const account = useAccount();
  const ref = useRef(account);
  useLayoutEffect(() => {
    ref.current = account;
  });
  const [denied, setDenied] = useState(false);
  const call = useCallback(
    async (op, extra) => {
      const res = await staffCall(area, op, ref.current.token, extra);
      if (res.error === 'signed_out') ref.current.forgetSignIn();
      if (res.error === 'not_staff') setDenied(true);
      return res;
    },
    [area],
  );
  return { call, denied };
}

// Re-runs `load` every `ms` while the page is visible. Returns nothing; `load` should be stable.
export function usePolling(load, ms) {
  const timer = useRef(null);
  useEffect(() => {
    if (!load) return undefined;
    const tick = () => {
      if (document.visibilityState === 'visible') load({ quiet: true });
    };
    timer.current = setInterval(tick, ms);
    return () => clearInterval(timer.current);
  }, [load, ms]);
}

// Loads `op` from a staff area and keeps it: { phase: 'loading' | 'ready' | 'failed', data, error, at, load }.
// load({ quiet: true }) refreshes without the loading state.
export function useStaffData(call, op, extra) {
  const [state, setState] = useState({ phase: 'loading', data: null, error: '', at: 0 });
  const extraKey = JSON.stringify(extra || {});
  const load = useCallback(
    async ({ quiet = false } = {}) => {
      if (!quiet) setState((s) => ({ ...s, phase: s.data ? 'ready' : 'loading' }));
      const res = await call(op, JSON.parse(extraKey));
      if (res.ok) setState({ phase: 'ready', data: res, error: '', at: Date.now() });
      else setState((s) => ({ ...s, phase: s.data ? 'ready' : 'failed', error: res.error || 'unavailable' }));
      return res;
    },
    [call, op, extraKey],
  );
  useEffect(() => {
    load();
  }, [load]);
  return { ...state, load };
}
