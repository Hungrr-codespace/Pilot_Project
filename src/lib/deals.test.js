import { describe, expect, it } from 'vitest';
import {
  bestDeal,
  couponChoices,
  dealAmount,
  dealLabel,
  describeDeal,
  minOrderGap,
  progressText,
} from './deals';

const coupon = (type, value, extra = {}) => ({
  kind: 'coupon',
  code: 'TEST',
  label: 'TEST',
  type,
  value,
  ...extra,
});
const offer = {
  kind: 'offer',
  name: 'Every 5th order: free delivery',
  label: 'Every 5th order: free delivery',
  type: 'free_delivery',
};

describe('dealAmount', () => {
  it('takes rupees off the food, never more than the food', () => {
    expect(dealAmount(coupon('amount', 50), 195, 40)).toEqual({ onItems: 50, onDelivery: 0 });
    expect(dealAmount(coupon('amount', 500), 195, 40)).toEqual({ onItems: 195, onDelivery: 0 });
  });

  it('takes a percentage off the food, up to the cap', () => {
    expect(dealAmount(coupon('percent', 20, { max_discount: 60 }), 195, 40)).toEqual({
      onItems: 39,
      onDelivery: 0,
    });
    expect(dealAmount(coupon('percent', 20, { max_discount: 60 }), 500, 40)).toEqual({
      onItems: 60,
      onDelivery: 0,
    });
    expect(dealAmount(coupon('percent', 15), 133, 40)).toEqual({ onItems: 19.95, onDelivery: 0 });
  });

  it('makes delivery free', () => {
    expect(dealAmount(offer, 65, 80)).toEqual({ onItems: 0, onDelivery: 80 });
  });

  it('needs the minimum order', () => {
    expect(dealAmount(coupon('amount', 50, { min_order: 100 }), 65, 40)).toEqual({
      onItems: 0,
      onDelivery: 0,
    });
    expect(minOrderGap(coupon('amount', 50, { min_order: 100 }), 65)).toBe(35);
    expect(minOrderGap(coupon('amount', 50, { min_order: 100 }), 130)).toBe(0);
  });
});

describe('bestDeal', () => {
  it('uses the one that saves more (one offer per order)', () => {
    expect(bestDeal([offer, coupon('amount', 50, { min_order: 100 })], 130, 40).rule.kind).toBe('coupon');
    expect(bestDeal([offer, coupon('amount', 30)], 130, 40).rule.kind).toBe('offer');
    expect(bestDeal([offer, null], 130, 40).onDelivery).toBe(40);
    expect(bestDeal([], 130, 40).rule).toBe(null);
  });
});

describe('labels', () => {
  it('describes rules and progress', () => {
    expect(describeDeal(coupon('amount', 50))).toBe('₹50 off');
    expect(describeDeal(coupon('percent', 20, { max_discount: 60 }))).toBe('20% off, up to ₹60');
    expect(describeDeal(offer)).toBe('Free delivery');
    expect(dealLabel(coupon('amount', 50))).toBe('Coupon TEST');
    expect(dealLabel(offer)).toBe('Every 5th order: free delivery');
    expect(progressText({ type: 'free_delivery', every_n: 5, done: 2, next_gets_it: false })).toBe(
      '2 more orders, then the next one gets free delivery.',
    );
    expect(progressText({ type: 'free_delivery', every_n: 5, done: 4, next_gets_it: true })).toBe(
      'Your next order gets free delivery.',
    );
  });
});

describe('couponChoices', () => {
  const fifty = { kind: 'coupon', code: 'EXAM50', type: 'amount', value: 50, min_order: 199 };
  const thirty = { kind: 'coupon', code: 'PILOT30', type: 'percent', value: 30, max_discount: 150 };
  const ride = { kind: 'coupon', code: 'FREERIDE', type: 'free_delivery' };
  const big = { kind: 'coupon', code: 'BIG100', type: 'amount', value: 100, min_order: 500 };

  it('lists what each coupon saves, the usable ones first and the biggest saving first', () => {
    const list = couponChoices([ride, big, fifty, thirty], 244, 40);
    expect(list.map((c) => [c.rule.code, c.saves, c.gap])).toEqual([
      ['PILOT30', 73.2, 0],
      ['EXAM50', 50, 0],
      ['FREERIDE', 40, 0],
      ['BIG100', 0, 256],
    ]);
  });

  it('puts coupons that need more food last, the nearest first', () => {
    const list = couponChoices([big, fifty], 150, 40);
    expect(list.map((c) => [c.rule.code, c.gap])).toEqual([
      ['EXAM50', 49],
      ['BIG100', 350],
    ]);
    expect(couponChoices(undefined, 100, 40)).toEqual([]);
  });
});
