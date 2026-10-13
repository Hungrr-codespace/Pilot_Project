// Reviews from pilot customers: the choices on the feedback form, checking what was entered, and how reviews are
// shown. Pure functions, tested in reviews.test.js. The sheet side is in google-sheet/Code.gs (saveReview_).
import { normalizePhone } from './checkout';
import { normalizeOrderId } from './tracking';

export const RATING_WORDS = ['', 'Terrible', 'Not good', 'Okay', 'Good', 'Loved it'];

// Quick tags: what went well (4–5 stars) or what went wrong (1–3 stars). The same lists are in Code.gs.
export const GOOD_TAGS = [
  'On time',
  'Hot & fresh',
  'Right order',
  'Good packaging',
  'Easy to order',
  'Fair price',
  'Friendly rider',
];
export const BAD_TAGS = [
  'Late',
  'Cold food',
  'Wrong or missing item',
  'Poor packaging',
  'Hard to order',
  'Too pricey',
  'Rider issue',
];
export const tagsForRating = (rating) => (rating >= 4 ? GOOD_TAGS : BAD_TAGS);

export const REVIEW_LIMITS = { comment: 280, improve: 400, name: 30 };

const tidy = (text, max) =>
  String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

// "Aditya Raj Singh" → "Aditya S." (what the website shows by default)
export function shortName(fullName) {
  const parts = tidy(fullName, 60).split(' ').filter(Boolean);
  if (!parts.length) return '';
  return parts.length === 1 ? parts[0] : `${parts[0]} ${parts[parts.length - 1][0].toUpperCase()}.`;
}

// The feedback form → { values, errors }. `values` is cleaned up; `errors` has a message per field to fix.
export function validateReview(form) {
  const rating = Math.round(Number(form.rating) || 0);
  const allowed = tagsForRating(rating);
  const values = {
    orderId: normalizeOrderId(form.orderId),
    phone: normalizePhone(form.phone),
    rating,
    tags: (Array.isArray(form.tags) ? form.tags : []).filter((tag) => allowed.includes(tag)),
    comment: tidy(form.comment, REVIEW_LIMITS.comment),
    improve: tidy(form.improve, REVIEW_LIMITS.improve),
    name: tidy(form.name, REVIEW_LIMITS.name),
    consent: !!form.consent,
  };
  const errors = {};
  if (!values.orderId) errors.orderId = 'Enter the order ID from your bill, like HG-261011-K7Q2.';
  if (!values.phone) errors.phone = 'Enter the 10-digit number you ordered with.';
  if (rating < 1 || rating > 5) errors.rating = 'Tap a star to rate your order.';
  if (values.consent && values.name.length < 2) errors.name = 'Add the name to show with your review.';
  return { values, errors };
}

// "2026-10-11T10:08:32Z" → "Oct 2026"
const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function reviewMonth(iso) {
  const date = new Date(iso);
  return Number.isNaN(date.getTime()) ? '' : `${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

// The summary the sheet sends ({ count, average, stars: { 1..5 }, tags: { tag: n } }) made safe to show.
export function readSummary(summary) {
  const count = Math.max(0, Number(summary?.count) || 0);
  const stars = [5, 4, 3, 2, 1].map((star) => ({
    star,
    count: Math.max(0, Number(summary?.stars?.[star]) || 0),
  }));
  const topTags = Object.entries(summary?.tags || {})
    .filter(([tag, n]) => GOOD_TAGS.includes(tag) && n > 0)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([tag, n]) => ({ tag, count: n }));
  const average = count ? Math.round((Number(summary?.average) || 0) * 10) / 10 : 0;
  return { count, average, stars, topTags };
}
