import { describe, expect, it } from 'vitest';
import { initialOrderState, isOrderZoomed, orderReducer } from './orderReducer';

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
    state = orderReducer(state, { type: 'notepad/confirm', orderId: 'HG-1' });
    expect(isOrderZoomed(state)).toBe(true);
    state = orderReducer(state, {
      type: 'order/sent',
      sentOrder: { timestamp: '', photoUrl: '', fileName: '' },
    });
    state = orderReducer(state, { type: 'order/settled' });
    expect(state.notepad.isOpen).toBe(false);
    expect(state.book.isOpen).toBe(false);
    expect(isOrderZoomed(state)).toBe(true);
  });

  it('a new order empties the cart but keeps the table and open restaurant', () => {
    const state = run(
      { type: 'cart/setQuantity', dishId: 'bt1', quantity: 1 },
      { type: 'table/turn', by: 3 },
      { type: 'notepad/confirm', orderId: 'HG-1' },
      { type: 'order/new' },
    );
    expect(state.cart).toEqual({});
    expect(state.orderId).toBe('');
    expect(state.tableTurns).toBe(3);
    expect(state.restaurantId).toBe('bt');
  });
});
