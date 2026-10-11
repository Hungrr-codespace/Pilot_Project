import { describe, expect, it } from 'vitest';
import { buildOrderMessage, formatPhoneNumber, whatsappLink } from './whatsapp';

describe('whatsapp', () => {
  it('formats Indian numbers for display', () => {
    expect(formatPhoneNumber('917979037042')).toBe('+91 79790 37042');
    expect(formatPhoneNumber('14155550100')).toBe('+14155550100');
  });

  it('builds chat links with prefilled text', () => {
    expect(whatsappLink('917979037042')).toBe('https://wa.me/917979037042');
    expect(whatsappLink('91', 'Hi there')).toBe('https://wa.me/91?text=Hi%20there');
  });

  it('writes the order message with the order ID, UPI reference, delivery details and dishes', () => {
    const summary = {
      grandTotal: 497.95,
      lines: [{ restaurant: { name: 'Babai Tiffins' }, items: [{ dish: { name: 'Idli (2 Pcs)' }, qty: 2 }] }],
    };
    const customer = { name: 'Aditya Raj', phone: '9876543210', address: 'Hostel 3, room 12' };
    const text = buildOrderMessage({ summary, orderId: 'HG-261006-K7Q2', customer, upiRef: '412356789012' });
    expect(text).toContain('Order ID: HG-261006-K7Q2');
    expect(text).toContain('UPI ref no.: 4123 5678 9012');
    expect(text).toContain('Name: Aditya Raj\nPhone: +91 98765 43210\nDeliver to: Hostel 3, room 12');
    expect(text).toContain('Babai Tiffins\n• 2× Idli (2 Pcs)');
    expect(text).toContain('Grand total: ₹497.95 (incl. GST and delivery), paid by UPI.');
  });
});
