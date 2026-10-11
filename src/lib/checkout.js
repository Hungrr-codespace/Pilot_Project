// Checking what the customer types at checkout: delivery details before paying, and the UPI reference number
// after paying. Pure functions, used by the dialogs and tested in checkout.test.js.

export const EMPTY_CUSTOMER = { name: '', phone: '', address: '' };

const LIMITS = { name: 60, address: 200 };

// "+91 98765 43210", "098765 43210", "9876543210" → "9876543210". Anything else → "".
export function normalizePhone(input) {
  let digits = String(input || '').replace(/\D/g, '');
  if (digits.length === 12 && digits.startsWith('91')) digits = digits.slice(2);
  else if (digits.length === 11 && digits.startsWith('0')) digits = digits.slice(1);
  return /^[6-9]\d{9}$/.test(digits) ? digits : '';
}

// "9876543210" → "+91 98765 43210"
export function formatIndianPhone(digits) {
  return digits ? `+91 ${digits.slice(0, 5)} ${digits.slice(5)}` : '';
}

const tidy = (text, max) =>
  String(text || '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, max);

// The details form → { values, errors }. `values` is cleaned up (trimmed, phone as 10 digits);
// `errors` has a message for each field that needs fixing, and is empty when everything is fine.
export function validateDetails(form) {
  const values = {
    name: tidy(form.name, LIMITS.name),
    phone: normalizePhone(form.phone),
    address: tidy(form.address, LIMITS.address),
  };
  const errors = {};
  if (values.name.length < 2) errors.name = 'Please enter your name.';
  if (!values.phone) errors.phone = 'Enter a 10-digit mobile number.';
  if (values.address.length < 5) errors.address = 'Tell us where to deliver: hostel, room or landmark.';
  return { values, errors };
}

// UPI reference numbers (also called UTR) are 12 digits. Spaces and dashes are ignored.
export const UPI_REF_LENGTH = 12;

export function normalizeUpiRef(input) {
  return String(input || '')
    .replace(/\D/g, '')
    .slice(0, UPI_REF_LENGTH);
}

export function isValidUpiRef(ref) {
  return new RegExp(`^\\d{${UPI_REF_LENGTH}}$`).test(ref);
}

// "123456789012" → "1234 5678 9012", easier to read and compare.
export function formatUpiRef(ref) {
  return String(ref || '').replace(/(\d{4})(?=\d)/g, '$1 ');
}

// Details are remembered on this device, so the next order is quicker.
const STORAGE_KEY = 'hungrr-customer-v1';

export function loadSavedCustomer() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || 'null');
    return saved ? { ...EMPTY_CUSTOMER, ...saved } : EMPTY_CUSTOMER;
  } catch {
    return EMPTY_CUSTOMER; // storage blocked (private mode) or not a browser
  }
}

export function saveCustomer(customer) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(customer));
  } catch {
    /* storage can be blocked */
  }
}
