import { useCallback, useEffect, useMemo, useReducer, useRef } from 'react';
import { formatTimestamp, orderPhotoFileName } from '@/lib/format';
import { isDishMatch } from '@/lib/search';
import { newOrderId } from '@/lib/orderId';
import { summarizeOrder } from '@/lib/pricing';
import { drawOrderSummary } from '@/lib/orderImage';
import { saveFile } from '@/lib/download';
import { submitOrder, toSheetOrder } from '@/services/sheetApi';
import { useLayout } from './layout';
import { useMenu } from './menu';
import { OrderContext } from './order';
import { initialOrderState, orderReducer } from './orderReducer';

const COVER_OPEN_MS = 3350; // the cover's swing (3.2 s) plus a beat, then it drops behind the pages
const NOTEPAD_LEAVE_MS = 800; // the notepad slides away after "Paid?"

// Holds the ordering state and the actions that change it. Components read it with useOrder().
export function OrderProvider({ children }) {
  const menu = useMenu();
  const { isMobile, scale } = useLayout();
  const [state, dispatch] = useReducer(orderReducer, menu, (m) => ({
    ...initialOrderState,
    restaurantId: m.restaurants[0]?.id || '',
  }));

  const summary = useMemo(
    () =>
      summarizeOrder({
        restaurants: menu.restaurants,
        clusters: menu.clusters,
        cart: state.cart,
        settings: menu.settings,
      }),
    [menu, state.cart],
  );

  // DOM elements the actions scroll to
  const tableRef = useRef(null);
  const bookRef = useRef(null);

  // Actions read the latest values through this ref, so they never go stale and can stay stable.
  const latest = useRef({});
  latest.current = { state, summary, menu, isMobile, scale };

  const timers = useRef({});
  const later = useCallback((name, ms, fn) => {
    clearTimeout(timers.current[name]);
    timers.current[name] = setTimeout(fn, ms);
  }, []);
  useEffect(() => {
    const all = timers.current;
    return () => Object.values(all).forEach(clearTimeout);
  }, []);

  const actions = useMemo(() => {
    const openBook = () => {
      if (latest.current.state.book.isOpen) return;
      dispatch({ type: 'book/open' });
      later('cover', COVER_OPEN_MS, () => dispatch({ type: 'book/coverBehind' }));
    };

    // Opens a restaurant's page, on the category with what the customer is looking for (if any).
    const showRestaurant = (restaurantId) => {
      const { state: s, menu: m } = latest.current;
      const restaurant = m.restaurants.find((r) => r.id === restaurantId);
      if (!restaurant) return;
      const dishType = m.dishTypes.find((t) => t.id === s.dishTypeId);
      const filter = { dishType, query: s.query };
      const hit = restaurant.cats.find((cat) => cat.dishes.some((dish) => isDishMatch(dish, cat, filter)));
      let categoryId = hit?.id;
      if (!categoryId && restaurant.cats.length && !s.categoryByRestaurant[restaurantId]) {
        categoryId = restaurant.cats[0].id;
      }
      dispatch({ type: 'book/showRestaurant', restaurantId, categoryId });
    };

    // A dish tapped on the table: turn it to the front, filter the restaurant list and bring the book into view.
    const pickDishType = (dishTypeId, turns) => {
      const wasOpen = latest.current.state.book.isOpen;
      dispatch({ type: 'table/pickDish', dishTypeId, turns });
      if (!wasOpen) openBook();
      try {
        bookRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      } catch {
        /* older browsers */
      }
    };

    const confirmOrder = () => {
      dispatch({ type: 'notepad/confirm', orderId: newOrderId() });
      // Scroll so the zoomed-in payment note fills the screen.
      const table = tableRef.current;
      if (!table) return;
      const { isMobile: mobile, scale: z } = latest.current;
      const offset = mobile ? -10 : 24 * z - 16;
      const top = table.getBoundingClientRect().top + (window.pageYOffset || 0) + offset;
      try {
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      } catch {
        /* older browsers */
      }
    };

    const drawPhoto = (timestamp) => {
      const { state: s, summary: sum, menu: m } = latest.current;
      try {
        return drawOrderSummary({
          summary: sum,
          orderId: s.orderId,
          deliverTo: m.settings.deliverTo,
          timestamp,
        });
      } catch {
        return null; // canvas blocked: the slip falls back to the HTML version
      }
    };

    // "Paid?": save the order photo, log the order in the sheet, and show the torn-off slip.
    const sendPaidOrder = () => {
      const { state: s, summary: sum, isMobile: mobile } = latest.current;
      const now = new Date();
      const timestamp = formatTimestamp(now);
      const fileName = orderPhotoFileName(now);
      const photoUrl = drawPhoto(timestamp);
      submitOrder(
        toSheetOrder({ orderId: s.orderId, summary: sum, device: mobile ? 'phone/tablet' : 'desktop' }),
      );
      if (photoUrl) saveFile(photoUrl, fileName);
      dispatch({ type: 'order/sent', sentOrder: { timestamp, photoUrl: photoUrl || '', fileName } });
      later('settle', NOTEPAD_LEAVE_MS, () => dispatch({ type: 'order/settled' }));
    };

    const downloadPhotoAgain = () => {
      const sent = latest.current.state.sentOrder;
      if (!sent) return;
      const photoUrl = sent.photoUrl || drawPhoto(sent.timestamp);
      if (photoUrl) saveFile(photoUrl, sent.fileName || 'hungrr-order.png');
      if (photoUrl !== sent.photoUrl)
        dispatch({ type: 'order/photoUpdated', patch: { photoUrl: photoUrl || '' } });
    };

    return {
      openBook,
      showRestaurant,
      showIndex: () => dispatch({ type: 'book/showIndex' }),
      selectCategory: (restaurantId, categoryId) =>
        dispatch({ type: 'book/selectCategory', restaurantId, categoryId }),
      setQuery: (query) => dispatch({ type: 'search/setQuery', query }),
      clearQuery: () => dispatch({ type: 'search/clearQuery' }),
      clearDishType: () => dispatch({ type: 'search/clearDishType' }),
      turnTable: (by) => dispatch({ type: 'table/turn', by }),
      setTableTurns: (turns) => dispatch({ type: 'table/setTurns', turns }),
      pickDishType,
      setQuantity: (dishId, quantity) => dispatch({ type: 'cart/setQuantity', dishId, quantity }),
      openNotepad: () => dispatch({ type: 'notepad/open' }),
      closeNotepad: () => dispatch({ type: 'notepad/close' }),
      backToOrder: () => dispatch({ type: 'notepad/backToOrder' }),
      confirmOrder,
      sendPaidOrder,
      downloadPhotoAgain,
      startNewOrder: () => {
        clearTimeout(timers.current.cover);
        dispatch({ type: 'order/new' });
      },
    };
  }, [later]);

  const value = useMemo(
    () => ({ state, summary, actions, refs: { tableRef, bookRef } }),
    [state, summary, actions],
  );
  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}
