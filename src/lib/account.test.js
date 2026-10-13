import { describe, expect, it } from 'vitest';
import { cleanPin, firstName, initials, khataTotals, pinProblem, validateNewAccount } from './account';

describe('PIN rules', () => {
  it('keeps only six digits', () => {
    expect(cleanPin('48 29-15x7')).toBe('482915');
    expect(cleanPin(null)).toBe('');
  });

  it('accepts an ordinary PIN', () => {
    expect(pinProblem('482915')).toBe('');
    expect(pinProblem('120934')).toBe('');
  });

  it('refuses short, repeated and straight-run PINs', () => {
    expect(pinProblem('4829')).toMatch(/6 digits/);
    expect(pinProblem('777777')).toMatch(/same one/);
    expect(pinProblem('123456')).toMatch(/harder to guess/);
    expect(pinProblem('345678')).toMatch(/harder to guess/);
    expect(pinProblem('987654')).toMatch(/harder to guess/);
    expect(pinProblem('901234')).toMatch(/harder to guess/);
  });
});

describe('validateNewAccount', () => {
  it('cleans the name and checks both PINs match', () => {
    const { values, errors } = validateNewAccount({
      name: '  Aditya   Raj ',
      pin: '482915',
      confirm: '482915',
    });
    expect(values).toEqual({ name: 'Aditya Raj', pin: '482915' });
    expect(errors).toEqual({});
  });

  it('reports each problem', () => {
    expect(validateNewAccount({ name: 'A', pin: '482915', confirm: '482916' }).errors).toEqual({
      name: expect.any(String),
      confirm: expect.any(String),
    });
    expect(validateNewAccount({ name: 'Aditya', pin: '111111', confirm: '111111' }).errors.pin).toBeTruthy();
  });

  it('skips the name when the account already exists (a new PIN after a reset)', () => {
    expect(
      validateNewAccount({ name: '', pin: '482915', confirm: '482915' }, { needsName: false }).errors,
    ).toEqual({});
  });
});

describe('names', () => {
  it('gives the first name and initials', () => {
    expect(firstName(' Aditya Raj Singh ')).toBe('Aditya');
    expect(initials('Aditya Raj Singh')).toBe('AS');
    expect(initials('muskan')).toBe('M');
    expect(initials('')).toBe('');
  });
});

describe('khataTotals', () => {
  it('counts orders, those not cancelled, the money paid for them, and reviews', () => {
    const orders = [
      { status: 'Delivered', grand_total: 233.5, review: { rating: 5 } },
      { status: 'Cancelled', grand_total: 120 },
      { status: 'Paid', grand_total: 99.25 },
    ];
    expect(khataTotals(orders)).toEqual({ orders: 3, counted: 2, paid: 332.75, rated: 1 });
    expect(khataTotals(undefined)).toEqual({ orders: 0, counted: 0, paid: 0, rated: 0 });
  });
});
