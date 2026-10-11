// Business details shown on the policy pages. Anything in [square brackets] is still to be filled in: it shows
// highlighted on the page until it is replaced. Fill these in before launch.
export const BUSINESS = {
  legalName: '[Registered business name]',
  address: '[Registered address]',
  gstin: '[GSTIN]',
  grievanceOfficer: '[Name]',
  grievanceOfficerRole: '[Designation]',
  websiteHost: '[Website host]', // the company that hosts the site, e.g. the one in "Build and deploy" (README)
};

// The date the current versions of the policies take effect (for example "15 October 2026").
export const POLICIES_UPDATED = '[Date]';

// The contact block at the end of every policy. {email} and {whatsapp} become links on the page.
export const CONTACT_DETAILS = [
  { label: 'Business', value: BUSINESS.legalName },
  { label: 'Address', value: BUSINESS.address },
  { label: 'GSTIN', value: BUSINESS.gstin },
  { label: 'Email', value: '{email}' },
  { label: 'WhatsApp', value: '{whatsapp}' },
  { label: 'Grievance Officer', value: `${BUSINESS.grievanceOfficer}, ${BUSINESS.grievanceOfficerRole}` },
];

export const GRIEVANCE_PROMISE =
  'We acknowledge every complaint within 48 hours and resolve it within one month, usually much sooner.';
