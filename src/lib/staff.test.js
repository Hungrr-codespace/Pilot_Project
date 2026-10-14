import { describe, expect, it } from 'vitest';
import {
  NEXT_STEP,
  boardColumn,
  cleanCode,
  couponState,
  customerUpdate,
  dateRange,
  menuBook,
  newCouponCode,
  ordinal,
} from './staff';

describe('order board', () => {
  it('moves an order one step at a time', () => {
    expect(NEXT_STEP['Payment to verify'].status).toBe('Paid');
    expect(NEXT_STEP['Out for delivery'].status).toBe('Delivered');
    expect(NEXT_STEP.Delivered).toBeUndefined();
  });

  it('puts cancelled orders with the finished ones', () => {
    expect(boardColumn('Cancelled')).toBe('Delivered');
    expect(boardColumn('Paid')).toBe('Paid');
  });
});

describe('customerUpdate', () => {
  const order = {
    order_id: 'HG-261014-AB12',
    customer_name: 'Aditya Raj',
    status: 'Out for delivery',
    rider_name: 'Ravi',
  };
  it('writes the WhatsApp update for the status', () => {
    expect(customerUpdate(order, 'https://hungrr.in')).toBe(
      'Hi Aditya, your Hungrr order HG-261014-AB12 is on the way with Ravi. Track it: https://hungrr.in/track?order=HG-261014-AB12',
    );
    expect(customerUpdate({ ...order, status: 'Delivered' }, 'https://hungrr.in')).toMatch(
      /feedback\?order=HG-261014-AB12$/,
    );
    expect(customerUpdate({ ...order, status: 'Cancelled', grand_total: 120 })).toMatch(
      /\(₹120\) was cancelled/,
    );
  });
});

describe('coupon codes', () => {
  it('makes readable codes', () => {
    let i = 0;
    const seq = [0, 0.99, 0.5, 0.1, 0.2, 0.3];
    expect(newCouponCode(() => seq[i++])).toBe('HGA9SDGK');
    expect(newCouponCode()).toMatch(/^HG[A-HJ-NP-Z2-9]{6}$/);
  });

  it('cleans a typed code', () => {
    expect(cleanCode(' welcome-20 ')).toBe('WELCOME20');
  });
});

describe('ordinal', () => {
  it('names the Nth order', () => {
    expect([1, 2, 3, 4, 5, 11, 12, 13, 21, 22].map(ordinal)).toEqual([
      '1st',
      '2nd',
      '3rd',
      '4th',
      '5th',
      '11th',
      '12th',
      '13th',
      '21st',
      '22nd',
    ]);
  });
});

describe('dateRange', () => {
  it("writes a coupon's dates", () => {
    expect(dateRange('2026-10-16', '2026-10-16')).toBe('16 Oct only');
    expect(dateRange('2026-10-16', '2026-10-21')).toBe('16 Oct to 21 Oct');
    expect(dateRange('', '2026-10-21')).toBe('until 21 Oct');
    expect(dateRange('2026-10-16', '')).toBe('from 16 Oct');
    expect(dateRange('', '')).toBe('');
  });
});

describe('menuBook', () => {
  const data = {
    clusters: [
      { id: 'c2', label: 'Cluster 02', area: 'Main road', sort: 2 },
      { id: 'c1', label: 'Cluster 01', area: 'Gate 1', sort: 1 },
    ],
    restaurants: [
      { id: 'ad', name: 'Al Daaz', cluster_id: 'c2', active: true, sort: 3 },
      { id: 'bt', name: 'Babai Tiffins', cluster_id: 'c1', active: true, sort: 1 },
      { id: 'zz', name: 'New Place', cluster_id: '', active: false, sort: 9 },
    ],
    dishes: [
      { id: 'bt2', restaurant_id: 'bt', name: 'Masala Dosa', category: 'Dosa', available: false, sort: 2 },
      { id: 'bt1', restaurant_id: 'bt', name: 'Idli', category: 'Idli', available: true, sort: 1 },
      { id: 'bt3', restaurant_id: 'bt', name: 'Ghee Dosa', category: 'Dosa', available: true, sort: 3 },
      { id: 'ad1', restaurant_id: 'ad', name: 'Chicken Mandi', category: 'Mandi', available: true, sort: 4 },
    ],
  };

  it('groups restaurants by cluster and dishes by category, in sort order, with sold-out counts', () => {
    const { groups } = menuBook(data);
    expect(groups.map((g) => g.cluster.label)).toEqual(['Cluster 01', 'Cluster 02', 'Other']);
    const bt = groups[0].restaurants[0];
    expect(bt.categories.map((c) => [c.name, c.dishes.map((d) => d.id)])).toEqual([
      ['Idli', ['bt1']],
      ['Dosa', ['bt2', 'bt3']],
    ]);
    expect([bt.dishCount, bt.soldOut]).toEqual([3, 1]);
    expect(groups[2].restaurants[0].categories).toEqual([]);
  });

  it('keeps only matching dishes when searching, or all of a restaurant whose name matches', () => {
    const dosa = menuBook(data, 'dosa');
    expect(dosa.restaurants.map((r) => r.id)).toEqual(['bt']);
    expect(dosa.restaurants[0].categories.flatMap((c) => c.dishes.map((d) => d.id))).toEqual(['bt2', 'bt3']);
    expect(dosa.restaurants[0].dishCount).toBe(3);
    const daaz = menuBook(data, 'daaz');
    expect(daaz.groups.map((g) => g.cluster.id)).toEqual(['c2']);
    expect(daaz.restaurants[0].categories[0].dishes).toHaveLength(1);
    expect(menuBook(data, 'pizza').groups).toEqual([]);
  });
});

describe('couponState', () => {
  it('says why a coupon is not active now', () => {
    expect(couponState({ state: 'live' })).toBe('');
    expect(couponState({ state: 'off' })).toBe('Switched off');
    expect(couponState({ state: 'scheduled', starts_on: '2026-10-20' })).toBe('Starts 20 Oct');
    expect(couponState({ state: 'expired' })).toBe('Expired');
    expect(couponState({ state: 'used_up' })).toBe('Used up');
  });
});
