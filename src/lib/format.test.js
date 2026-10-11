import { describe, expect, it } from 'vitest';
import { billFileName, formatRupees, formatTimestamp, plural } from './format';

describe('format', () => {
  it('shows paise only when there are any', () => {
    expect(formatRupees(120)).toBe('₹120');
    expect(formatRupees(21.4)).toBe('₹21.40');
    expect(formatRupees(497.95)).toBe('₹497.95');
  });

  it('pluralises', () => {
    expect(plural(1, 'item')).toBe('1 item');
    expect(plural(3, 'item')).toBe('3 items');
    expect(plural(2, 'dish', 'dishes')).toBe('2 dishes');
  });

  it('formats the order time and bill file name', () => {
    const date = new Date(2026, 9, 6, 18, 5);
    expect(formatTimestamp(date)).toBe('6 Oct 2026, 6:05 PM');
    expect(billFileName('HG-261006-K7Q2')).toBe('hungrr-bill-HG-261006-K7Q2.png');
  });
});
