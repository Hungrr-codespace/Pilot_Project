# Sheet mock: test the Apps Script on your computer

`mock.cjs` runs `google-sheet/Code.gs` in Node, against an in-memory copy of the sheet (`rows.json` is the menu),
and answers on `http://127.0.0.1:PORT/exec` just like the deployed web app. Use it to try changes to `Code.gs`
before pasting them into Apps Script, and to run the website against a sheet you can reset.

```bash
# 1. Start a fresh sheet (Ctrl+C stops it; starting again gives a clean sheet)
PORT=8792 node tools/sheet-mock/mock.cjs

# 2. In another terminal: the script's own tests (each needs a fresh sheet)
node tools/sheet-mock/test-staff.cjs      # coupons, the 5th-order offer, admin, rider and restaurant pages (72 checks)
node tools/sheet-mock/test-accounts.cjs   # sign-up, PIN, lockout, tokens, linked orders (45 checks)
node tools/sheet-mock/test-reviews.cjs    # reviews (prints what the sheet holds)

# 3. Or run the website against it
VITE_SHEET_API_URL=http://127.0.0.1:8792/exec npm run build && npx vite preview
```

Useful addresses while it runs: `/setup` (runs `setup()`), `/state` (every tab as JSON), `/tab?tab=Orders`,
`/status?order=HG-…&status=Delivered` (the team changing a status by hand).

Not covered: Google's own limits (quotas, the 6-minute run time), the permission screens, and real email or
Telegram (they are recorded in `/state` instead of sent).
