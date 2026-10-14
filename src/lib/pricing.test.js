import { describe, expect, it } from 'vitest';
import fallbackRows from '@/data/menu-fallback.json';
import { normalizeMenu } from './menuData';
import { chargeLines, ridersNeeded, summarizeOrder } from './pricing';

const menu = normalizeMenu(fallbackRows);
const summarize = (cart) => summarizeOrder({ ...menu, cart });

describe('summarizeOrder', () => {
  it('is empty with nothing in the cart', () => {
    const s = summarize({});
    expect(s.isEmpty).toBe(true);
    expect(s.delivery).toBe(0);
    expect(s.grandTotal).toBe(0);
  });

  it('charges one rider for restaurants in the same cluster', () => {
    const s = summarize({ bt1: 2 }); // Babai Tiffins, cluster 1
    expect(s.itemTotal).toBe(118);
    expect(s.riders).toBe(1);
    expect(s.deliveryLabel).toBe('Delivery charge (1 rider)');
  });

  it('adds a rider for every extra cluster, plus GST', () => {
    const s = summarize({ bt1: 1, ad1: 1 }); // cluster 1 + cluster 2
    expect(s.itemTotal).toBe(379);
    expect(s.gst).toBe(18.95);
    expect(s.riders).toBe(2);
    expect(s.delivery).toBe(100);
    expect(s.grandTotal).toBeCloseTo(497.95, 2);
    expect(s.lines.map((l) => l.restaurant.name)).toEqual(['Babai Tiffins', 'Al Daaz']);
  });

  it('takes a coupon off the food before GST', () => {
    const coupon = { kind: 'coupon', code: 'WELCOME20', type: 'percent', value: 20, max_discount: 60 };
    const s = summarizeOrder({ ...menu, cart: { bt1: 2 }, deals: [coupon] }); // 118 → 23.60 off
    expect(s.discountOnItems).toBe(23.6);
    expect(s.gst).toBe(4.72); // 5% of 94.40
    expect(s.grandTotal).toBe(149.12); // 94.40 + 4.72 + 50
    expect(chargeLines(s).map((l) => l.text)).toEqual(['₹118', '−₹23.60', '₹4.72', '₹50']);
  });

  it('applies the offer or the coupon, whichever saves more', () => {
    const offer = { kind: 'offer', name: 'Every 5th order: free delivery', type: 'free_delivery' };
    const coupon = { kind: 'coupon', code: 'TEN', type: 'amount', value: 10 };
    const s = summarizeOrder({ ...menu, cart: { bt1: 1, ad1: 1 }, deals: [offer, coupon] });
    expect(s.deal).toBe(offer);
    expect(s.discountOnDelivery).toBe(100);
    expect(s.grandTotal).toBeCloseTo(397.95, 2);
    expect(chargeLines(s).at(-1)).toEqual({
      label: 'Every 5th order: free delivery',
      amount: 100,
      discount: true,
      text: '−₹100',
    });
  });

  it('needs at least one rider', () => {
    expect(ridersNeeded(menu.restaurants, menu.clusters, {})).toBe(1);
  });
});
