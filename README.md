# Hungrr website

The Hungrr landing page and ordering flow, built with React 18 and Vite.

- Laptops and desktops (1024 px wide and up) get the desktop design, with sections set apart by panels and a
  road between them, and headings and cards that fade up as you scroll.
- Phones and tablets get the mobile design: the flat quick-picks table with 4 dishes, and sections that morph
  into each other while scrolling.
- Restaurants, dishes, quick picks and settings come from a Google Sheet, and every paid order is written back
  to it. Set this up once: see [Connect the Google Sheet](#connect-the-google-sheet).

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

## Connect the Google Sheet

Full steps are in [google-sheet/SETUP.md](google-sheet/SETUP.md). In short:

1. Open `Hungrr-website-data.xlsx` from Drive and do **File → Save as Google Sheets**. Work only in the new
   Google Sheet (no **.XLSX** label next to its name). Keep the tab names and the first row of every tab.
2. In the sheet: **Extensions → Apps Script**. Replace the sample code with all of `google-sheet/Code.gs` and
   save. Open Apps Script from inside the sheet: that is how the script knows which sheet to use.
3. **Deploy → New deployment → Web app**, with *Execute as: Me* and *Who has access: Anyone*. Allow the
   permissions Google asks for (**Advanced → Go to Hungrr website (unsafe) → Allow**).
4. Copy the **Web app URL** (it ends in `/exec`). Check it by opening it with `?action=menu` at the end: you
   should see your tabs as text.
5. Copy `.env.example` to `.env` and paste the URL after `VITE_SHEET_API_URL=`. Restart `npm run dev`.

Without the URL the site still works with its built-in sample menu, but orders are not saved.

### If something goes wrong

| Problem | Fix |
| --- | --- |
| **Extensions → Apps Script** says "Sorry, unable to open the file at present" | The browser is signed in to more than one Google account. Open a private (Incognito) window, sign in with only the account that owns the sheet, and try again. |
| **Extensions → Apps Script** is missing or greyed out | The file is still the Excel version (**.XLSX** label next to its name). Do **File → Save as Google Sheets** and use the new copy. |
| Apps Script is blocked on a college or work account | The admin has turned it off. **File → Make a copy** into a personal Gmail account and set it up there. |
| Need the `/exec` URL again | In Apps Script: **Deploy → Manage deployments**, click the active deployment, copy the **Web app** URL. Do not use **Test deployments** (that link ends in `/dev` and only works for you). |
| Changed `Code.gs` | **Deploy → Manage deployments →** pencil icon **→ Version: New version → Deploy**. The URL stays the same. A **New deployment** would create a different URL. |
| Menu changes don't show | The script keeps a copy for about a minute. Wait, then reload. |
| Orders don't reach the sheet | Check `VITE_SHEET_API_URL` is set, then restart `npm run dev` (locally) or redeploy (online). |

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
│   └── layout/              PageCanvas, Section, Navbar, RouteDivider (desktop road between sections)
├── context/                 App-wide state
│   ├── LayoutProvider.jsx   Which design is showing (desktop/mobile) and its scale
│   ├── MenuProvider.jsx     The menu from the Google Sheet (cached, with a built-in fallback)
│   ├── OrderProvider.jsx    Ordering state and actions (cart, menu book, notepad, payment)
│   └── orderReducer.js      All ordering state changes, as a pure reducer
├── hooks/                   useViewportWidth, useScrollMorph (mobile), useReveal and useScrollProgress
│                            (desktop scroll effects), useWhatsAppContact
├── lib/                     Pure functions, no React: pricing, search, menu data, UPI link, WhatsApp
│                            message, QR code, order photo, file download, formatting (+ their tests)
├── services/
│   └── sheetApi.js          Talks to the Google Sheet: load the menu, submit orders
├── config/site.js           Brand, contact email, links, layout sizes, image paths
├── content/                 Page copy: how-it-works steps, benefits, FAQ
├── data/menu-fallback.json  Built-in menu, used until the sheet answers or if it cannot be reached
└── styles/                  tokens.css (colours, fonts, motion, section colours), global.css (base styles
                             and the fade-up effect), motion.module.css
```

The ordering feature in `sections/Restaurants/`:

```
Restaurants.jsx              Section: header, table, menu book, notepad; zooms in while paying
QuickPicks/                  The wooden table: QuickPicksTable, TablePlate, useTableDrag, tableGeometry
MenuBook/                    MenuBook (desktop spread / mobile pages), BookCover, BookPage, BookLeaf,
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
  `@media (max-width: 1023.98px) { … }`. Additions that exist only on desktop (the section panels, the
  fade-up effect) sit in `@media (min-width: 1024px) { … }` instead.
- **Markup** is shared wherever the two designs have the same structure. Where they differ (the navbar, the
  table, the menu book, the FAQ), components read `useLayout().isMobile` and render the right variant.
- The breakpoint lives in `src/config/site.js` (`LAYOUT.breakpoint`) and in the media queries; change both
  together.

## Scroll effects

**Mobile:** sections morph into each other while scrolling (`useScrollMorph`, on every element marked
`data-morph`, which `Section` adds).

**Desktop:** three effects keep the sections apart.

- **Panels.** How it works sits on a black panel and Why Hungrr on a white one (the `@media (min-width: 1024px)`
  block at the end of `HowItWorks.module.css` and `WhyHungrr.module.css`). Restaurants and FAQ stay on the
  doodle background, so the page alternates panel and open space.
- **Road dividers.** `<RouteDivider />` in `HomePage.jsx` puts a short road between sections. The moped rides
  along it as the page scrolls (`useScrollProgress` writes the position to a `--progress` CSS variable).
- **Fade up.** Any element with `data-reveal=""` fades up the first time it scrolls into view (`useReveal`;
  styles at the end of `global.css`). Add `style={{ '--reveal-delay': '150ms' }}` to make it wait. Don't put
  `data-reveal` on an element that already has its own `transform` or `transition`.

On a dark panel, text colours come from the section colour slots in `tokens.css` (`--section-title`,
`--section-text`, `--section-muted`, `--section-highlight`): the panel sets them, and `SectionHeader` and
`OrderSteps` use them. Nothing moves for visitors who have turned on reduced motion on their device.

## Conventions

- **One component per file**, named like the file (`OrderBar.jsx` exports `OrderBar`), with its styles next to
  it in `OrderBar.module.css`. Small parts that only make sense together share their parent's file (for
  example `NoteSheet` with `NoteHeading` and `NoteActions`). Section-specific components stay in their section
  folder; anything used by more than one section moves to `src/components/`.
- **CSS Modules** for all component styles; colours, fonts and easings come from the tokens in
  `styles/tokens.css`. Inline styles are only for values computed at run time (angles, the page scale).
- **State**: ordering state changes only through `orderReducer` actions (`useOrder().actions`); components
  never change it directly. Pure logic (prices, search, messages) lives in `src/lib` and has unit tests.
- **Imports** use the `@/` alias for `src/` (`import { Icon } from '@/components/ui/Icon/Icon'`).
- **Names**: menu data uses full words (`restaurant.categories`, `restaurant.clusterId`, `dish.isVeg`,
  `dish.description`); see the shape at the top of `src/lib/menuData.js`.
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
| Environment variable | `VITE_SHEET_API_URL` = your Apps Script web app URL (ends in `/exec`) |

The URL is built into the site when it is built, so after adding or changing it, redeploy.

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