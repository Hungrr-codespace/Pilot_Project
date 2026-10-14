// Everything the customer does while ordering, as one reducer: the menu book, the quick-picks table, search,
// the cart, the order notepad, the checkout dialogs and the paid order. Pure function; side effects live in
// OrderProvider.
import { EMPTY_CUSTOMER } from '@/lib/checkout';

export const initialOrderState = {
  book: {
    isOpen: false,
    coverBehind: false, // after the cover has swung open it drops behind the pages
    page: 'index', // 'index' (restaurant list) | 'restaurant' (one restaurant's dishes)
  },
  restaurantId: '', // restaurant shown on the 'restaurant' page
  categoryByRestaurant: {}, // last category tab opened per restaurant
  query: '', // typed search
  dishTypeId: '', // quick pick chosen on the table
  tableTurns: 0, // table rotation, in plate steps (positive = turned left)
  cart: {}, // { dishId: quantity }
  notepad: {
    isOpen: false,
    page: 'order', // 'order' (review) | 'pay' (UPI QR)
    isLeaving: false, // slides away after "Paid?"
  },
  dialog: null, // checkout dialog on screen: 'details' (before the QR) | 'payment' (UPI reference number)
  customer: EMPTY_CUSTOMER, // { name, phone, address } for delivery
  orderId: '',
  sentOrder: null, // { timestamp, photoUrl, fileName, upiRef } once the payment is confirmed
  reorderNote: null, // { orderId, added, missing: [dish names] } after "Order again" in the khata
};

export function orderReducer(state, action) {
  switch (action.type) {
    case 'book/open':
      return { ...state, book: { ...state.book, isOpen: true } };
    case 'book/coverBehind':
      return { ...state, book: { ...state.book, coverBehind: true } };
    case 'book/showIndex':
      return { ...state, book: { ...state.book, page: 'index' } };
    case 'book/showRestaurant': {
      const { restaurantId, categoryId } = action;
      return {
        ...state,
        restaurantId,
        book: { ...state.book, page: 'restaurant' },
        categoryByRestaurant: categoryId
          ? { ...state.categoryByRestaurant, [restaurantId]: categoryId }
          : state.categoryByRestaurant,
      };
    }
    case 'book/selectCategory':
      return {
        ...state,
        categoryByRestaurant: { ...state.categoryByRestaurant, [action.restaurantId]: action.categoryId },
      };

    case 'search/setQuery':
      return { ...state, query: action.query, dishTypeId: '' };
    case 'search/clearQuery':
      return { ...state, query: '' };
    case 'search/clearDishType':
      return { ...state, dishTypeId: '' };

    case 'table/turn':
      return { ...state, tableTurns: state.tableTurns + action.by };
    case 'table/setTurns':
      return { ...state, tableTurns: action.turns };
    case 'table/pickDish':
      return {
        ...state,
        tableTurns: action.turns,
        dishTypeId: action.dishTypeId,
        query: '',
        book: { ...state.book, page: 'index' },
        notepad: initialOrderState.notepad,
        dialog: null,
        sentOrder: null,
      };

    case 'cart/setQuantity': {
      const cart = { ...state.cart };
      if (action.quantity <= 0) delete cart[action.dishId];
      else cart[action.dishId] = action.quantity;
      return { ...state, cart };
    }

    // "Order again": a fresh order with the dishes of an earlier one, the notepad open on it
    case 'cart/reorder':
      return {
        ...initialOrderState,
        customer: state.customer,
        restaurantId: state.restaurantId,
        categoryByRestaurant: state.categoryByRestaurant,
        tableTurns: state.tableTurns,
        cart: action.cart,
        notepad: { ...initialOrderState.notepad, isOpen: Object.keys(action.cart).length > 0 },
        reorderNote: action.note,
      };
    case 'reorder/dismiss':
      return { ...state, reorderNote: null };

    case 'notepad/open':
      return { ...state, notepad: { ...initialOrderState.notepad, isOpen: true } };
    case 'notepad/close':
      return { ...state, notepad: initialOrderState.notepad, dialog: null };
    case 'notepad/backToOrder':
      return { ...state, notepad: { ...state.notepad, page: 'order' } };

    // Checkout: "Confirm order" asks for delivery details, then the payment sheet (QR) shows.
    // After paying, "Confirm payment" asks for the UPI reference number.
    case 'checkout/askDetails':
      return { ...state, dialog: 'details' };
    case 'checkout/detailsSaved':
      return {
        ...state,
        customer: action.customer,
        orderId: action.orderId,
        dialog: null,
        notepad: { ...state.notepad, page: 'pay' },
      };
    case 'checkout/askPayment':
      return { ...state, dialog: 'payment' };
    case 'checkout/closeDialog':
      return { ...state, dialog: null };

    case 'order/sent':
      return {
        ...state,
        dialog: null,
        sentOrder: action.sentOrder,
        book: { ...state.book, page: 'index' },
        notepad: { ...state.notepad, isLeaving: true },
      };
    // The notepad has slid away and the book closes again behind the order photo.
    case 'order/settled':
      return { ...state, notepad: initialOrderState.notepad, book: initialOrderState.book };
    case 'order/photoUpdated':
      return { ...state, sentOrder: { ...state.sentOrder, ...action.patch } };
    case 'order/new':
      return {
        ...initialOrderState,
        customer: state.customer, // ready for the next order
        restaurantId: state.restaurantId,
        categoryByRestaurant: state.categoryByRestaurant,
        tableTurns: state.tableTurns,
      };

    default:
      throw new Error(`Unknown order action: ${action.type}`);
  }
}

// The order note and payment are zoomed in (the table fades out) while paying and after sending.
export const isOrderZoomed = (state) =>
  (state.notepad.isOpen && state.notepad.page === 'pay') || !!state.sentOrder;

// Where the customer is in the five ordering steps shown on the pilot page:
// 1 pick dishes · 2 review order · 3 delivery details · 4 pay by UPI · 5 confirm payment · 6 done.
export function getOrderStep(state) {
  if (state.sentOrder) return 6;
  if (state.dialog === 'payment') return 5;
  if (state.notepad.isOpen && state.notepad.page === 'pay') return 4;
  if (state.dialog === 'details') return 3;
  if (state.notepad.isOpen) return 2;
  return 1;
}
