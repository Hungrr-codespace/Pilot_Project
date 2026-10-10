# Connect the Google Sheet (about 10 minutes, once)

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
- **Orders:** each paid order arrives in **Orders** with status "Payment to verify", and one row per dish in
  **OrderItems**. The customer's order ID (for example `HG-261006-K7Q2`) is in their WhatsApp message, on their order
  photo, and in the note of their UPI payment, so you can match the payment screenshot to the row. Then move the
  status along: Paid → Preparing → Out for delivery → Delivered (or Cancelled).
- **total_check** says OK when the total the customer saw matches the sheet's own calculation. If it says CHECK,
  look at that order before accepting the payment (usually a price was changed while the customer was ordering).

## If you change Code.gs later

**Deploy → Manage deployments →** pencil icon **→ Version: New version → Deploy.** The URL stays the same, so the
website needs no change.

## Good to know

- The web app URL is public, like the website. Through it, anyone can read the menu tabs (which the website shows
  anyway) and submit orders. They cannot read the Orders tabs. The script recalculates every price and total from
  the sheet and ignores dishes that are not on the menu.
- Keep the first row (column names) of every tab as it is. You can reorder columns or add your own extra columns.
