// Site-wide settings that are not in the Google Sheet. Contact details that change often (WhatsApp number,
// UPI ID) live in the sheet's Settings tab instead; see src/services/sheetApi.js.

export const BRAND = {
  name: 'Hungrr',
  tagline: 'Multiple restaurants, one delivery.',
};

export const CAMPUS = 'BIT Mesra, Patna';
export const CAMPUS_SHORT = 'BIT Patna'; // "Launching soon at BIT Patna", "1.2 km from BIT Patna"
export const ORDER_HOURS = '11:00 AM – 8:30 PM';
export const LAUNCH_YEAR = 2026;

export const CONTACT_EMAIL = 'connect@hungrr.in';
// Opens a new Gmail message to us (works on laptops without a mail app set up).
export const CONTACT_EMAIL_LINK = `https://mail.google.com/mail/?view=cm&fs=1&to=${CONTACT_EMAIL}`;

// Placeholder links: replace '#' with the real profile pages before launch.
export const SOCIAL_LINKS = [
  { id: 'instagram', label: 'Instagram', href: '#' },
  { id: 'linkedin', label: 'LinkedIn', href: '#' },
];

// Page sections, in order. Used by the navigation and the footer.
export const NAV_LINKS = [
  { href: '#how', label: 'How it works' },
  { href: '#restaurants', label: 'Restaurants' },
  { href: '#why', label: 'Why Hungrr' },
  { href: '#faq', label: 'FAQ' },
];

// Placeholder pages: create them before launch.
export const LEGAL_LINKS = [
  { href: '#privacy', label: 'Privacy Policy' },
  { href: '#terms', label: 'Terms & Conditions' },
  { href: '#refunds', label: 'Refund & Cancellation Policy' },
];

// The page is designed on a 1440 px desktop canvas and a 390 px mobile canvas, each scaled to the screen.
// Screens narrower than `breakpoint` (phones and tablets) get the mobile design.
// Keep `breakpoint` in sync with the `@media (max-width: 1023.98px)` rules in the CSS modules.
export const LAYOUT = {
  breakpoint: 1024,
  desktopWidth: 1440,
  mobileWidth: 390,
  maxMobileScale: 1.6, // tablets: the mobile design grows up to 1.6×, then stays centred
};

export const IMAGES = {
  wordmarkBlack: '/assets/wordmark-black.png',
  wordmarkWhite: '/assets/wordmark-white.png',
  appHome: '/assets/hero-home-2x.png',
  appCart: '/assets/hero-multicart-2x.png',
  itemsAddedCard: '/assets/hero-card-2x.png',
  tableWood: '/assets/table-ebony.jpg',
  doodle: '/assets/doodle-yellow-15.svg',
  upiQrFallback: '/assets/upi-qr.png',
};
