import { createContext, useContext } from 'react';

// { state, summary, actions, refs } — the ordering flow. Provided by OrderProvider.
export const OrderContext = createContext(null);

export function useOrder() {
  const order = useContext(OrderContext);
  if (!order) throw new Error('useOrder must be used inside <OrderProvider>');
  return order;
}
