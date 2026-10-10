import { useEffect, useState } from 'react';
import { fetchMenu, getInitialMenu } from '@/services/sheetApi';
import { MenuContext } from './menu';

// Shows the last known menu straight away, then swaps in the latest one from the Google Sheet when it arrives.
export function MenuProvider({ children }) {
  const [menu, setMenu] = useState(getInitialMenu);
  useEffect(() => {
    let active = true;
    fetchMenu().then((fresh) => {
      if (active && fresh) setMenu(fresh);
    });
    return () => {
      active = false;
    };
  }, []);
  return <MenuContext.Provider value={menu}>{children}</MenuContext.Provider>;
}
