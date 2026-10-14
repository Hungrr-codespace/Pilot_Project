// Accounts through the Google Sheet (see the accounts section of google-sheet/Code.gs). Every call answers
// { ok: true, … } or { ok: false, error }, where error is one of the codes below or 'unavailable' (no sheet,
// no connection, no answer in time).
import { callSheet } from './sheetApi';

// → { ok, status: 'new' | 'existing' | 'reset' | 'locked', minutes? }
export const startAccount = (phone) => callSheet({ action: 'account_start', phone });

// → { ok, token, user } or error 'exists' | 'weak_pin' | 'bad_name' | 'bad_phone'
export const signUp = ({ phone, name, pin }) => callSheet({ action: 'sign_up', phone, name, pin });

// → { ok, token, user } or error 'wrong_pin' (tries_left) | 'locked' (minutes) | 'not_found' | 'reset'
export const signIn = ({ phone, pin }) => callSheet({ action: 'sign_in', phone, pin });

// → { ok, user, orders?, unclaimed? } or error 'signed_out'
export const fetchAccount = (token, { orders = false } = {}) =>
  callSheet({ action: 'account', token, orders }, { timeoutMs: orders ? 15000 : 9000 });

// → { ok, user } or error 'bad_name' | 'signed_out'
export const updateName = (token, name) => callSheet({ action: 'update_name', token, name });

// The offer this order would get and the coupon's rule (see lib/deals.js):
// → { ok, offer, coupon, coupon_error, progress } or error 'signed_out'
export const checkDeals = (token, coupon = '') =>
  callSheet({ action: 'deals', token, coupon }, { timeoutMs: 9000 });

// → { ok, order_id, already? } or error 'not_found' | 'not_paid' | 'signed_out'
export const claimOrder = (token, orderId) => callSheet({ action: 'claim_order', token, order_id: orderId });
