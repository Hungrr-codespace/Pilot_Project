# Hungrr features: how each one works (for debugging)

One section per feature: what it does, who uses it, the files, the sheet tabs and columns it reads or writes,
the script actions (in `google-sheet/Code.gs`), how to try it, and what to check when it goes wrong.

Everything runs on the same Google Sheet and Apps Script web app. The website never stores orders, coupons or
staff anywhere else.

**Before anything else:** after pasting a new `Code.gs`, choose **setup** in the Apps Script toolbar and click
**Run**, then **Deploy → Manage deployments → New version**. Most "it doesn't work" problems are a missing
`setup` run (a tab or column is missing) or an old deployment (the website talks to the previous script).

Contents:

1. [Staff access (admin, riders, restaurants)](#1-staff-access)
2. [Admin page (Back office)](#2-admin-page-back-office)
3. [Offers and coupons](#3-offers-and-coupons)
4. [Order again](#4-order-again)
5. [Rider page and live tracking](#5-rider-page-and-live-tracking)
6. [Restaurant page (Kitchen)](#6-restaurant-page-kitchen)
7. [Add to home screen](#7-add-to-home-screen)
8. [Site notice](#8-site-notice)
9. [Debugging toolkit](#9-debugging-toolkit)

---

## 1. Staff access

**What:** the admin, rider and restaurant pages open only for phone numbers on the sheet's **Staff** tab. Staff
sign in with their normal Hungrr account (phone number + 6-digit PIN), so they need an account first.

**Sheet: Staff tab**

| column | meaning |
| --- | --- |
| `phone` | 10-digit number of their Hungrr account |
| `name` | shown on the order board, the rider slip and to customers (riders: first name only) |
| `role` | `admin`, `rider` or `restaurant` (dropdown). One row per role: a person can have several rows |
| `restaurant_id` | for `restaurant` only: the `restaurant_id` from the Restaurants tab |
| `active` | TRUE/FALSE (empty counts as TRUE). FALSE removes access without deleting the row |
| `last_lat`, `last_lng`, `last_seen_at` | riders: filled by the script, at most once a minute |
| `notes` | yours |

**How it works:**
- At every sign-in, and when any page loads with a saved sign-in, `account` returns `roles` (from Staff). The
  website keeps them with the account, and the khata shows "Your team pages" links.
- Every staff call is `POST { action: 'admin' | 'rider' | 'partner', op, token, … }`. The script checks the token
  (`readToken_`), then the Staff row for that phone and role (`staffFor_`). Anything else answers
  `{ ok: false, error: 'not_staff' }` or `'signed_out'`. The website's role list only decides what to show; the
  script decides what is allowed.

**Files:** `features/staff/StaffPage.jsx` (frame and the "not for you" message), `features/staff/useStaff.js`
(calls, polling, loading), `services/staffApi.js`, `Code.gs` → `staffFor_`, `staffRow_`, `rolesFor_`.

**Problems:**
- *"This page is for the Hungrr team"* even after adding the row: the role is kept on the device from the last
  check. Reload the page (it re-checks), or sign out and in. Check `phone` is the same number as the account,
  `role` is spelled exactly, `active` isn't FALSE.
- *Restaurant page says "isn't linked to a restaurant"*: fill `restaurant_id` with an ID from Restaurants.

---

## 2. Admin page (Back office)

**What:** `/admin` (role `admin`). Six tabs; `/admin?tab=offers` opens one directly.

| tab | what it does | script ops (`action: 'admin'`) | sheet |
| --- | --- | --- | --- |
| Orders | Orders in progress plus today's, as kitchen tickets in five columns (To verify, Paid, Preparing, On the way, Done today). One tap moves an order to its next status; pick a rider; "Update" opens WhatsApp with a status message for the customer; "Cancel". Refreshes every 20 s. | `board`, `set_status`, `assign_rider` | Orders (`status`, `status_at`, `rider`, `picked_up_at`, `delivered_at`), OrderItems (`ready_at`), Staff |
| Offers & coupons | The automatic offer (every Nth order) and coupons: make (with a generated code), edit, switch on/off, choose whether each is listed at checkout, see uses. The list is split into **Active now** (customers can apply them today) and **Not active** (switched off, not started, expired or used up). | `coupons`, `coupon_save`, `coupon_active`, `offer_save` | Coupons (incl. `show_at_checkout`), Offers, Orders (`coupon`) |
| Reviews | Reviews customers agreed to share and nobody checked yet, with "Show on website" / "Don't show"; then earlier ones. | `reviews`, `review_set` | Reviews (`approved`) |
| Menu & notice | Laid out like the pilot page's menu book. Left page: today's service (pause switch + message), the notice board (with a preview of the bar), and the restaurants by cluster, each with its "open today" switch and sold-out count. Right page: the chosen restaurant's menu by category, each dish with an "in stock" switch where customers see ADD. A search finds a restaurant or dish. Phones show the service page, then the restaurants or one menu. | `menu`, `menu_set`, `shop_set` | Settings (`orders_paused`, `pause_message`, `site_banner`), Clusters, Restaurants (`active`), Dishes (`available`) |
| Customers | Look up a phone number: account (since, last sign-in, PIN set, locked) and orders. Reset PIN, unlock. | `customer`, `customer_set` | Users, Orders |
| Numbers | Today or the last 7 days (Indian time): orders, money taken, average, discounts, customers (and how many came back), cancelled, payments to verify; top dishes; food value by restaurant. | `stats` | Orders, OrderItems |

**Statuses:** the board's "next step" is `Payment to verify → Paid → Preparing → Out for delivery → Delivered`.
Each change writes `status` and `status_at`. "Out for delivery" also writes `picked_up_at`, and "Delivered"
writes `delivered_at`. Changing a status by hand in the sheet still works.

**Files:** `pages/AdminPage/` (`AdminPage.jsx` = tabs; one file per tab; `admin.module.css` = shared styles; the
Menu & notice tab is `MenuSwitches.jsx` (the book and the switches' saving) with `MenuService.jsx`, `MenuIndex.jsx`
and `MenuPage.jsx`), `lib/staff.js` (board columns, next step, WhatsApp messages, codes, dates, `menuBook` = the
sheet's rows arranged like the menu, `couponState`). Script: `ADMIN_OPS` in `Code.gs`.

**Problems:**
- *A ticket has a red outline and "CHECK: site showed …"*: the total the customer saw differs from the sheet's
  own sum (a price changed while they ordered, or a coupon stopped being valid between check and payment).
  Compare with the payment before accepting.
- *Menu switch "didn't save"* (a red line above the book, and the switch flips back): the Dishes/Restaurants tab
  needs its `dish_id`/`restaurant_id` and `available`/`active` columns. Customers see changes within about a
  minute (the menu is cached 60 s).
- *A restaurant is under "Other" on the menu page*: its `cluster_id` doesn't match a row in Clusters.
- *A number looks wrong in Numbers*: it counts orders that are paid or further along (not Awaiting payment,
  not Cancelled), by `created_at` in Indian time. Repeat customers = ordered before the period too.

---

## 3. Offers and coupons

**What customers see:**
- The pilot page shows the automatic offer ("Every 5th order: free delivery") as a black pill.
- Signed in, the order note shows the offer's line when this order gets it.
- At step 3 (delivery details), a coupon box: the automatic offer if it applies, a code field, and **Coupons for
  you**: the coupons this customer can apply today that the team marked "Listed at checkout", each with what it
  saves on this order (or "Add ₹X more to use it") and an Apply button. The best saving is listed first; three
  show, "Show all" opens the rest.
- **One offer per order:** whichever saves more is used, and the box says so.
- The bill, the WhatsApp message, the tracking page and the khata show the discount line.
- The khata's card shows a stamp card: one stamp per paid order, and the last circle is the offer.

**The rules** (`lib/deals.js`, the same sums as `dealAmount_` in `Code.gs`):
- `amount`: ₹ off the food (never more than the food total).
- `percent`: % off the food, up to `max_discount` if set.
- `free_delivery`: the delivery charge becomes 0.
- A discount on the food comes off **before GST** (GST is on the discounted food total).
- `min_order` compares with the food total before any discount.

**Sheet: Coupons tab**

| column | meaning |
| --- | --- |
| `code` | 4–16 letters/digits, unique (any case: stored upper case) |
| `name` | what the team calls it (customers see the code and the discount) |
| `type` | `amount`, `percent`, `free_delivery` |
| `value`, `max_discount`, `min_order` | ₹ or %; cap (percent only); minimum food total |
| `starts_on`, `ends_on` | `yyyy-mm-dd`, both days included, Indian time; empty = no limit |
| `max_uses` | total uses (paid orders, not cancelled); empty = no limit |
| `per_customer` | uses per account; empty = no limit |
| `active` | TRUE/FALSE |
| `show_at_checkout` | TRUE = listed under the coupon field for every signed-in customer who can still use it; FALSE or empty = code only (works when typed, never listed) |
| `created_at`, `created_by`, `notes` | filled by the admin page / yours |

**Sheet: Offers tab** (automatic offers; `setup` adds "Every 5th order: free delivery")

| column | meaning |
| --- | --- |
| `offer_id` | `nth-order` (the admin page edits this row) |
| `name` | what customers see |
| `every_n` | 2–50: the customer's Nth, 2Nth, 3Nth… paid order gets it |
| `reward`, `value`, `max_discount` | same as a coupon's type/value/cap |
| `active` | TRUE/FALSE |

**Orders tab:** `coupon` (the code, or the offer's name) and `discount` (₹).

**How it works:**
1. When the order note opens (signed in), the site calls `POST { action: 'deals', token, coupon: '' }`, which
   returns `offer` (if this order is the Nth), `progress`, and `available`: the coupons to list (switched on,
   `show_at_checkout` TRUE, within their dates, not used up, and not used as often as this customer may; without
   the team's name for them). "Apply" calls it again with the code. The website sorts the list by what each saves
   on this order (`lib/deals.js → couponChoices`).
2. The summary (`lib/pricing.js → summarizeOrder`) applies the best of offer and coupon; the QR, the bill and
   the total use it.
3. The order is sent with `coupon` (only the code; the offer is worked out by the sheet). `saveOrder_` checks
   everything again (`dealsFor_` → `bestDeal_`) and writes `coupon`, `discount`, the totals and `total_check`.
   If the coupon became invalid, `notes` says why ("Coupon X not applied: used_up").
4. Counting: an account's orders that are paid or further along and not cancelled. The order being saved is
   left out, so its "number" is the count + 1. Orders still "Awaiting payment" never count.

**Coupon errors the customer can see:**
- `not_found`, `inactive`, `not_started`, `expired`
- `used_up` (`max_uses` reached)
- `used_by_you` (`per_customer` reached)
- below the minimum: "Add ₹X more"

**Files:** `lib/deals.js` (+ tests), `lib/pricing.js` (`summarizeOrder`, `chargeLines`),
`features/ordering/Checkout/DealBox.jsx` (the box and "Coupons for you"), `context/OrderProvider.jsx` (`deals`
state with `available`, `applyCoupon`, `removeCoupon`), `pages/PilotPage/PilotHeader.jsx` (offer pill),
`pages/AccountPage/RegularCard.jsx` (stamp card), `pages/AdminPage/OffersPanel.jsx`. Script: `dealsCheck_`,
`checkoutCoupons_`, `couponProblem_` (one set of rules for checking, listing and the admin's "Active now"),
`dealsFor_`, `bestDeal_`, `dealAmount_`, `offerProgress_`, `activeOffers_`, `findCoupon_`, `couponFrom_`.

**Problems:**
- *Customer saw a discount, sheet says CHECK*: the coupon ran out (or was switched off) between "Apply" and
  paying. The sheet charges the full price; `notes` says why. Decide case by case.
- *Offer not applied on the 5th order*: one of their earlier orders is still "Awaiting payment" or was
  cancelled (doesn't count), or was placed before signing in and not added to the khata (no `account`).
- *A coupon isn't in "Coupons for you"*: it's "Code only" (`show_at_checkout` not TRUE), not active today (see
  its chip on the admin page), or this customer has used it as often as `per_customer` allows. The list is
  fetched when the order note opens: reopen the note after changing a coupon.
- *Changing a coupon's code*: edit it on the admin page (it keeps uses only for the new code; old orders keep
  the old code in `coupon`).

---

## 4. Order again

**What:** in the khata, open an order → **Order again**. The same dishes go on a fresh order note, the pilot page
opens on it, and a notice says which order it was and which dishes aren't on the menu today (sold out or
removed). Quantities are the same; prices are today's.

**How it works:** the khata's orders include each dish's `dish_id` (from OrderItems).
`OrderProvider → reorder()` keeps the dishes that are on the current menu, then dispatches `cart/reorder` (a
fresh order with the notepad open, and `reorderNote` for the notice). `pages/PilotPage/ReorderNotice.jsx` shows
the notice in the header; × closes it.

**Problems:** *a dish is "not on the menu"* although it exists: its `dish_id` changed in Dishes (old orders keep
the old ID), or `available` is FALSE, or its restaurant is closed today.

---

## 5. Rider page and live tracking

**What:**
- `/rider` (role `rider`): a **Live location** switch, and the orders assigned to this rider as delivery slips.
  Each slip shows what to pick up where, with "Ready" from the kitchens, who to deliver to (name, address,
  "Call"), and **Picked up** → **Delivered**.
- Customers whose order is **Out for delivery** see "Ravi is bringing your order" on the tracking page, with a
  map once the rider shares their location. The map shows the rider's first name and position, never their
  phone number.

**How it works:**
1. The admin assigns a rider on the order board (`assign_rider` writes the rider's phone into Orders `rider`).
2. With sharing on, the phone's location (GPS, `watchPosition`) goes to the sheet every 20 s
   (`POST { action: 'rider', op: 'location', lat, lng, accuracy }`). The script keeps it in its cache for
   15 minutes (fast, no sheet write), and copies it to the Staff row at most once a minute.
3. "Picked up" sets the status to Out for delivery (and `picked_up_at`); "Delivered" sets Delivered (and
   `delivered_at`).
4. The tracking page (`track`) returns `rider: { name, lat, lng, at }` while the order is Out for delivery
   and the position is under 15 minutes old. It refreshes every 20 s while out for delivery (every 60 s
   otherwise).
5. The map is Leaflet with OpenStreetMap tiles (free, no key). It loads only when needed. The page is scaled
   with CSS zoom, which Leaflet's dragging doesn't follow, so the map follows the rider and only + / − zoom.

**Limits (websites, not apps):** location is shared only while the rider page is open and the screen is on. The
page asks the phone to keep the screen awake (Screen Wake Lock, in Chrome and recent Safari). Switching apps or
locking the phone pauses sharing. OpenStreetMap's tile servers are for light use; at real scale, move to a tile
provider.

**Files:** `pages/RiderPage/RiderPage.jsx`, `pages/RiderPage/useLocationSharing.js`,
`features/tracking/RiderOnMap.jsx`, `features/tracking/RiderMap.jsx` (Leaflet),
`pages/TrackPage/TrackResult.jsx` and `useOrderTracking.js`. Script: `RIDER_OPS`, `riderLocation_`,
`riderForCustomer_`.

**Problems:**
- *"Location is blocked"*: the rider denied it once. In Chrome: the lock icon by the address → Permissions →
  Location → Allow, then switch sharing on again.
- *Customer sees no map*: the order isn't Out for delivery yet, no rider is assigned, or the rider's last
  position is over 15 minutes old (sharing off, or the page closed).
- *Map shows grey squares*: the phone can't reach tile.openstreetmap.org (network, or blocked).

---

## 6. Restaurant page (Kitchen)

**What:** `/partner` (role `restaurant`, with `restaurant_id`). Today's orders that include this restaurant's
dishes, as kitchen tickets with big order numbers (the last 4 characters) and quantities, in four sections:
- **New**: payment checked, not started.
- **Preparing**
- **Ready for pickup**
- **Picked up today**

**Start preparing** moves a Paid order to Preparing. **Ready for pickup** stamps `ready_at` on this restaurant's
dishes in OrderItems. The admin board and the rider's slip then show "Ready" for that restaurant. Refreshes
every 20 s. "Sound on" plays a chime for new orders, and the tab title shows "(2)".

**What restaurants see:** only orders the team has verified (status Paid or later), only their own dishes, and
no customer name, phone or address. They also see the rider's name, and which other restaurants the same rider
collects from.

**Files:** `pages/PartnerPage/PartnerPage.jsx`. Script: `PARTNER_OPS`, `partnerOrder_`.

**Problems:**
- *An order is missing*: it's still "Payment to verify" (verify it on the board first).
- *An order is under another restaurant*: its dishes' `restaurant_id` in Dishes is wrong (orders are matched by
  `dish_id` → restaurant).

---

## 7. Add to home screen

**What:** Hungrr can be installed like an app (its own icon, full screen, opens on the main page; long-press
offers Order now, Track my order, My khata). On phones, a card appears after 4 seconds on the main, pilot,
tracking and khata pages:
- **Android (Chrome):** "Add" opens the browser's own install prompt.
- **iPhone:** the card says how: Share → Add to Home Screen (Apple doesn't let websites prompt).

The card doesn't come back for 14 days after ×, and never appears once installed.

**Files:** `public/manifest.webmanifest`, `public/icons/`: wherever the app's logo shows (home-screen icon, the Order now shortcut, the install card, and the browser tab via `public/favicon.svg`) it is the Hungrr logo (`logo.svg`): `icon-192`/`icon-512` as drawn, with rounded corners; `maskable-512` and `apple-touch-icon` filled to the edges, because the phone rounds or crops those itself. The other two long-press shortcuts have their own icons on the same yellow square: Track my order the moped (`shortcut-track.svg`), My khata a ledger with a ₹ (`shortcut-khata.svg`), each with a 192 px PNG. The delivery designs on the website (roads, cluster maps, rider pins) keep the moped icon, `public/sw.js` (service
worker), `index.html` (manifest and iPhone tags), `src/main.jsx` (registers the service worker, built site
only), `features/install/InstallPrompt.jsx`.

**The service worker:**
- Pages always come from the network, and the last copy is kept for when there's no connection.
- Built scripts and styles (whose names carry a fingerprint) are kept after first use.
- Everything else (the Google Sheet, fonts, map tiles) is never stored.
- To force every phone to drop old copies, change `CACHE` in `sw.js`.

**Problems:**
- *No install card on Android*: the site must be on HTTPS, with the manifest and service worker loading
  (DevTools → Application → Manifest / Service workers). Chrome also waits until the person has interacted
  with the site a little.
- *An installed phone shows an old version*: reopen the app twice (the service worker updates in the
  background), or change `CACHE`.
- *Hostinger:* `hosting/hostinger/.htaccess` serves `sw.js` and the manifest with `no-cache` and the right
  type. Keep it.

---

## 8. Site notice

**What:** one line at the top of every page ("Rain today: deliveries may take 20 minutes longer."), set on the
admin page (Menu & notice) or in Settings → `site_banner`. Empty hides it. It appears within about a minute.

**Files:** `components/layout/SiteBanner/SiteBanner.jsx`, `lib/menuData.js` (`settings.siteBanner`).

---

## 9. Debugging toolkit

- **Watch the script answer:** DevTools → Network → Fetch/XHR. Each call shows twice: `exec` (a 302 with no
  body) and `echo?user_content_key=…` (the answer). Read the `echo` row's Preview.
- **Script errors:** Apps Script → **Executions** (left bar) lists every run with its error. `console.log`
  lines in `Code.gs` appear there too.
- **Test on your computer:** `tools/sheet-mock/` runs `Code.gs` in Node against a sheet that resets on restart,
  with the test suites (`test-staff.cjs`, `test-accounts.cjs`, `test-reviews.cjs`). See its README.
- **Unit tests:** `npm test` (pricing with discounts, deals, staff helpers, accounts and more).
- **Caches:** the menu and the opening hours are cached by the script for 60 s and 20 s (cleared when you edit
  the sheet by hand or use the admin page). A rider's position is cached for 15 minutes.
