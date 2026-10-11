import { describe, expect, it } from 'vitest';
import { addRecentOrder, isFinished, normalizeOrderId, trackStepIndex } from './tracking';

describe('tracking', () => {
  it('reads order IDs typed in different ways', () => {
    expect(normalizeOrderId('HG-261011-K7Q2')).toBe('HG-261011-K7Q2');
    expect(normalizeOrderId(' hg 261011 k7q2 ')).toBe('HG-261011-K7Q2');
    expect(normalizeOrderId('261011-K7Q2')).toBe('HG-261011-K7Q2');
    expect(normalizeOrderId('HG-2610-K7Q2')).toBe('');
    expect(normalizeOrderId('')).toBe('');
  });

  it('maps sheet statuses to tracking steps', () => {
    expect(trackStepIndex('Awaiting payment')).toBe(0);
    expect(trackStepIndex('Payment to verify')).toBe(1);
    expect(trackStepIndex(' out for delivery ')).toBe(4);
    expect(trackStepIndex('Delivered')).toBe(5);
    expect(trackStepIndex('Cancelled')).toBe(-1);
    expect(trackStepIndex('Something new')).toBe(0);
    expect(isFinished('Delivered')).toBe(true);
    expect(isFinished('Cancelled')).toBe(true);
    expect(isFinished('Preparing')).toBe(false);
  });

  it('keeps the newest recent orders first, without repeats', () => {
    let list = [];
    for (let i = 1; i <= 10; i++) list = addRecentOrder(list, { id: `HG-261011-AAA${i % 10}` });
    expect(list).toHaveLength(8);
    expect(list[0].id).toBe('HG-261011-AAA0');
    list = addRecentOrder(list, { id: 'HG-261011-AAA5', total: 120 });
    expect(list[0]).toEqual({ id: 'HG-261011-AAA5', total: 120 });
    expect(list.filter((o) => o.id === 'HG-261011-AAA5')).toHaveLength(1);
  });
});
