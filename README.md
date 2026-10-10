# Hungrr website

The Hungrr landing page and ordering flow, built with React 18 and Vite.

- Laptops and desktops (1024 px wide and up) get the desktop design.
- Phones and tablets get the mobile design: the flat quick-picks table with 4 dishes, and sections that morph
  into each other while scrolling.
- Restaurants, dishes, quick picks and settings come from a Google Sheet, and every paid order is written back
  to it. Set this up once with [google-sheet/SETUP.md](google-sheet/SETUP.md).

## Commands

Needs [Node.js](https://nodejs.org) 18 or newer.

```bash
npm install
npm run dev           # development server on http://localhost:5173
npm test              # unit tests (Vitest)
npm run lint          # ESLint
npm run format        # Prettier
npm run build         # production build in dist/
npm run preview       # serve dist/ locally
```

To use your Google Sheet, copy `.env.example` to `.env` and paste the Apps Script web app URL into it.

## Project structure

```
src/
├── main.jsx                 Entry point: global styles + <App />
├── App.jsx                  Providers (layout → menu → order) around the page
├── pages/
│   └── HomePage.jsx         The landing page: the six sections in order
├── sections/                One folder per page section, each with its own components and styles
│   ├── Hero/                Headline, app screenshots (PhoneMockup), feature chips
│   ├── HowItWorks/          OrderSteps, ChatPreview
│   ├── Restaurants/         The ordering feature (see below)
│   ├── WhyHungrr/           BenefitRoad (the six benefits along a road)
│   ├── Faq/                 FaqMenu (shared card), FaqBoard (desktop), FaqAccordion (mobile)
│   └── Footer/              FooterRoad, Receipt (site map styled as a bill)
├── components/              Reusable building blocks used by several sections
│   ├── ui/                  Icon, VegMark, Wordmark, SectionHeader, ExternalLink
│   └── layout/              PageCanvas, Section, Navbar
├── context/                 App-wide state
│   ├── LayoutProvider.jsx   Which design is showing (desktop/mobile) and its scale
│   ├── MenuProvider.jsx     The menu from the Google Sheet (cached, with a built-in fallback)
│   ├── OrderProvider.jsx    Ordering state and actions (cart, menu book, notepad, payment)
│   └── orderReducer.js      All ordering state changes, as a pure reducer
├── hooks/                   useViewportWidth, useScrollMorph, useWhatsAppContact
├── lib/                     Pure functions, no React: pricing, search, menu data, UPI link, WhatsApp
│                            message, QR code, order photo, file download, formatting (+ their tests)
├── services/
│   └── sheetApi.js          Talks to the Google Sheet: load the menu, submit orders
├── config/site.js           Brand, contact email, links, layout sizes, image paths
├── content/                 Page copy: how-it-works steps, benefits, FAQ
├── data/menu-fallback.json  Built-in menu, used until the sheet answers or if it cannot be reached
└── styles/                  tokens.css (colours, fonts, motion), global.css, motion.module.css
```

The ordering feature in `sections/Restaurants/`:

```
Restaurants.jsx              Section: header, table, menu book, notepad; zooms in while paying
QuickPicks/                  The wooden table: QuickPicksTable, TablePlate, useTableDrag, tableGeometry
MenuBook/                    MenuBook (desktop spread / mobile pages), BookCover, BookPage + BookLeaf,
                             IntroPage, RestaurantIndex, RestaurantDetails, DishMenu
OrderNotepad/                OrderNotepad, OrderSheet (cart), PaymentSheet (UPI QR), OrderSlip (order photo),
                             OrderSentCard, NoteSheet, NoteButtons, OrderCharges
components/                  Parts shared by the pages: RestaurantRow, ClusterGroup, DishRow, CategoryTabs,
                             SearchField, DishTypeFilter, OrderBar, ClusterMap, ClusterMates, EmptyState…
hooks/useMenuBook.js         What the book shows (filters, groups, open restaurant), derived from state
ClusterGuide.jsx             Mobile "How clusters work" card
```

## How the responsive layout works

The approved designs are drawn on two canvases: **1440 px** wide for desktop and **390 px** for mobile.
`PageCanvas` scales the canvas to the screen (laptops shrink it to fit, tablets grow the mobile design up to
1.6×), so every size keeps the exact proportions of the design.

- **Styles** are written for the desktop canvas. Mobile overrides sit at the end of each CSS module in
  `@media (max-width: 1023.98px) { … }`.
- **Markup** is shared wherever the two designs have the same structure. Where they differ (the navbar, the
  table, the menu book, the FAQ), components read `useLayout().isMobile` and render the right variant.
- The breakpoint lives in `src/config/site.js` (`LAYOUT.breakpoint`) and in the media queries; change both
  together.

## Conventions

- **One component per file**, named like the file (`OrderBar.jsx` exports `OrderBar`), with its styles next to
  it in `OrderBar.module.css`. Section-specific components stay in their section folder; anything used by more
  than one section moves to `src/components/`.
- **CSS Modules** for all component styles; colours, fonts and easings come from the tokens in
  `styles/tokens.css`. Inline styles are only for values computed at run time (angles, the page scale).
- **State**: ordering state changes only through `orderReducer` actions (`useOrder().actions`); components
  never change it directly. Pure logic (prices, search, messages) lives in `src/lib` and has unit tests.
- **Imports** use the `@/` alias for `src/` (`import { Icon } from '@/components/ui/Icon/Icon'`).
- **Text**: page copy is in `src/content/`, site-wide details in `src/config/site.js`, menu data in the sheet.

## How an order works

1. The customer turns the table or opens the menu, adds dishes from one or more restaurants, and reviews the
   order on the notepad. GST and one delivery charge per rider (one rider per cluster) are added.
2. **Confirm order** creates an order ID (for example `HG-261006-K7Q2`) and shows a UPI QR with the exact
   amount; the order ID is in the UPI note.
3. **Paid? Send it** saves the order photo to the customer's device, sends the order to the Google Sheet, and
   opens WhatsApp with the order and its ID filled in.

## Build and deploy

`npm run build` writes a plain static site to `dist/`, so any static host works. On Cloudflare Pages, Netlify
or Vercel, connect the GitHub repository (or upload `dist/`) and use:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `dist` |
| Environment variable | `VITE_SHEET_API_URL` = your Apps Script web app URL |

Vercel's free Hobby plan is for non-commercial use, so for a business use a paid Vercel plan or another host.
Then add your domain (hungrr.in) in the host's domain settings, and add the DNS records it shows you at the
company where you bought the domain. HTTPS is set up automatically.

## Still to fill in before launch

- Real restaurants, dishes, prices, distances and cluster areas (in the Google Sheet). Prices for Palacia Cafe &
  Restaurant and Cafe Hideout are samples.
- Instagram and LinkedIn links (`SOCIAL_LINKS` in `src/config/site.js`), and the Privacy Policy, Terms &
  Conditions and Refund & Cancellation pages the footer links to (`LEGAL_LINKS`).
- The WhatsApp number and UPI ID come from the sheet's Settings tab; the email address is `CONTACT_EMAIL` in
  `src/config/site.js`.
