import { describe, expect, it } from 'vitest';
import { buildUpiLink } from './upi';

describe('buildUpiLink', () => {
  it('builds a UPI payment link with the amount and order ID', () => {
    const link = buildUpiLink({
      upiId: 'name@oksbi',
      upiName: 'Aditya Raj',
      amount: 497.95,
      orderId: 'HG-261006-K7Q2',
    });
    expect(link).toBe('upi://pay?pa=name@oksbi&pn=Aditya%20Raj&am=497.95&cu=INR&tn=Hungrr%20HG-261006-K7Q2');
  });

  it('always sends two decimals', () => {
    expect(buildUpiLink({ upiId: 'a@b', upiName: 'A', amount: 120, orderId: '' })).toContain('am=120.00');
  });
});
