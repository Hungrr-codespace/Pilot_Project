import { useCallback, useEffect, useLayoutEffect, useMemo, useReducer, useRef, useState } from 'react';
import { billFileName, formatTimestamp } from '@/lib/format';
import { loadSavedCustomer, saveCustomer } from '@/lib/checkout';
import { isDishMatch } from '@/lib/search';
import { allDishes } from '@/lib/menuData';
import { newOrderId } from '@/lib/orderId';
import { summarizeOrder } from '@/lib/pricing';
import { drawOrderSummary } from '@/lib/orderImage';
import { saveFile } from '@/lib/download';
import { saveRecentOrder } from '@/lib/tracking';
import { submitOrder, submitPayment, toSheetOrder } from '@/services/sheetApi';
import { checkDeals } from '@/services/accountApi';
import { useAccount } from './account';
import { useLayout } from './layout';
import { useMenu } from './menu';
import { OrderContext } from './order';
import { initialOrderState, orderReducer } from './orderReducer';

const COVER_OPEN_MS = 3350; // the cover's swing (3.2 s) plus a beat, then it drops behind the pages
const NOTEPAD_LEAVE_MS = 800; // the notepad slides away after the payment is confirmed
const NO_DEALS = {
  offer: null,
  coupon: null,
  code: '',
  error: '',
  progress: null,
  available: [], // coupons listed at checkout for this customer
  checking: false,
};

// Holds the ordering state and the actions that change it. Components read it with useOrder().
export function OrderProvider({ children }) {
  const menu = useMenu();
  const account = useAccount();
  const { isMobile, scale } = useLayout();
  const [state, dispatch] = useReducer(orderReducer, menu, (m) => ({
    ...initialOrderState,
    restaurantId: m.restaurants[0]?.id || '',
    customer: loadSavedCustomer(), // details from the last order on this device
  }));

  // Offers and coupons for this order (signed in only): the automatic offer if this order gets it, and the coupon
  // the customer applied. The summary applies whichever saves more.
  const [deals, setDeals] = useState(NO_DEALS);

  const summary = useMemo(
    () =>
      summarizeOrder({
        restaurants: menu.restaurants,
        clusters: menu.clusters,
        cart: state.cart,
        settings: menu.settings,
        deals: [deals.offer, deals.coupon],
      }),
    [menu, state.cart, deals.offer, deals.coupon],
  );

  // Ask the sheet which offer this order gets when the order note opens (and after signing in); forget it all
  // when signed out.
  const token = account.token;
  const notepadOpen = state.notepad.isOpen;
  useEffect(() => {
    if (!token) {
      setDeals(NO_DEALS);
      return undefined;
    }
    if (!notepadOpen) return undefined;
    let live = true;
    checkDeals(token, '').then((res) => {
      if (live && res.ok)
        setDeals((d) => ({
          ...d,
          offer: res.offer || null,
          progress: res.progress || null,
          available: res.available || [],
        }));
    });
    return () => {
      live = false;
    };
  }, [token, notepadOpen]);

  // DOM elements the actions scroll to
  const tableRef = useRef(null);
  const bookRef = useRef(null);

  // Actions read the latest values through this ref, so they never go stale and can stay stable.
  const latest = useRef({ state, summary, menu, isMobile, scale, account, deals });
  useLayoutEffect(() => {
    latest.current = { state, summary, menu, isMobile, scale, account, deals };
  });

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
      const hit = restaurant.categories.find((category) =>
        category.dishes.some((dish) => isDishMatch(dish, category, filter)),
      );
      let categoryId = hit?.id;
      if (!categoryId && restaurant.categories.length && !s.categoryByRestaurant[restaurantId]) {
        categoryId = restaurant.categories[0].id;
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

    // Scroll so the order steps bar and the zoomed-in payment sheet under it fill the screen.
    const scrollToPayment = () => {
      const area = tableRef.current?.closest('section');
      if (!area) return;
      const { isMobile: mobile, scale: z } = latest.current;
      const offset = (mobile ? 4 : 48) * z;
      const top = area.getBoundingClientRect().top + (window.pageYOffset || 0) + offset;
      try {
        window.scrollTo({ top: Math.max(0, top), behavior: 'smooth' });
      } catch {
        /* older browsers */
      }
    };

    const sheetOrder = (extra) => {
      const { state: s, summary: sum, isMobile: mobile } = latest.current;
      return toSheetOrder({
        orderId: s.orderId,
        summary: sum,
        customer: s.customer,
        device: mobile ? 'phone/tablet' : 'desktop',
        ...extra,
      });
    };

    // "Confirm order" on the order note: sign in first (the order goes into the customer's khata), then ask
    // where to deliver.
    const confirmOrder = () => {
      const { summary: sum, account: acc } = latest.current;
      if (sum.isEmpty) return;
      if (!acc.signedIn) {
        acc.openSignIn({ reason: 'order', onDone: () => dispatch({ type: 'checkout/askDetails' }) });
        return;
      }
      dispatch({ type: 'checkout/askDetails' });
    };

    // Delivery details given: remember them, show the QR, and note the order in the sheet as awaiting payment.
    // Signed in, the name and phone number are the account's, and the sheet links the order to it.
    const saveDetails = (details) => {
      const { state: s, account: acc } = latest.current;
      const customer = acc.user ? { ...details, name: acc.user.name, phone: acc.user.phone } : details;
      const orderId = s.orderId || newOrderId();
      saveCustomer(customer);
      dispatch({ type: 'checkout/detailsSaved', customer, orderId });
      scrollToPayment();
      submitOrder(sheetOrder({ orderId, customer }), acc.token);
    };

    const drawBill = ({ timestamp, upiRef }) => {
      const { state: s, summary: sum } = latest.current;
      try {
        return drawOrderSummary({
          summary: sum,
          orderId: s.orderId,
          customer: s.customer,
          timestamp,
          upiRef,
        });
      } catch {
        return null; // canvas blocked: the slip falls back to the HTML version
      }
    };

    // UPI reference number given: save the bill, send the payment to the sheet, and tear off the bill.
    const confirmPayment = (upiRef) => {
      const { state: s, summary: sum } = latest.current;
      const timestamp = formatTimestamp(new Date());
      const fileName = billFileName(s.orderId);
      const photoUrl = drawBill({ timestamp, upiRef });
      submitPayment(sheetOrder({ upiRef }), latest.current.account.token);
      // Listed on the tracking page on this phone
      saveRecentOrder({ id: s.orderId, placedAt: timestamp, total: sum.grandTotal });
      if (photoUrl) saveFile(photoUrl, fileName);
      dispatch({ type: 'order/sent', sentOrder: { timestamp, photoUrl: photoUrl || '', fileName, upiRef } });
      later('settle', NOTEPAD_LEAVE_MS, () => dispatch({ type: 'order/settled' }));
    };

    // A coupon code typed at checkout: the sheet checks it (and says again which offer applies).
    const applyCoupon = async (input) => {
      const code = String(input || '')
        .trim()
        .toUpperCase();
      const { account: acc } = latest.current;
      if (!code) return;
      setDeals((d) => ({ ...d, code, error: '', checking: true }));
      const res = await checkDeals(acc.token, code);
      if (!res.ok) {
        setDeals((d) => ({ ...d, checking: false, coupon: null, error: res.error || 'unavailable' }));
        return;
      }
      setDeals((d) => ({
        ...d,
        checking: false,
        offer: res.offer || null,
        progress: res.progress || d.progress,
        available: res.available || d.available,
        coupon: res.coupon || null,
        error: res.coupon ? '' : res.coupon_error || 'not_found',
      }));
    };
    const removeCoupon = () => setDeals((d) => ({ ...d, code: '', coupon: null, error: '' }));

    // "Order again" from the khata: the same dishes in a fresh order (those no longer on the menu are left out).
    const reorder = ({ orderId, items }) => {
      const { menu: m } = latest.current;
      const onMenu = {};
      m.restaurants.forEach((r) =>
        allDishes(r).forEach(({ dish }) => {
          onMenu[dish.id] = dish;
        }),
      );
      const cart = {};
      const missing = [];
      (items || []).forEach((item) => {
        if (onMenu[item.dish_id]) cart[item.dish_id] = (cart[item.dish_id] || 0) + (Number(item.qty) || 1);
        else missing.push(item.dish);
      });
      clearTimeout(timers.current.cover);
      dispatch({
        type: 'cart/reorder',
        cart,
        note: { orderId, added: Object.keys(cart).length, missing },
      });
      return { added: Object.keys(cart).length, missing };
    };

    const downloadBillAgain = () => {
      const sent = latest.current.state.sentOrder;
      if (!sent) return;
      const photoUrl = sent.photoUrl || drawBill(sent);
      if (photoUrl) saveFile(photoUrl, sent.fileName);
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
      saveDetails,
      askPaymentReference: () => dispatch({ type: 'checkout/askPayment' }),
      closeDialog: () => dispatch({ type: 'checkout/closeDialog' }),
      confirmPayment,
      downloadBillAgain,
      startNewOrder: () => {
        clearTimeout(timers.current.cover);
        setDeals((d) => ({ ...NO_DEALS, offer: null, progress: d.progress }));
        dispatch({ type: 'order/new' });
      },
      applyCoupon,
      removeCoupon,
      reorder,
      dismissReorderNote: () => dispatch({ type: 'reorder/dismiss' }),
    };
  }, [later]);

  const value = useMemo(
    () => ({ state, summary, deals, actions, refs: { tableRef, bookRef } }),
    [state, summary, deals, actions],
  );
  return <OrderContext.Provider value={value}>{children}</OrderContext.Provider>;
}
