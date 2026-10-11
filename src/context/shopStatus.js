import { createContext, useContext } from 'react';

// Whether orders can be placed right now: { state: 'open' | 'closed' | 'paused', closingSoon, opensToday,
// message, hours: { label, sentence, opens, closes } }. Provided by ShopStatusProvider.
export const ShopStatusContext = createContext(null);

export function useShopStatus() {
  const status = useContext(ShopStatusContext);
  if (!status) throw new Error('useShopStatus must be used inside <ShopStatusProvider>');
  return status;
}
