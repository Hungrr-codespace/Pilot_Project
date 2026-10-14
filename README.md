# Hungrr website

The Hungrr website, built with React 18, React Router and Vite. It has these pages:

- **Main page (`/`)**: what Hungrr is and what it strives to do, the pilot at BIT Mesra (timings, delivery
  area, payment and how ordering works), why Hungrr, pilot reviews, and the FAQ. "Order now" and "Open the
  pilot menu" lead to the pilot page, and "Track order" (next to it) to the tracking page. "Sign in" sits at
  the top right (the customer's name once signed in).
- **Pilot page (`/pilot`)**: the menu (the quick-picks table and the menu book), the order notepad, and the
  checkout: delivery details, UPI QR, and payment confirmation with the 12-digit UPI reference number. It says
  whether ordering is open, closed or paused, and has a "Track your order" button under the menu. Arriving
  signed out, the sign-in opens first ("Just look at the menu" closes it); ordering needs an account.
- **Khata (`/account`)**: the signed-in customer's page: their name (which they can change), phone number, a
  stamp card towards the automatic offer, and every order they have placed, each opening to its dishes and
  charges with "Order again", "Track order" and "Rate this order". Older orders can be added with the order ID
  on the bill. Team members also see links to their pages here.
- **Tracking page (`/track`)**: the order ID and phone number show the order's status from the sheet (no account
  needed), with the orders paid for on this phone listed for one-tap tracking. While the order is out for
  delivery, it shows the rider's first name and a live map.
- **Feedback page (`/feedback`)**: customers rate a paid order with its order ID and phone number: stars,
  tags, a few words, a private suggestion for the team, and whether to show the review on the website (with a
  live preview of the card). The tracking page links here once an order is delivered.
- **Team pages**, for phone numbers listed in the sheet's **Staff** tab (signed in with their Hungrr account):
  - **Admin (`/admin`)**: the live order board, offers and coupons, review approvals, the menu (laid out like the
    menu book, with a switch on every restaurant and dish) and the site notice, customer look-up (PIN reset), and
    the day's numbers.
  - **Rider (`/rider`)**: live location sharing and the rider's delivery slips (Picked up, Delivered).
  - **Restaurant (`/partner`)**: the kitchen's tickets for today's paid orders with its dishes (Start preparing,
    Ready for pickup).
- **Policy pages**: Privacy Policy (`/privacy-policy`), Terms & Conditions (`/terms`) and Refund & Cancellation
  Policy (`/refund-policy`), linked from both footers. Each has an "In short" summary, numbered sections and a
  contents list. Their text is in `src/content/legal/`.

All pages:

- Every page fills the screen's width, edge to edge.
- Laptops and desktops (1024 px wide and up) get the desktop design: sections set apart by panels, and
  headings, cards and steps that animate in as they scroll into view and out as they leave.
- Phones and tablets get the mobile design: the flat quick-picks table with 4 dishes, sections that morph into
  each other while scrolling, and the same in-and-out animations.
- Restaurants, dishes, quick picks and settings (including opening hours and a pause switch) come from a Google
  Sheet, and every order (with the customer's details and UPI reference number) is written back to it. The team
  gets an email or Telegram alert when a payment needs checking. Set this up once: see
  [Connect the Google Sheet](#connect-the-google-sheet).
- An optional one-line notice at the top (Settings → `site_banner`), and on phones a card to add Hungrr to the
  home screen like an app.

How each of the newer features works, and what to check when one goes wrong, is in
[docs/FEATURES.md](docs/FEATURES.md).

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
   save. Open Apps Script from inside the sheet: that is how the script knows which sheet to use. Then choose
   **setup** in the toolbar's function list and click **Run** (it adds the tabs and columns the sheet is
   missing and sends you a test email).
3. **Deploy → New deployment → Web app**, with *Execute as: Me* and *Who has access: Anyone*. Allow the
   permissions Google asks for (**Advanced → Go to Hungrr website (unsafe) → Allow**).
4. Copy the **Web app URL** (it ends in `/exec`). Check it by opening it with `?action=menu` at the end: you
   should see your tabs as text.
5. Copy `.env.example` to `.env` and paste the URL after `VITE_SHEET_API_URL=`. Restart `npm run dev`.
6. Open an account on the website with your phone number, then add that number to the **Staff** tab with
   `role` = `admin`. `/admin` now opens for you.

Without the URL the site still works with its built-in sample menu, but orders are not saved.

**Already connected the sheet with an earlier version?** Paste the new `google-sheet/Code.gs` into Apps Script and
save, run **setup** once (choose it in the toolbar, click **Run**, allow the new permissions), then **Deploy →
Manage deployments →** pencil icon **→ Version: New version → Deploy**. The URL stays the same. `setup` adds
what the sheet is missing: the Users, Staff, Coupons and Offers tabs, `site_banner` in Settings, and the new
Orders and OrderItems columns. Then add your number to Staff as `admin` (step 6 above). Everything is explained in
[SETUP.md](google-sheet/SETUP.md).

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
| `/admin` says "This page is for the Hungrr team" | Your number isn't in Staff with `role` = `admin` (or `active` is FALSE), or the script wasn't redeployed. Reload the page after fixing it. |
| Anything else | [docs/FEATURES.md](docs/FEATURES.md) has a "Problems" list for each feature, and how to watch what the script answers. |

## Project structure

```
src/
├── main.jsx                 Entry point: global styles + <App />
├── App.jsx                  Router (the pages) inside the providers (layout → menu → status → account → order)
├── pages/
│   ├── HomePage.jsx         The main page: its sections in order
│   ├── PilotPage/           The pilot page: PilotHeader (title, open/closed pill, offer pill), ShopNotice
│   │                        (closed or paused), ReorderNotice (after Order again), the ordering area, PageFooter
│   ├── TrackPage/           Order tracking: TrackForm (order ID + phone), RecentOrders, TrackResult (the
│   │                        steps, the rider's map, and "Rate your order" once delivered), useOrderTracking
│   │                        (refreshes every minute, every 20 s while out for delivery)
│   ├── FeedbackPage/        Rate an order: FeedbackForm (four steps), the live card preview, the thank-you
│   ├── AccountPage/         The khata: RegularCard (name, phone, stamp card, team links, sign out),
│   │                        KhataLedger (the orders, Order again, the total paid, adding an earlier order),
│   │                        useKhata (loads the orders and the offer progress)
│   ├── AdminPage/           The admin page: AdminPage (tabs), OrdersBoard, OffersPanel, ReviewsQueue,
│   │                        MenuSwitches (the menu book: MenuService, MenuIndex, MenuPage), CustomersPanel,
│   │                        NumbersPanel; admin.module.css (shared styles)
│   ├── RiderPage/           The rider page: delivery slips, useLocationSharing (GPS every 20 s, screen awake)
│   ├── PartnerPage/         The restaurant (kitchen) page: tickets by New, Preparing, Ready, Picked up
│   └── LegalPage/           The policy pages: LegalHeader (title, policy tabs, date), LegalContents
│                            (contents list), LegalDocument (the text), LegalText (links and placeholders)
├── sections/                One folder per main-page section, each with its own components and styles
│   ├── Hero/                Headline, app screenshots (PhoneMockup), feature chips
│   ├── About/               What Hungrr is: mission card and three pillars
│   ├── Pilot/               The pilot at BIT Mesra: PilotPass (timings with open/closed status, delivery
│   │                        area, payment, "Open the pilot menu" and "Track order") and OrderSteps
│   ├── WhyHungrr/           BenefitRoad (the six benefits along a road)
│   ├── Reviews/             ReviewSummary (average, star bars, most-loved tags, "Rate your order") and
│   │                        ReviewCarousel (approved reviews in a sideways-scrolling row)
│   ├── Faq/                 FaqMenu (shared card), FaqBoard (desktop), FaqAccordion (mobile)
│   └── Footer/              FooterRoad, Receipt (site map styled as a bill)
├── features/
│   ├── account/             SignInDialog (phone → PIN, or name and a new PIN; locked; welcome stamp),
│   │                        PinInput (six boxes), AccountButton (Sign in / the customer's name, top right)
│   ├── ordering/            Everything for ordering on the pilot page (see below)
│   ├── reviews/             ReviewCard, StarRating (shows stars), StarInput (picks stars), TagPicker,
│   │                        useReviews (loads the summary and reviews once per visit)
│   ├── staff/               StaffPage (frame of the team pages, "for the team" message), useStaff (calls,
│   │                        polling every 20 s, loading)
│   ├── tracking/            RiderOnMap (loads the map only when needed) and RiderMap (Leaflet, OpenStreetMap)
│   └── install/             InstallPrompt (the "add to home screen" card on phones)
├── components/              Reusable building blocks used in several places
│   ├── ui/                  Icon, VegMark, Wordmark, SectionHeader, ExternalLink, Dialog, TextField,
│   │                        ShopStatusPill (Open now / Closed / Orders paused), Spinner (loading ring),
│   │                        Switch (on/off toggle of the team pages)
│   └── layout/              PageCanvas, Section, Navbar, PageNav and PageFooter (top bar and footer of the
│                            pilot and policy pages), PageHeader (yellow header of the tracking and feedback
│                            pages), SiteBanner (the notice at the top), ScrollManager (top of the page, or the
│                            linked section, after moving pages)
├── context/                 App-wide state
│   ├── LayoutProvider.jsx   Which design is showing (desktop/mobile) and its scale
│   ├── MenuProvider.jsx     The menu from the Google Sheet (cached, with a built-in fallback)
│   ├── ShopStatusProvider.jsx  Open, closed or paused: the sheet's hours and pause switch, in Indian time
│   ├── AccountProvider.jsx  Who is signed in on this device, and the sign-in dialog (openSignIn)
│   ├── OrderProvider.jsx    Ordering actions: cart, menu book, notepad, checkout, offers and coupons, order
│   │                        again, payment, bill
│   └── orderReducer.js      All ordering state changes, as a pure reducer (+ the current order step)
├── hooks/                   useViewportWidth, useScrollMorph (mobile), useReveal (scroll animations),
│                            useActiveSection (policy contents), useWhatsAppContact, useDocumentTitle
├── lib/                     Pure functions, no React: pricing, search, menu data, checkout (details and UPI
│                            reference checks), UPI link, WhatsApp message, QR code, bill image, file
│                            download, formatting, policy text, opening hours, tracking, reviews, accounts,
│                            deals (offer and coupon sums), staff (order board, codes, messages) (+ their tests)
├── services/
│   ├── sheetApi.js          Talks to the Google Sheet: load the menu, check the hours and pause switch, save
│                            orders and payments, track an order, load and send reviews
│   ├── accountApi.js        Accounts: sign up, sign in, the khata, change the name, add an earlier order,
│   │                        check offers and coupons
│   └── staffApi.js          The team pages: one call (area, op) with the sign-in
├── config/site.js           Brand, page addresses (ROUTES), contact email, links, layout sizes, image paths
├── content/                 Page copy: about, ordering steps (howItWorks.js), benefits, FAQ, and the
│                            policies in legal/ (business.js holds the business details they show)
├── data/menu-fallback.json  Built-in menu, used until the sheet answers or if it cannot be reached
└── styles/                  tokens.css (colours, fonts, motion, section colours), global.css (base styles
                             and the scroll animations), buttons.css (hover and press colours), motion.module.css

public/
├── manifest.webmanifest     The app's name, colours and icons for "add to home screen"
├── icons/                   App icons (192, 512, maskable, Apple)
└── sw.js                    Service worker: pages from the network (last copy kept for offline), built files
                             kept after first use, nothing else stored
google-sheet/                Code.gs (the Apps Script), SETUP.md, the starting sheet (.xlsx)
tools/sheet-mock/            Runs Code.gs in Node against a pretend sheet, with test suites (see its README)
docs/FEATURES.md             How each feature works, for debugging
```

The ordering feature in `features/ordering/`:

```
OrderingArea.jsx             The order steps, table, menu book, notepad, checkout dialogs and bill; zooms in
                             while paying
OrderProgress.jsx            The five order steps: a rail beside the menu (desktop) or a bar on top of it
QuickPicks/                  The wooden table: QuickPicksTable, TablePlate, useTableDrag, tableGeometry
MenuBook/                    MenuBook (desktop spread / mobile pages), BookCover, BookPage, BookLeaf,
                             IntroPage, RestaurantIndex, RestaurantDetails, DishMenu
OrderNotepad/                OrderNotepad, OrderSheet (cart), PaymentSheet (UPI QR), OrderSlip (the bill),
                             OrderSentCard, NoteSheet, NoteButtons, OrderCharges
Checkout/                    DetailsDialog (who is ordering, address, DealBox), DealBox (the offer, the
                             coupon field and "Coupons for you"), PaymentDialog (12-digit UPI reference)
components/                  Parts shared by the pages: RestaurantRow, ClusterGroup, DishRow, CategoryTabs,
                             SearchField, DishTypeFilter, OrderBar, ClusterMap, ClusterMates, EmptyState…
hooks/useMenuBook.js         What the book shows (filters, groups, open restaurant), derived from state
ClusterGuide.jsx             "How clusters work" card under the menu (mobile; on desktop the same
                             explanation is the menu book's left page, IntroPage, next to the restaurant list)
```

## How the responsive layout works

The approved designs are drawn on two canvases: **1440 px** wide for desktop and **390 px** for mobile.
`PageCanvas` scales the canvas to the full width of the screen (without the scrollbar), so every page fills the
screen edge to edge and every size keeps the exact proportions of the design: a 1920 px monitor shows the desktop
design at 1.33×, a 1280 px laptop at 0.89×, and an 820 px tablet shows the mobile design at 2.1×.

- **Styles** are written for the desktop canvas. Mobile overrides sit at the end of each CSS module in
  `@media (max-width: 1023.98px) { … }`. Additions that exist only on desktop (the section panels, the
  play-once road) sit in `@media (min-width: 1024px) { … }` instead.
- **Markup** is shared wherever the two designs have the same structure. Where they differ (the navbar, the
  table, the menu book, the FAQ), components read `useLayout().isMobile` and render the right variant.
- The breakpoint lives in `src/config/site.js` (`LAYOUT.breakpoint`) and in the media queries; change both
  together.

## Scroll effects

**Both designs: in and out.** Any element with `data-reveal` animates in when it scrolls into view and out
again when it leaves, from whichever side it left (`useReveal`; styles at the end of `global.css`). Scrolling
back brings it in again. `data-reveal=""` rises into place (40 px on desktop, 24 px on mobile),
`data-reveal="pop"` grows in (round markers), and `data-reveal="draw"` leaves the animation to the element's
own styles. Add `style={{ '--reveal-delay': '150ms' }}` to make it wait, so a group appears one after another.
Don't put `data-reveal` on an element that already has its own `transform` or `transition`.

**Why Hungrr road.** The road is a group (`data-reveal-group` in `BenefitRoad.jsx`), so its stops and cards
follow the road instead of animating on their own. The road shows through a mask line (`.drawLine` in
`BenefitRoad.module.css`), so the road and its centre line draw together.

- Desktop (`data-reveal-group="once"`): the first time the road is well into view it draws itself from left to
  right, and each stop, connector and card appears as the road reaches it (`--reveal-delay`, timed to the road).
  Then it stays: scrolling away and back does not replay it.
- Mobile (`data-reveal-group="scroll"`): the vertical road is drawn down to a line about three quarters of the
  way down the screen, so it grows as you scroll. Each stop and card appears when the road reaches it, and goes
  again when you scroll back up (`useReveal` sets `--reveal-progress` on the road).

**Mobile:** sections also morph into each other while scrolling (`useScrollMorph`, on every element marked
`data-morph`, which `Section` adds).

**Desktop panels.** About sits on a black panel and Why Hungrr on a white one (the `@media (min-width: 1024px)`
block at the end of `About.module.css` and `WhyHungrr.module.css`). Pilot and FAQ stay on the doodle background,
so the page alternates panel and open space. On a dark panel, text colours come from the section colour slots in
`tokens.css` (`--section-title`, `--section-text`, `--section-muted`, `--section-highlight`): the panel sets
them, and `SectionHeader` and `OrderSteps` use them.

Nothing moves for visitors who have turned on reduced motion on their device.

## Conventions

- **One component per file**, named like the file (`OrderBar.jsx` exports `OrderBar`), with its styles next to
  it in `OrderBar.module.css`. Small parts that only make sense together share their parent's file (for
  example `NoteSheet` with `NoteHeading` and `NoteActions`). Section-specific components stay in their section
  folder; anything used by more than one section moves to `src/components/`.
- **CSS Modules** for all component styles; colours, fonts and easings come from the tokens in
  `styles/tokens.css`. Inline styles are only for values computed at run time (angles, the page scale).
- **Buttons** keep their shape and colours in their own CSS module and add one tone class for hover and press
  colours (`btn-yellow`, `btn-black`, `btn-light`, `btn-ghost`, `btn-soft`, `btn-row`, `btn-row-dark`; see
  `styles/buttons.css`). Hover colours only apply with a mouse; on phones the press colour shows on tap. Buttons
  that load something show the `Spinner` (for example `PrimaryButton busy`).
- **State**: ordering state changes only through `orderReducer` actions (`useOrder().actions`); components
  never change it directly. Pure logic (prices, search, messages) lives in `src/lib` and has unit tests.
- **Imports** use the `@/` alias for `src/` (`import { Icon } from '@/components/ui/Icon/Icon'`).
- **Names**: menu data uses full words (`restaurant.categories`, `restaurant.clusterId`, `dish.isVeg`,
  `dish.description`); see the shape at the top of `src/lib/menuData.js`.
- **Text**: page copy is in `src/content/`, site-wide details in `src/config/site.js`, menu data in the sheet.

## How an order works

Orders can be placed between `opens_at` and `closes_at` (Settings tab, Indian time) unless `orders_paused` is
ticked. Otherwise the pilot page shows why at the top and greys out **Confirm order**; the menu can still be
browsed. Pages that are already open check the sheet again every 2 minutes.

All on the pilot page. The five steps (`OrderProgress`) stay in view while scrolling: on desktop as a rail on
the left of the menu, which moves to a bar on top of the menu when it zooms in for paying; on mobile as a bar on
top of the menu. (They stick to the top of the screen with `position: sticky`, which is why `PageCanvas` uses
`overflow: clip` rather than `hidden`.)

1. **Pick dishes.** The customer turns the table or opens the menu and adds dishes from one or more
   restaurants.
2. **Review order.** The notepad shows the order with GST and one delivery charge per rider (one rider per
   cluster), and the offer's discount if this order gets one. Quantities can still be changed.
3. **Your details.** "Confirm order" asks a signed-out customer to sign in first. Then a dialog shows who is
   ordering (from the account, with "Not you?") and asks for the delivery address (remembered on the device for
   next time). A coupon code can be applied here; one offer per order, the one that saves more. The order gets
   its ID (for example `HG-261006-K7Q2`) and is saved in the sheet as
   **Awaiting payment**.
4. **Pay by UPI.** The QR has the exact amount, with the order ID in the payment note.
5. **Confirm payment.** "Confirm payment" asks for the 12-digit UPI reference number from the customer's UPI
   app. The order in the sheet gets the number and becomes **Payment to verify**. The bill (with the customer's
   details and the UPI reference number) is saved to the device, and the customer can download it again and
   send it to us on WhatsApp with the order filled in. The team gets an alert (email and/or Telegram) to check
   the payment.

After that, the customer follows the order on the tracking page ("Track order" on the bill, or "Track your
order" under the menu). It shows the status the team sets on the admin page or in the sheet: Payment to verify → Paid → Preparing →
Out for delivery → Delivered.

## How offers, the team pages and the app work

- **Offers and coupons:** one automatic offer (every Nth paid order, set on the admin page) and coupon codes
  (₹ off, % off with a cap, or free delivery; dates, minimum order and use limits). The same sums run on the
  website (`lib/deals.js`) and in the script, which checks again when it saves the order. A discount on the food
  comes off before GST.
- **Team pages:** every call carries the sign-in token; the script checks it and the Staff row for that role
  before answering. The website's copy of the roles only decides which links to show.
- **Live tracking:** the rider page sends the phone's position every 20 seconds while sharing is on; the script
  keeps it for 15 minutes and shows it only to the customer of the order that rider is carrying.
- **Add to home screen:** `manifest.webmanifest` and `sw.js` (registered in the built site only). To make every
  installed phone drop old files, change `CACHE` in `sw.js`.

Details, files and problems for each: [docs/FEATURES.md](docs/FEATURES.md).

## How accounts work

- **Signing in:** phone number first. A new number gets "Open your khata" (name and a 6-digit PIN, typed
  twice); a known one asks for its PIN. PINs that are too easy (123456, 111111) are refused. Five wrong PINs
  lock the account for 15 minutes.
- **On the sheet:** one row per phone number in the **Users** tab. The PIN is never stored: only an HMAC-SHA256
  of it with a random salt and a secret kept in the script's properties. A sign-in returns a token signed with
  the same secret, kept on the device for 60 days (`hungrr-account-v1`). Clearing a customer's `pin_hash` in
  the sheet resets their PIN and signs them out everywhere.
- **Orders:** sent with the token, so the sheet writes the account's number in the order's `account` column
  (and uses the account's phone number for the order). The khata lists the account's orders that were paid
  for, newest first, with their dishes and review. Orders placed before signing in join it with their order ID
  (only if the order's phone number is the account's).
- **What can change:** only the name. The phone number is the account's key; the team changes it by hand.
- Setting up and resetting PINs: see [google-sheet/SETUP.md](google-sheet/SETUP.md#accounts-the-customers-khata).

## How reviews work

- **Who can rate:** anyone with a paid order, using its order ID and the phone number it was placed with (the
  script checks both, and refuses orders still awaiting payment). One review per order; sending again updates
  it. Reviews land in the sheet's **Reviews** tab.
- **What is shown:** the main page's Reviews section shows a review only when the customer agreed to share it
  and the team has set `approved` to Yes. Changed words go back to waiting. The public list never includes
  phone numbers, order IDs or the private suggestions.
- **The rating:** the average, star bars and most-loved tags count every review, shown or not, so the score is
  not just the approved ones.
- **Low ratings:** 1 or 2 stars send the team an alert, to call the customer back.
- Setting up and approving: see [google-sheet/SETUP.md](google-sheet/SETUP.md#reviews).

## Build and deploy

`npm run build` writes a plain static site to `dist/`, so any static host works. On Cloudflare Pages, Netlify
or Vercel, connect the GitHub repository (or upload `dist/`) and use:

| Setting | Value |
| --- | --- |
| Build command | `npm run build` |
| Output directory | `dist` |
| Environment variable | `VITE_SHEET_API_URL` = your Apps Script web app URL (ends in `/exec`) |

The URL is built into the site when it is built, so after adding or changing it, redeploy.

The pilot and policy pages have their own addresses (`/pilot`, `/terms`…), so the host must send every address
to `index.html`. This is
already set up: Cloudflare Pages does it on its own, Netlify reads `netlify.toml`, and Vercel reads
`vercel.json`. (Don't add a `_redirects` file with `/* /index.html 200`: Cloudflare rejects that rule.)

### Hostinger

- **Business or Cloud plan (recommended):** Hostinger builds the site from GitHub. In hPanel: **Websites → Add
  website → Node.js Web App → Import Git repository**, pick this repository, check the build settings (build
  command `npm run build`, output directory `dist`), add the environment variable `VITE_SHEET_API_URL`, and
  **Deploy**. Every push to GitHub deploys again. Hostinger adds the page-address routing (`.htaccess`) itself.
- **Other plans:** build on your computer (`.env` with `VITE_SHEET_API_URL`, then `npm run build`), and upload
  everything inside `dist/` plus `hosting/hostinger/.htaccess` to `public_html` with the File Manager. Repeat
  for every update. Keep the `.htaccess`: it also makes sure phones always get the newest `sw.js` and manifest.
- Then connect the domain in hPanel, and turn on SSL and **Force HTTPS**. The Google Sheet needs no change.

Vercel's free Hobby plan is for non-commercial use, so for a business use a paid Vercel plan or another host.
Then add your domain (hungrr.in) in the host's domain settings, and add the DNS records it shows you at the
company where you bought the domain. HTTPS is set up automatically.

## Still to fill in before launch

- Real restaurants, dishes, prices, distances and cluster areas (in the Google Sheet). Prices for Palacia Cafe &
  Restaurant and Cafe Hideout are samples.
- Instagram and LinkedIn links (`SOCIAL_LINKS` in `src/config/site.js`).
- The policy pages: fill in the business details in `src/content/legal/business.js` (registered name and address,
  GSTIN, Grievance Officer, website host and the date the policies take effect). Until then they show highlighted
  in [square brackets]. Check the time limits in the refund policy (`refunds.js`: 2 hours to report a problem, a
  10-minute wait at the door, refunds within 2 working days) and the minimum age of 18 (`privacy.js`), and have a
  lawyer review all three before launch.
- The WhatsApp number and UPI ID come from the sheet's Settings tab; the email address is `CONTACT_EMAIL` in
  `src/config/site.js`.
- The About section's words (mission, pillars) are a first draft in `src/content/about.js`: edit them to say it
  your way.
- Your team in the sheet's **Staff** tab (admin, riders, restaurants with their `restaurant_id`), and the
  automatic offer and first coupons on the admin page.
