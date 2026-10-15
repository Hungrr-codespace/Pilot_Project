// Restaurants and riders applying to Hungrr (see "partners" in google-sheet/Code.gs, which checks everything again):
// tidying and checking the numbers they type, and showing them neatly. Pure functions; tested in partners.test.js.
//   Restaurant: restaurant name, its address (where riders pick up), GST number (GSTIN) or "not registered for
//   GST", FSSAI number (14 digits)
//   Rider: date of birth (18 or older), vehicle number, driving licence number

export const PARTNER_ROLES = ['restaurant', 'rider'];
export const RIDER_MIN_AGE = 18;

// What each kind of account is called, in the sign-in and on the admin page
export const ROLE_TEXT = {
  customer: { title: 'Customer', line: 'I want to order food', icon: 'cutlery' },
  restaurant: { title: 'Restaurant partner', line: 'I run a restaurant or kitchen', icon: 'cloche' },
  rider: { title: 'Rider', line: 'I deliver orders for Hungrr', icon: 'moped' },
};

const alnum = (v) =>
  String(v ?? '')
    .toUpperCase()
    .replace(/[^0-9A-Z]/g, '');

export const cleanGstin = (v) => alnum(v).slice(0, 15);
export const cleanFssai = (v) =>
  String(v ?? '')
    .replace(/\D/g, '')
    .slice(0, 14);
export const cleanVehicle = (v) => alnum(v).slice(0, 11);
export const cleanLicence = (v) => alnum(v).slice(0, 15);

// GSTIN: state code (2 digits), PAN (5 letters, 4 digits, 1 letter), registration count, Z, check character
// (Luhn mod 36 over the first 14 characters).
const GST_CHARS = '0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ';

export function gstinCheckChar(first14) {
  let sum = 0;
  for (let i = 0; i < 14; i++) {
    const p = GST_CHARS.indexOf(first14.charAt(i)) * (i % 2 ? 2 : 1);
    sum += Math.floor(p / 36) + (p % 36);
  }
  return GST_CHARS.charAt((36 - (sum % 36)) % 36);
}

export function gstinProblem(input) {
  const g = cleanGstin(input);
  if (g.length !== 15) return 'A GST number has 15 characters, e.g. 10ABCDE1234F1Z5.';
  if (!/^\d{2}[A-Z]{5}\d{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/.test(g))
    return 'Check the GST number: 2 digits, then your PAN, then a digit or letter, Z and one more character.';
  const state = Number(g.slice(0, 2));
  if (!((state >= 1 && state <= 38) || state === 97 || state === 99))
    return 'The first two digits are not a state code. Check the GST number.';
  if (gstinCheckChar(g) !== g.charAt(14))
    return "This GST number doesn't add up (its last character is a check). Look for a typing mistake.";
  return '';
}

export function fssaiProblem(input) {
  return /^\d{14}$/.test(cleanFssai(input)) ? '' : 'An FSSAI licence or registration number has 14 digits.';
}

// Driving licence: state (2 letters), RTO (2 digits), year of issue, 7 digits: BR01 20190012345
export function licenceProblem(input, now = new Date()) {
  const m = /^[A-Z]{2}\d{2}((?:19|20)\d{2})\d{7}$/.exec(cleanLicence(input));
  if (!m) return 'Enter it as on the licence: state, RTO, year and number, e.g. BR01 20190012345.';
  if (Number(m[1]) > now.getFullYear()) return 'The year in the licence number is in the future. Check it.';
  return '';
}

// Vehicle: BR 01 AB 1234, or the Bharat series 22 BH 1234 AB
export function vehicleProblem(input) {
  const v = cleanVehicle(input);
  if (/^[A-Z]{2}\d{1,2}[A-Z]{0,3}\d{1,4}$/.test(v) || /^\d{2}BH\d{4}[A-Z]{1,2}$/.test(v)) return '';
  return 'Enter it as on the number plate, e.g. BR 01 AB 1234.';
}

// Whole years from a yyyy-mm-dd birth date to `today` (yyyy-mm-dd, Indian date), or null if the date isn't real.
export function ageOn(dob, today) {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dob ?? ''));
  if (!m) return null;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  if (d.getUTCMonth() !== +m[2] - 1 || d.getUTCDate() !== +m[3]) return null;
  const [y, mo, da] = today.split('-').map(Number);
  let age = y - +m[1];
  if (mo < +m[2] || (mo === +m[2] && da < +m[3])) age--;
  return age < 0 ? null : age;
}

export const indianToday = (now = new Date()) =>
  new Date(now.getTime() + 330 * 60000).toISOString().slice(0, 10);

export function birthProblem(dob, today = indianToday()) {
  if (!dob) return 'Enter your date of birth.';
  const age = ageOn(dob, today);
  if (age === null || age > 80) return 'Check your date of birth.';
  if (age < RIDER_MIN_AGE) return `Riders must be ${RIDER_MIN_AGE} or older.`;
  return '';
}

// "BR0120190012345" → "BR01 20190012345"
export function formatLicence(v) {
  const c = cleanLicence(v);
  return c.length === 15 ? `${c.slice(0, 4)} ${c.slice(4)}` : c;
}

// "BR01AB1234" → "BR 01 AB 1234", "22BH1234AB" → "22 BH 1234 AB"
export function formatVehicle(v) {
  const c = cleanVehicle(v);
  const bh = /^(\d{2})(BH)(\d{4})([A-Z]{1,2})$/.exec(c);
  if (bh) return bh.slice(1).join(' ');
  const m = /^([A-Z]{2})(\d{1,2})([A-Z]{0,3})(\d{1,4})$/.exec(c);
  return m ? m.slice(1).filter(Boolean).join(' ') : c;
}

// "10425001000123" → "1042500 1000123": two halves, easier to read out and compare
export function formatFssai(v) {
  const c = cleanFssai(v);
  return c.length === 14 ? `${c.slice(0, 7)} ${c.slice(7)}` : c;
}

// The application form → { values, errors }. Field names match the sheet's Partners tab.
export function validateApplication(role, form, today = indianToday()) {
  const errors = {};
  if (role === 'restaurant') {
    const values = {
      restaurant_name: String(form.restaurant_name ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 40),
      restaurant_address: String(form.restaurant_address ?? '')
        .replace(/\s+/g, ' ')
        .trim()
        .slice(0, 160),
      no_gst: Boolean(form.no_gst),
      gstin: form.no_gst ? '' : cleanGstin(form.gstin),
      fssai: cleanFssai(form.fssai),
    };
    if (values.restaurant_name.length < 2) errors.restaurant_name = 'Enter the restaurant’s name.';
    if (values.restaurant_address.length < 5)
      errors.restaurant_address = 'Enter the address riders come to: shop, street and area.';
    if (!values.no_gst) {
      const p = gstinProblem(values.gstin);
      if (p) errors.gstin = p;
    }
    const f = fssaiProblem(values.fssai);
    if (f) errors.fssai = f;
    return { values, errors };
  }
  const values = {
    dob: String(form.dob ?? ''),
    vehicle_no: cleanVehicle(form.vehicle_no),
    dl_no: cleanLicence(form.dl_no),
  };
  const b = birthProblem(values.dob, today);
  if (b) errors.dob = b;
  const v = vehicleProblem(values.vehicle_no);
  if (v) errors.vehicle_no = v;
  const l = licenceProblem(values.dl_no);
  if (l) errors.dl_no = l;
  return { values, errors };
}

// The script's error codes → the field they belong to and what to say
export const APPLY_PROBLEMS = {
  bad_restaurant: ['restaurant_name', 'Enter the restaurant’s name.'],
  bad_address: ['restaurant_address', 'Enter the address riders come to: shop, street and area.'],
  bad_gstin: ['gstin', "This GST number doesn't look right. Check it, or tick “not registered for GST”."],
  bad_fssai: ['fssai', 'An FSSAI licence or registration number has 14 digits.'],
  bad_dob: ['dob', 'Check your date of birth.'],
  too_young: ['dob', `Riders must be ${RIDER_MIN_AGE} or older.`],
  bad_vehicle: ['vehicle_no', 'Enter the vehicle number as on the number plate.'],
  bad_dl: ['dl_no', 'Enter the driving licence number as on the licence.'],
};

// Where to check the numbers by hand (each needs a captcha, so the website can't check them itself)
export const OFFICIAL_CHECKS = {
  gstin: {
    label: 'GST portal',
    url: 'https://www.gst.gov.in/',
    how: 'Search Taxpayer → Search by GSTIN/UIN',
  },
  fssai: { label: 'FSSAI FoSCoS', url: 'https://foscos.fssai.gov.in/', how: 'FBO Search' },
  dl_no: {
    label: 'Parivahan',
    url: 'https://parivahan.gov.in/',
    how: 'Online Services → Driving Licence Related Services',
  },
  vehicle_no: { label: 'Parivahan', url: 'https://parivahan.gov.in/', how: 'Know Your Vehicle Details' },
};
