# Connect the Google Sheet (about 10 minutes, once)

> **Already connected your sheet with an earlier version?** Three things to do, before you put the new website
> live (the website's sign-in needs the new script):
>
> 1. Open the sheet's **Extensions → Apps Script**, replace everything with the new `Code.gs` and **Save**.
> 2. In the toolbar, choose **setup** in the function list, then click **Run**. Google asks for permission again
>    (this version can send email and talk to Telegram): **Review permissions** → your account → **Advanced** →
>    **Go to Hungrr website (unsafe)** → **Allow**. `setup` adds anything your sheet is missing (the opening hours
>    and pause switch in Settings, the **Alerts**, **Reviews** and **Users** tabs, the `status_at` and `account`
>    columns in Orders, and the secret that protects PINs), then emails you a test alert.
> 3. **Deploy → Manage deployments →** pencil icon **→ Version: New version → Deploy**. The URL stays the same.
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
for (see step 3.3 below for the "unsafe" screen). This adds the opening hours, the pause switch, the Alerts,
Reviews and Users tabs and the secret that protects PINs, and sends you a test email.

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
    then move the status along: Paid → Preparing → Out for delivery → Delivered (or Cancelled).
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
- The Alerts tab is not shown on the website.

## Order tracking

Customers track an order at `/track` on the website with the order ID (on their bill) and the phone number they
ordered with. They see the **status** you set in Orders, the dishes and the total. When you change a status by
hand, the `status_at` column fills in the time by itself, so the tracking page can say "Updated 5 min ago".
The script only answers when the phone number matches the order, and never sends back the customer's name,
phone, address or UPI reference number.

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

## If you change Code.gs later

**Deploy → Manage deployments →** pencil icon **→ Version: New version → Deploy.** The URL stays the same, so the
website needs no change.

## Good to know

- The Orders and Users tabs hold customers' names, phone numbers and addresses. Keep the sheet private: share it
  only with the people who handle orders.
- The web app URL is public, like the website. Through it, anyone can read the menu tabs (which the website shows
  anyway), submit orders, look up an order's status or rate it if they know both its ID and phone number, read
  the approved reviews (without phone numbers or order IDs), open an account, and see whether a phone number has
  one. An account's orders and name are only shown with its PIN. They cannot read the Orders, Users or Alerts
  tabs, or the reviews that are not approved. The script recalculates every price and total from
  the sheet and ignores dishes that are not on the menu.
- Keep the first row (column names) of every tab as it is. You can reorder columns or add your own extra columns.
