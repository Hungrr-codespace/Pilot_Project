import { describe, expect, it } from 'vitest';
import fallbackRows from '@/data/menu-fallback.json';
import { normalizeMenu } from './menuData';
import { ridersNeeded, summarizeOrder } from './pricing';

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

  it('needs at least one rider', () => {
    expect(ridersNeeded(menu.restaurants, menu.clusters, {})).toBe(1);
  });
});
