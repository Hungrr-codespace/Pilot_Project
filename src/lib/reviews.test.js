import { describe, expect, it } from 'vitest';
import { readSummary, reviewMonth, shortName, tagsForRating, validateReview } from './reviews';

describe('reviews', () => {
  it('shortens names for the website', () => {
    expect(shortName('Aditya Raj Singh')).toBe('Aditya S.');
    expect(shortName('  Muskan ')).toBe('Muskan');
    expect(shortName('')).toBe('');
  });

  it('offers good tags for 4–5 stars and problem tags for 1–3', () => {
    expect(tagsForRating(5)).toContain('On time');
    expect(tagsForRating(2)).toContain('Late');
  });

  it('checks the feedback form', () => {
    const ok = validateReview({
      orderId: 'hg 261011 k7q2',
      phone: '98765 43210',
      rating: 5,
      tags: ['On time', 'Late', 'Made up'],
      comment: '  Hot   food, quick rider ',
      consent: true,
      name: 'Aditya R.',
    });
    expect(ok.errors).toEqual({});
    expect(ok.values).toMatchObject({
      orderId: 'HG-261011-K7Q2',
      phone: '9876543210',
      tags: ['On time'],
      comment: 'Hot food, quick rider',
    });
    const bad = validateReview({ orderId: 'x', phone: '12', rating: 0, consent: true, name: '' });
    expect(Object.keys(bad.errors).sort()).toEqual(['name', 'orderId', 'phone', 'rating']);
    expect(validateReview({ orderId: 'HG-261011-K7Q2', phone: '9876543210', rating: 3 }).errors).toEqual({});
  });

  it('reads the summary safely', () => {
    const summary = readSummary({
      count: 3,
      average: 4.666,
      stars: { 5: 2, 3: 1 },
      tags: { 'On time': 2, Late: 1, 'Hot & fresh': 1 },
    });
    expect(summary.average).toBe(4.7);
    expect(summary.stars[0]).toEqual({ star: 5, count: 2 });
    expect(summary.topTags.map((t) => t.tag)).toEqual(['On time', 'Hot & fresh']);
    expect(readSummary(null)).toMatchObject({ count: 0, average: 0 });
    expect(reviewMonth('2026-10-11T10:08:32Z')).toBe('Oct 2026');
  });
});
