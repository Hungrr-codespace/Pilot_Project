import { useEffect, useMemo, useState } from 'react';
import { getShopStatus } from '@/lib/orderHours';
import { SHEET_API_URL, fetchShopStatus } from '@/services/sheetApi';
import { useMenu } from './menu';
import { ShopStatusContext } from './shopStatus';

const TICK_MS = 30 * 1000; // re-check the clock
const CHECK_MS = 2 * 60 * 1000; // ask the sheet again (pause switch, hours), while the page is on screen

// Open, closed or paused: from the opening hours and pause switch in the sheet's Settings tab, checked against
// Indian time. The menu brings the settings when the page loads; while the page stays open, the sheet is asked
// again every 2 minutes (and when the customer comes back to the tab), so flipping the pause switch reaches
// people who already have the site open.
export function ShopStatusProvider({ children }) {
  const { settings } = useMenu();
  const [latest, setLatest] = useState(null);
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    const timer = setInterval(() => setNow(Date.now()), TICK_MS);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!SHEET_API_URL) return undefined;
    let active = true;
    const check = () => {
      if (document.visibilityState !== 'visible') return;
      fetchShopStatus().then((fresh) => {
        if (active && fresh) {
          setLatest(fresh);
          setNow(Date.now());
        }
      });
    };
    const timer = setInterval(check, CHECK_MS);
    document.addEventListener('visibilitychange', check);
    return () => {
      active = false;
      clearInterval(timer);
      document.removeEventListener('visibilitychange', check);
    };
  }, []);

  const source = latest || settings;
  const value = useMemo(() => getShopStatus(source, new Date(now)), [source, now]);
  return <ShopStatusContext.Provider value={value}>{children}</ShopStatusContext.Provider>;
}
