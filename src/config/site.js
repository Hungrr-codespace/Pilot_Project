// Site-wide settings that are not in the Google Sheet. Contact details that change often (WhatsApp number,
// UPI ID) live in the sheet's Settings tab instead; see src/services/sheetApi.js.

export const BRAND = {
  name: 'Hungrr',
  tagline: 'Multiple restaurants, one delivery.',
};

export const CAMPUS = 'BIT Mesra, Patna';
export const CAMPUS_SHORT = 'BIT Patna'; // "Launching soon at BIT Patna", "1.2 km from BIT Patna"
export const LAUNCH_YEAR = 2026;

export const CONTACT_EMAIL = 'connect@hungrr.in';
// Opens a new Gmail message to us (works on laptops without a mail app set up).
export const CONTACT_EMAIL_LINK = `https://mail.google.com/mail/?view=cm&fs=1&to=${CONTACT_EMAIL}`;

// Placeholder links: replace '#' with the real profile pages before launch.
export const SOCIAL_LINKS = [
  { id: 'instagram', label: 'Instagram', href: '#' },
  { id: 'linkedin', label: 'LinkedIn', href: '#' },
];

// The pages of the site.
export const ROUTES = {
  home: '/', // what Hungrr is, how it works, the pilot, FAQ
  pilot: '/pilot', // the pilot menu: order, pay by UPI, confirm payment
  privacy: '/privacy-policy',
  terms: '/terms',
  refunds: '/refund-policy',
  track: '/track', // order tracking: order ID + phone number
  feedback: '/feedback', // rate an order (order ID + phone number)
  account: '/account', // the customer's khata: their orders, name and sign-out
  admin: '/admin', // the team's back office (Staff tab: role admin)
  rider: '/rider', // riders: jobs and live location (Staff tab: role rider)
  partner: '/partner', // restaurants: dishes to prepare (Staff tab: role restaurant)
};

// Sections of the main page, in order. Used by the navigation and the footer.
export const NAV_LINKS = [
  { href: '#about', label: 'About' },
  { href: '#pilot', label: 'Pilot' },
  { href: '#why', label: 'Why Hungrr' },
  { href: '#reviews', label: 'Reviews' },
  { href: '#faq', label: 'FAQ' },
];

// The policy pages (their text is in src/content/legal/).
export const LEGAL_LINKS = [
  { id: 'privacy', to: ROUTES.privacy, label: 'Privacy Policy', short: 'Privacy' },
  { id: 'terms', to: ROUTES.terms, label: 'Terms & Conditions', short: 'Terms' },
  { id: 'refunds', to: ROUTES.refunds, label: 'Refund & Cancellation Policy', short: 'Refunds' },
];

// The page is designed on a 1440 px desktop canvas and a 390 px mobile canvas, each scaled to the screen.
// Screens narrower than `breakpoint` (phones and tablets) get the mobile design.
// Keep `breakpoint` in sync with the `@media (max-width: 1023.98px)` rules in the CSS modules.
export const LAYOUT = {
  breakpoint: 1024,
  desktopWidth: 1440,
  mobileWidth: 390,
};

// The main page's app pictures come as WebP in a few widths, and the browser downloads the smallest one that is
// sharp on the screen (a phone shows the screenshots about 180 px wide, a laptop 340 px); `sizes` says how wide
// they show (the page is scaled to the screen, so a share of its width). The PNG is for browsers without WebP.
// Changing a picture: replace the PNG, then make the WebP widths from it (README → Images).
// appHome is also requested early by index.html on the main page: keep its list and sizes the same there.
const HERO_SIZES = '(max-width: 1023.98px) 46vw, 24vw';
const widths = (name, list) => list.map((w) => [`/assets/${name}-${w}.webp`, w]);

export const IMAGES = {
  wordmarkBlack: '/assets/wordmark-black.png',
  wordmarkWhite: '/assets/wordmark-white.png',
  appHome: {
    src: '/assets/hero-home-2x.png',
    webp: widths('hero-home', [360, 520, 680]),
    sizes: HERO_SIZES,
  },
  appCart: {
    src: '/assets/hero-multicart-2x.png',
    webp: widths('hero-multicart', [360, 520, 680]),
    sizes: HERO_SIZES,
  },
  itemsAddedCard: {
    src: '/assets/hero-card-2x.png',
    webp: widths('hero-card', [360, 636]),
    sizes: '(max-width: 1023.98px) 46vw, 22vw',
  },
  tableWood: '/assets/table-ebony.webp', // the original table-ebony.jpg is the fallback (QuickPicksTable.module.css)
  doodle: '/assets/doodle-yellow-15.svg',
  upiQrFallback: '/assets/upi-qr.png',
};
