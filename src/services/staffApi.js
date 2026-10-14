// The staff pages' calls to the sheet (see the admin, rider and restaurant sections of google-sheet/Code.gs).
// Each is { action: 'admin' | 'rider' | 'partner', op, token, … } and answers { ok: true, … } or
// { ok: false, error }, where error may be 'signed_out', 'not_staff' or 'unavailable'.
import { callSheet } from './sheetApi';

export const staffCall = (area, op, token, extra = {}) =>
  callSheet({ action: area, op, token, ...extra }, { timeoutMs: 15000 });
