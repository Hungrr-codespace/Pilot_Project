import { describe, expect, it } from 'vitest';
import {
  formatIndianPhone,
  formatUpiRef,
  isValidUpiRef,
  normalizePhone,
  normalizeUpiRef,
  validateDetails,
} from './checkout';

describe('checkout', () => {
  it('accepts Indian mobile numbers written in different ways', () => {
    expect(normalizePhone('98765 43210')).toBe('9876543210');
    expect(normalizePhone('+91 98765-43210')).toBe('9876543210');
    expect(normalizePhone('098765 43210')).toBe('9876543210');
    expect(normalizePhone('12345 67890')).toBe(''); // mobile numbers start with 6–9
    expect(normalizePhone('98765')).toBe('');
    expect(formatIndianPhone('9876543210')).toBe('+91 98765 43210');
  });

  it('checks the delivery details and tidies them', () => {
    const ok = validateDetails({
      name: '  Aditya   Raj ',
      phone: '9876543210',
      address: 'Hostel 3, room 12',
    });
    expect(ok.errors).toEqual({});
    expect(ok.values).toEqual({ name: 'Aditya Raj', phone: '9876543210', address: 'Hostel 3, room 12' });

    const bad = validateDetails({ name: 'A', phone: '123', address: '' });
    expect(Object.keys(bad.errors).sort()).toEqual(['address', 'name', 'phone']);
  });

  it('reads 12-digit UPI reference numbers', () => {
    expect(normalizeUpiRef('4123 5678-9012')).toBe('412356789012');
    expect(normalizeUpiRef('41235678901234')).toBe('412356789012');
    expect(isValidUpiRef('412356789012')).toBe(true);
    expect(isValidUpiRef('41235678901')).toBe(false);
    expect(formatUpiRef('412356789012')).toBe('4123 5678 9012');
  });
});
