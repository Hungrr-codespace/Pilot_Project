# Connect the Google Sheet (about 10 minutes, once)

> **Already connected your sheet with an earlier version?** Four things to do, before you put the new website
> live (the website's sign-in, offers and team pages need the new script):
>
> 1. Open the sheet's **Extensions → Apps Script**, replace everything with the new `Code.gs` and **Save**.
> 2. In the toolbar, choose **setup** in the function list (the dropdown next to **Debug**), then click **Run**.
>    Running the script without choosing `setup` first runs a different function and adds nothing. If Google asks
>    for permission: **Review permissions** → your account → **Advanced** → **Go to Hungrr website (unsafe)** →
>    **Allow**. `setup` adds anything your sheet is missing, then emails you a test alert:
>    - in Settings: the opening hours, the pause switch and `site_banner` (the notice at the top of the site)
>    - the **Alerts**, **Reviews**, **Users**, **Staff**, **Partners**, **Coupons** and **Offers** tabs (Offers starts with
>      "Every 5th order: free delivery")
>    - in Orders: the `status_at`, `account`, `coupon`, `discount`, `rider`, `picked_up_at` and `delivered_at`
>      columns; in OrderItems: `ready_at`; in Restaurants: `address` and `map_link` (where riders pick up)
>    - in Alerts: `rider_telegram_chat_id` and `website_url` (both optional: the riders' Telegram group)
>    - the secret that protects PINs
> 3. **Deploy → Manage deployments →** pencil icon **→ Version: New version → Deploy**. The URL stays the same.
> 4. Open the new **Staff** tab and add your own phone number as `admin` (see [Staff](#staff-admin-riders-and-restaurants)).
>
> Then fill in each restaurant's pickup address for riders: admin page → **Menu & notice** → the restaurant →
> **Riders pick up from → Add address** (or the `address` column in Restaurants).
>
> Running `setup` again later is safe: it only adds what is missing.

The website reads restaurants, dishes and settings from a Google Sheet, and writes every paid order into the same
sheet. A small Google Apps Script (free, runs on your Google account) connects the two.

## 1. Create the sheet

1. Open Google Drive and upload `Hungrr-website-data.xlsx` (it is in this folder).
2. Double-click it, then **File → Save as Google Sheets**. Work only in this new Google Sheet from now on
   (the script cannot run on an .xlsx file).
3. Read the **Start here** tab. Replace the sample rows (placeholders like "Restaurant name", "[Area name]",
   "X.X km") with your real restaurants and dishes whenever they are ready.

## 2. Add the script

1. In the Google Sheet: **Extensions → Apps Script**.
2. Delete everything in the editor, paste the whole of `Code.gs` (this folder), and click **Save**.
   Name the project "Hungrr website".

Then choose **setup** in the function list in the toolbar and click **Run**. Allow the permissions Google asks
for (see step 3.3 below for the "unsafe" screen). This adds anything the sheet is missing (the opening hours, the
pause switch, the Alerts, Reviews, Users, Staff, Coupons and Offers tabs, and the secret that protects PINs), and
sends you a test email.

## 3. Publish it as a web app

1. Click **Deploy → New deployment**. Click the gear next to "Select type" and choose **Web app**.
2. Description: `v1` · Execute as: **Me** · Who has access: **Anyone**. Click **Deploy**.
3. Google asks you to authorize. Choose your account → **Advanced** → **Go to Hungrr website (unsafe)** → **Allow**.
   ("Unsafe" only means Google has not reviewed your own script.)
4. Copy the **Web app URL**. It ends with `/exec`.

Test it: open the URL with `?action=menu` added at the end. You should see your tabs as text (JSON).

## 4. Give the URL to the website

- On your computer: copy `.env.example` to `.env` and paste the URL after `VITE_SHEET_API_URL=`.
- On the hosting site (Cloudflare Pages, Netlify, Vercel…): add an environment variable named
  `VITE_SHEET_API_URL` with the URL as its value, then redeploy.

Without the URL the website still works with its built-in sample menu, but orders are not saved to the sheet.

## Everyday use

- **Change the menu:** edit the tabs. The website shows the change within about a minute (the script keeps a copy
  for 60 seconds to stay fast).
- **Hide something without deleting it:** set `active` (restaurants, quick picks) or `available` (dishes) to FALSE.
- **Dish photos for the table:** upload the photo to Google Drive, set sharing to "Anyone with the link", and paste the
  share link in the `photo` column of QuickPicks. Square photos about 600 × 600 px look best.
- **Orders:** each order arrives in **Orders** with the customer's name, phone and delivery address, and one row
  per dish in **OrderItems**.
  - **Awaiting payment:** the customer has given their details and sees the QR, but hasn't confirmed paying yet.
  - **Payment to verify:** the customer tapped **Confirm payment** and entered their 12-digit UPI reference number
    (the `upi_ref` column). Find the same number in your UPI app (or check the order ID in the payment note),
    then move the status along: Paid → Preparing → Out for delivery → Delivered (or Cancelled). The admin
    page's order board does this with one tap (see [Admin page](#admin-page)); changing the cell by hand still
    works.
  - The order ID (for example `HG-261006-K7Q2`) is also on the customer's bill and in their WhatsApp message.
  - If `notes` says "UPI ref also used on …", the same reference number was entered for another order: check
    before accepting it.
- **total_check** says OK when the total the customer saw matches the sheet's own calculation. If it says CHECK,
  look at that order before accepting the payment (usually a price was changed while the customer was ordering).

## Opening hours and the pause switch

In the **Settings** tab:

| key | What it does |
| --- | --- |
| `opens_at` | When orders open each day, Indian time, e.g. `11:00 AM` |
| `closes_at` | The last time to place an order, e.g. `8:30 PM` |
| `orders_paused` | Tick it (or set TRUE) to stop new orders right away: rain, a rush, exam days. Untick to open again. |
| `pause_message` | Optional. Shown to customers while paused, e.g. `Back at 6 PM after the rain.` |

Outside the hours, or while paused, the pilot page says so at the top and the **Confirm order** button is greyed
out with the reason. Customers can still look through the menu. Orders already being paid are not interrupted.
People who already have the page open see the change within about 2 minutes. The hours shown on the main page,
in the FAQ and on the policy pages come from these rows too.

## Order alerts

When a customer has paid and entered their UPI reference number (status **Payment to verify**), the script sends
an alert, so someone can check the payment straight away. Set it up in the **Alerts** tab:

- **Email:** `alert_emails` holds the addresses to send to, separated by commas (`setup` puts yours in). Alerts come
  from your own Gmail. They include the order ID, amount, UPI reference number, the customer's name, phone and
  address, the dishes, and a link to the order's row. A free Gmail account can email about 100 recipients a day
  this way (Google's limit), so with two addresses that is about 50 alerts a day.
- **Telegram (optional, instant on your phone, no daily limit):**
  1. In Telegram, message **@BotFather**, send `/newbot`, give it a name (e.g. Hungrr Orders) and copy the
     **token** it gives you.
  2. Make a group with your team, add the bot, and send `/start` in the group.
  3. Open `https://api.telegram.org/bot<TOKEN>/getUpdates` in a browser (with your token), find `"chat":{"id":`
     and copy the number after it (a group's number starts with `-`).
  4. Put the token in `telegram_bot_token` and the number in `telegram_chat_id`, then run **setup** again to get a
     test message.

  Telegram alerts carry the order ID, amount, UPI reference number and restaurants, but not the customer's name,
  phone or address.
- **New orders too:** tick `alert_on_new_order` to also get an alert when an order is placed (before payment).
- **Riders' group (optional):** a second Telegram group, with your riders and the same bot. Each order you mark
  **Paid on the admin page** that has no rider yet is posted there ("🛵 New order to deliver", the restaurants
  with their addresses, the drop area and a link to the rider page), so riders who aren't on the rider page hear
  about it too. Get the group's number as in step 3 and put it in `rider_telegram_chat_id`, and your website's
  address (e.g. `https://hungrr.in`) in `website_url`. The post has no customer name, phone or room number.
  Orders marked Paid by typing in the sheet are not posted (Google doesn't let a sheet edit send messages); the
  riders still see them on the rider page.
- The Alerts tab is not shown on the website.

## Order tracking

Customers track an order at `/track` on the website with the order ID (on their bill) and the phone number they
ordered with. They see the **status** you set in Orders, the dishes and the total. When you change a status by
hand, the `status_at` column fills in the time by itself, so the tracking page can say "Updated 5 min ago".
The script only answers when the phone number matches the order, and never sends back the customer's name,
phone, address or UPI reference number. While an order is **Out for delivery** with a rider assigned, the page
also shows the rider's first name and, if they share their location, a map (see [Riders](#riders-new-orders-pickups-and-live-location)).

## Reviews

Customers rate an order at `/feedback` on the website (the tracking page links there once an order is delivered).
They enter the order ID and the phone number they ordered with, so only real, paid orders can be rated, and each
order has one review: sending it again updates the same row in the **Reviews** tab.

| column | What it holds |
| --- | --- |
| `rating`, `tags` | 1 to 5 stars, and the tags the customer picked |
| `comment` | The review in the customer's words (up to 280 characters) |
| `improve` | Private: what they would add or improve. Never shown on the website. |
| `name` | The name they chose to show with the review |
| `show_on_site` | Yes if the customer agreed to show the review on the website |
| `approved` | **You set this.** Yes shows the review (if `show_on_site` is Yes); No keeps it off |

- **Approving:** read new rows and set `approved` to **Yes** or **No**. Approve for content (say No to abuse,
  personal details or advertising), not for the rating: showing the low reviews too is what makes the good ones
  believable. If a customer changes their words, `approved` empties again.
- **The rating on the website** (average, star bars, most-loved tags) counts every review, shown or not.
- **Low ratings:** a 1 or 2-star review sends an alert (email with the words, Telegram with the stars and tags),
  so someone can call the customer back.
- **Removing a review:** if a customer asks, set `approved` to No (or delete the row). The website updates within
  about a minute.

## Accounts (the customer's khata)

Customers sign in with their phone number and a 6-digit PIN they pick. The website asks them when they open the
pilot menu (they can just look at the menu instead) and again at **Confirm order**: an order is placed only by a
signed-in customer, so it always belongs to their account. Their khata (`/account`) lists their orders, lets them
track and rate each one, and change their name. Each account is one row in the **Users** tab:

| column | What it holds |
| --- | --- |
| `phone` | The account's key, a 10-digit number. One account per number. Don't change it. |
| `name` | The customer's name. Customers can change it on the website; you can correct it here. |
| `pin_hash`, `pin_salt` | A scrambled form of the PIN, never the PIN itself. Nobody, including you, can read the PIN. |
| `failed_tries`, `locked_until` | Five wrong PINs in a row lock the account for 15 minutes. |
| `created_at`, `updated_at`, `last_sign_in_at` | Filled in by the script. |
| `notes` | Your own notes. |

- **Orders and accounts:** an order placed while signed in gets the account's number in the Orders tab's new
  `account` column. Orders from before accounts existed have it empty; the customer adds them to their khata by
  typing the order ID from the bill (the phone number on the order must match their account).
- **Forgotten PIN:** check the message really comes from that number (for example, the customer messages you on
  WhatsApp from it), then clear their `pin_hash` cell. Their next sign-in asks them to pick a new PIN, and any
  device still signed in with the old one is signed out. Ask them to sign in straight away.
- **Locked out after wrong PINs:** it unlocks by itself after 15 minutes. To unlock sooner, clear `locked_until`.
- **Closing an account** (if a customer asks): delete their row in Users. Their orders stay in Orders.
- **The secret:** `setup` stores a random secret in the script's **Project Settings → Script properties**
  (`ACCOUNT_SECRET`). It scrambles PINs and signs sign-ins. Don't change or delete it: every PIN would stop
  working and everyone would be signed out.
- A sign-in lasts 60 days on a device, or until the customer signs out.

## Staff: admin, riders and restaurants

The website has three team pages. Each opens only for a phone number listed in the **Staff** tab, signed in with
its normal Hungrr account (phone number and PIN). **Restaurants and riders apply on the website** and get their
row when you approve them on the admin page (see [Restaurants and riders apply](#restaurants-and-riders-apply)).
**Admins** you add by hand: the person first opens an account on the website like a customer, then you add their
row:

| column | What it holds |
| --- | --- |
| `phone` | The 10-digit number of their Hungrr account |
| `name` | Shown on the order board and on the rider's slip. Customers see a rider's first name only. |
| `role` | `admin` (the admin page), `rider` (the rider page) or `restaurant` (the kitchen page). Pick from the dropdown. |
| `restaurant_id` | For `restaurant` only: the restaurant's `restaurant_id` from the Restaurants tab |
| `active` | Set FALSE to take the access away without deleting the row. Empty counts as TRUE. |
| `last_lat`, `last_lng`, `last_seen_at` | Riders: their last shared position, filled in by the script |
| `notes` | Your own notes |

- **Start with yourself:** add your own number with `role` = `admin`. Then open `/admin` on the website.
- **Several roles:** one row per role. For example, a co-founder who also delivers has an `admin` row and a
  `rider` row.
- Once added, the person's khata shows links to their pages. If the page still says it is for the Hungrr team,
  reload it (or sign out and in again).
- Taking a row out (or `active` FALSE) closes the page for that person at their next action.

## Admin page

`/admin` on the website, for `admin` rows in Staff. Everything it does is also in the sheet, but in a form that
is quicker on a phone:

| tab | What it does |
| --- | --- |
| **Orders** | Today's orders as tickets: to verify, paid, preparing, on the way, done. One tap moves an order to its next status. Pick the rider, or leave it for a rider to accept on their page (their name then shows on the ticket); send the customer an update on WhatsApp; cancel. Refreshes every 20 seconds. |
| **Offers & coupons** | The automatic offer and the coupon codes (see below), split into those customers can apply today and those that aren't active. |
| **Reviews** | New reviews to approve with one tap, then earlier ones. |
| **Join requests** | Restaurants and riders who applied on the website: check their numbers, then approve or decline. |
| **Menu & notice** | Laid out like the menu book on the pilot page: today's service (pause orders, with a message), the notice at the top of the site, the restaurants with an "open today" switch, and each restaurant's menu with an "in stock" switch on every dish and its pickup address for riders. |
| **Customers** | Look up a phone number: the account and its orders. Reset a forgotten PIN, unlock after wrong PINs. |
| **Numbers** | Today or the last 7 days: orders, money taken, discounts given, customers, top dishes, sales by restaurant. |

## Restaurants and riders apply

The website's **Sign in** button asks who is signing in: a customer, a restaurant partner or a rider. Restaurants
and riders use the same phone number and PIN as everyone, but their page opens only after you approve them.

- **Restaurants** give the restaurant's name, its **address** (where riders pick up), their **GST number** (or tick "We're not registered for GST": small
  kitchens below the GST turnover limit don't have one) and their **FSSAI licence or registration number**
  (14 digits, required for every food business).
- **Riders** give their **date of birth** (18 or older), **vehicle number** and **driving licence number**.
- The website checks the format of each number (the GST number has a built-in check character, so most typing
  mistakes are caught). It can't check that a number is real: the government sites need a captcha. **Check each
  one yourself before approving**: the admin page's Join requests tab has a Copy button and a link for each:
  - GST: www.gst.gov.in → Search Taxpayer → Search by GSTIN/UIN (the name should match the restaurant or owner)
  - FSSAI: foscos.fssai.gov.in → FBO Search (the licence should be active, at this address)
  - Driving licence: parivahan.gov.in → Online Services → Driving Licence Related Services
  - Vehicle: parivahan.gov.in → Know Your Vehicle Details
- You get an alert for each new application (email with the name and phone number; Telegram with the role and
  restaurant name).
- **Approve:** the rider's or restaurant's Staff row is added, and their page opens at their next sign-in. For a
  restaurant, choose "A new restaurant" (a row is added to Restaurants with the address they gave, closed until you
  add its dishes in the Dishes tab and switch it on in Menu & notice; pick its cluster) or the restaurant it
  already is on Hungrr.
- **Decline:** write why. They see your note when they sign in, and can correct their details and apply again.
- **Remove access** (in Decided, lower on the tab): closes their page; their Staff row stays, with `active` FALSE.

Applications are kept in the **Partners** tab: one row per phone number and role, with the numbers they gave,
`status` (pending, approved, declined, removed), and when and by whom it was decided. These are personal details:
keep the sheet private.

## Offers and coupons

Make and change them on the admin page (**Offers & coupons**); the **Coupons** and **Offers** tabs keep them.
Only one offer applies to an order: if a customer has both, the one that saves them more is used.

- **The automatic offer** (Offers tab): every Nth paid order of an account gets a reward, by itself, without a
  code. `setup` starts it as "Every 5th order: free delivery". On the admin page you can change N (2 to 50), the
  reward (free delivery, ₹ off or % off), the name customers see, or switch it off. Only paid orders that are not
  cancelled count, and only orders in the customer's khata.
- **Coupons** (Coupons tab): a code the customer types at checkout. On the admin page, **Make a code** creates
  a unique code (or type your own: 4 to 16 letters and digits), then choose:
  - the discount: **₹ off** the food, **% off** the food (with an optional cap, e.g. up to ₹60), or **free
    delivery**
  - an optional minimum food total, start and end dates (both days included), a total number of uses and a
    number of uses per customer
  - the name your team calls it (customers see the code and the discount)
  - **Listed at checkout** (on by default): every signed-in customer who can still use it sees it under the
    coupon field, with what it saves on their order and an Apply button. Switch it off for a private code (for
    one hostel or a college club): it then works only for people who type it.

  The admin page lists the coupons customers can apply today ("Active now", each marked "Listed at checkout" or
  "Code only") apart from the rest (switched off, not started, expired or used up), with how many times each was
  used and a switch to turn it on or off.
- A discount on the food comes off **before GST**. The Orders tab records the code or offer name in `coupon` and
  the amount in `discount`. The script checks every coupon again when the order is saved: if it ran out in the
  meantime, the order is saved at full price, `total_check` says CHECK and `notes` says why.
- Customers need to be signed in for offers and coupons (each order belongs to an account).
- You can also type a coupon straight into the Coupons tab (code in capitals, `type` from the dropdown,
  `active` TRUE, and `show_at_checkout` TRUE to list it). The admin page is easier because it checks the code is
  unique.

## Riders: new orders, pickups and live location

- **New orders:** once you have checked an order's payment (Paid), every rider sees it on their page (`/rider`,
  tab **New orders**): the restaurants to pick up from, with their addresses and Directions, the area it goes
  to (e.g. "Girls Hostel 2") and how many dishes. The first rider to tap **Accept order** gets it; the others see
  "taken". Before accepting, riders don't see the customer's name, phone or full address.
- **Alerts:** riders switch on **New-order alerts** on their page: a chime and a buzz for each new order, and a
  phone notification while the page is in the background (Android, and iPhone when Hungrr is added to the Home
  Screen). A closed page can't alert, so for riders who aren't on the page use the riders' Telegram group (see
  [Order alerts](#order-alerts)).
- **You can still assign:** on the order board, pick the rider for any order, at any time, even one a rider
  accepted. It appears in that rider's **My orders** (with an alert). Your board shows whoever accepted.
- **My orders** are delivery slips: what to collect from which restaurant (address, Directions, "Ready" once the
  kitchen marks it), and the customer's name, address (with Directions) and a call button. Before pickup the
  rider can give an order back, and it returns to New orders.
- **Who updates what:** restaurants mark Preparing and Ready; then the rider taps **Picked up** (Out for delivery)
  and **Delivered** at the door. Riders can't go backwards or touch another rider's order. You can still set any
  status on the board or in the sheet.
- **Pickup addresses:** the Restaurants tab's `address` (what riders read, e.g. "Shop 4, Main Road, near Gate 1,
  Mesra") and `map_link` (optional: in Google Maps, find the restaurant → Share → Copy link). Edit them on the
  admin page (Menu & notice → the restaurant → Riders pick up from). Without a map link, Directions searches
  Google Maps for the address.
- With **Live location** switched on, the rider's phone sends its position every 20 seconds. The customer
  tracking that order sees it on a map, with the rider's first name, while the order is Out for delivery. The
  latest position is also written to the rider's Staff row (at most once a minute).
- Limits of a website: alerts and location work only while the rider page is open (with Live location on, the
  page keeps the screen awake where the phone allows it). A position older than 15 minutes is not shown to the
  customer.
- The map uses OpenStreetMap, which is free for light use like the pilot. At a larger scale, move to a paid map
  provider.

## Restaurant page

`/partner` on the website, for `restaurant` rows in Staff (with their `restaurant_id`). Each restaurant sees
today's orders that include its dishes, once you have checked the payment (status Paid or later), with only its
own dishes and the order number. It never sees the customer's name, phone or address.

- **Start preparing** moves the order to Preparing. **Ready for pickup** marks this restaurant's dishes ready
  (the `ready_at` column in OrderItems), which the admin board and the riders' pages show. After that the rider
  updates the order (picked up, delivered).
- The page refreshes every 20 seconds and can play a sound for each new order.

## The notice at the top of the site

Set `site_banner` in Settings (or use **Menu & notice** on the admin page) to show one line at the top of every
page, e.g. `Rain today: deliveries may take 20 minutes longer.` Clear it to hide the notice.

## Add to home screen

The website can be installed on a phone like an app. Android phones show an **Add** button after a few seconds;
iPhones show how to do it from Safari's Share menu. Nothing to set up in the sheet.

For how each feature works and what to check when something goes wrong, see `docs/FEATURES.md` in the website's
code.

## If you change Code.gs later

**Deploy → Manage deployments →** pencil icon **→ Version: New version → Deploy.** The URL stays the same, so the
website needs no change.

## Good to know

- The Orders, Users, Staff and Partners tabs hold names, phone numbers, addresses and (Partners) licence numbers. Keep the sheet private: share it
  only with the people who handle orders. Riders and restaurants use their pages on the website and don't need
  the sheet.
- The web app URL is public, like the website. Through it, anyone can read the menu tabs (which the website shows
  anyway), submit orders, look up an order's status or rate it if they know both its ID and phone number, read
  the approved reviews (without phone numbers or order IDs), open an account, and see whether a phone number has
  one. An account's orders and name are only shown with its PIN, and a coupon can only be checked while signed
  in. Signed-in customers see the coupons marked "Listed at checkout" that they can still use (the code and the
  discount, not your name for it). The admin, rider and restaurant actions work only for a signed-in number
  listed in Staff with that role. Nobody can read the Orders, Users, Staff, Coupons or Alerts tabs, or the
  reviews that are not approved, through the URL. The script recalculates every price, discount and total from the sheet and ignores dishes
  that are not on the menu.
- Keep the first row (column names) of every tab as it is. You can reorder columns or add your own extra columns.
