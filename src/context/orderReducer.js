// Everything the customer does while ordering, as one reducer: the menu book, the quick-picks table, search,
// the cart, the order notepad and the sent order. Pure function; side effects live in OrderProvider.

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
  orderId: '',
  sentOrder: null, // { timestamp, photoUrl, fileName } once "Paid?" is tapped
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
        sentOrder: null,
      };

    case 'cart/setQuantity': {
      const cart = { ...state.cart };
      if (action.quantity <= 0) delete cart[action.dishId];
      else cart[action.dishId] = action.quantity;
      return { ...state, cart };
    }

    case 'notepad/open':
      return { ...state, notepad: { ...initialOrderState.notepad, isOpen: true } };
    case 'notepad/close':
      return { ...state, notepad: initialOrderState.notepad };
    case 'notepad/confirm':
      return { ...state, orderId: action.orderId, notepad: { ...state.notepad, page: 'pay' } };
    case 'notepad/backToOrder':
      return { ...state, notepad: { ...state.notepad, page: 'order' } };

    case 'order/sent':
      return {
        ...state,
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
