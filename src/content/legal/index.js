import { PRIVACY_POLICY } from './privacy';
import { TERMS } from './terms';
import { REFUND_POLICY } from './refunds';

export { POLICIES_UPDATED } from './business';

// The three policy pages, by id (see LEGAL_LINKS in config/site.js for their addresses).
export const LEGAL_DOCS = {
  privacy: PRIVACY_POLICY,
  terms: TERMS,
  refunds: REFUND_POLICY,
};
