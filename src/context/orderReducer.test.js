import { describe, expect, it } from 'vitest';
import { getOrderStep, initialOrderState, isOrderZoomed, orderReducer } from './orderReducer';

const CUSTOMER = { name: 'Aditya Raj', phone: '9876543210', address: 'Hostel 3, room 12' };
const run = (...actions) => actions.reduce(orderReducer, { ...initialOrderState, restaurantId: 'bt' });

describe('orderReducer', () => {
  it('adds and removes dishes', () => {
    const state = run(
      { type: 'cart/setQuantity', dishId: 'bt1', quantity: 2 },
      { type: 'cart/setQuantity', dishId: 'ad1', quantity: 1 },
      { type: 'cart/setQuantity', dishId: 'bt1', quantity: 0 },
    );
    expect(state.cart).toEqual({ ad1: 1 });
  });

  it('typing a search clears the quick pick', () => {
    const state = run(
      { type: 'table/pickDish', dishTypeId: 'pizza', turns: 2 },
      { type: 'search/setQuery', query: 'dosa' },
    );
    expect(state.dishTypeId).toBe('');
    expect(state.query).toBe('dosa');
    expect(state.tableTurns).toBe(2);
  });

  it('zooms in while paying and after sending', () => {
    let state = run({ type: 'notepad/open' });
    expect(isOrderZoomed(state)).toBe(false);
    state = orderReducer(state, { type: 'checkout/askDetails' });
    expect(state.dialog).toBe('details');
    expect(isOrderZoomed(state)).toBe(false);
    state = orderReducer(state, { type: 'checkout/detailsSaved', customer: CUSTOMER, orderId: 'HG-1' });
    expect(state.dialog).toBe(null);
    expect(state.notepad.page).toBe('pay');
    expect(isOrderZoomed(state)).toBe(true);
    state = orderReducer(state, { type: 'checkout/askPayment' });
    expect(state.dialog).toBe('payment');
    state = orderReducer(state, {
      type: 'order/sent',
      sentOrder: { timestamp: '', photoUrl: '', fileName: '', upiRef: '412356789012' },
    });
    expect(state.dialog).toBe(null);
    state = orderReducer(state, { type: 'order/settled' });
    expect(state.notepad.isOpen).toBe(false);
    expect(state.book.isOpen).toBe(false);
    expect(isOrderZoomed(state)).toBe(true);
  });

  it('a new order empties the cart but keeps the table, open restaurant and delivery details', () => {
    const state = run(
      { type: 'cart/setQuantity', dishId: 'bt1', quantity: 1 },
      { type: 'table/turn', by: 3 },
      { type: 'checkout/detailsSaved', customer: CUSTOMER, orderId: 'HG-1' },
      { type: 'order/new' },
    );
    expect(state.cart).toEqual({});
    expect(state.orderId).toBe('');
    expect(state.customer).toEqual(CUSTOMER);
    expect(state.tableTurns).toBe(3);
    expect(state.restaurantId).toBe('bt');
  });

  it('tracks the ordering step for the progress bar', () => {
    let state = run({ type: 'cart/setQuantity', dishId: 'bt1', quantity: 1 });
    expect(getOrderStep(state)).toBe(1);
    state = orderReducer(state, { type: 'notepad/open' });
    expect(getOrderStep(state)).toBe(2);
    state = orderReducer(state, { type: 'checkout/askDetails' });
    expect(getOrderStep(state)).toBe(3);
    state = orderReducer(state, { type: 'checkout/detailsSaved', customer: CUSTOMER, orderId: 'HG-1' });
    expect(getOrderStep(state)).toBe(4);
    state = orderReducer(state, { type: 'checkout/askPayment' });
    expect(getOrderStep(state)).toBe(5);
    state = orderReducer(state, { type: 'checkout/closeDialog' });
    expect(getOrderStep(state)).toBe(4);
  });
});
