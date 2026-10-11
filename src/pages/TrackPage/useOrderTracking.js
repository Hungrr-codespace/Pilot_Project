import { useCallback, useEffect, useRef, useState } from 'react';
import { trackOrder } from '@/services/sheetApi';
import { isFinished } from '@/lib/tracking';

const REFRESH_MS = 60 * 1000;
const MIN_SPIN_MS = 700; // the Refresh button spins at least this long, so the check is always visible
const NOTE_MS = 2500; // how long "Up to date" / "Try again" stays on the button

// Looks up an order in the sheet and keeps it up to date while the page is on screen (every minute, until it is
// delivered or cancelled).
//   phase: 'idle' | 'loading' | 'found' | 'not_found' | 'unavailable'
// A manual refresh also reports back: refreshing (true while checking), refreshNote ('done' | 'failed' | ''),
// and refreshCount (goes up after each one, so the order card can flash).
export function useOrderTracking() {
  const [result, setResult] = useState({ phase: 'idle' });
  const [query, setQuery] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  const [refreshNote, setRefreshNote] = useState('');
  const [refreshCount, setRefreshCount] = useState(0);
  const latestRequest = useRef(0);
  const timers = useRef([]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);
  const later = (ms, fn) => timers.current.push(setTimeout(fn, ms));

  // Resolves to true when the order came back.
  const run = useCallback(async (q, { quiet = false } = {}) => {
    const request = ++latestRequest.current;
    if (!quiet) setResult({ phase: 'loading' });
    const res = await trackOrder(q);
    if (request !== latestRequest.current) return false; // a newer search has started
    if (res.ok) setResult({ phase: 'found', order: res.order, checkedAt: Date.now() });
    else if (!quiet) setResult({ phase: res.error });
    return res.ok;
  }, []);

  const track = useCallback(
    (q) => {
      setQuery(q);
      run(q);
    },
    [run],
  );

  const refresh = useCallback(async () => {
    if (!query || refreshing) return;
    setRefreshing(true);
    setRefreshNote('');
    const started = Date.now();
    const ok = await run(query, { quiet: true });
    later(Math.max(0, MIN_SPIN_MS - (Date.now() - started)), () => {
      setRefreshing(false);
      setRefreshNote(ok ? 'done' : 'failed');
      if (ok) setRefreshCount((n) => n + 1);
      later(NOTE_MS, () => setRefreshNote(''));
    });
  }, [query, refreshing, run]);

  const order = result.order;
  useEffect(() => {
    if (!query || !order || isFinished(order.status)) return undefined;
    const timer = setInterval(() => {
      if (document.visibilityState === 'visible') run(query, { quiet: true });
    }, REFRESH_MS);
    return () => clearInterval(timer);
  }, [query, order, run]);

  return { ...result, query, track, refresh, refreshing, refreshNote, refreshCount };
}
