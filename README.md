# mywebapps

Web App

## Cashew save sync (separate paths)

`cashew/cashew.html` writes to Google Sheets directly using `CONFIG.GOOGLE_SHEET_URL_CASHEW` (same behavior as before).

`cashew/cashew.html` also calls `api/cashew-sync.js` in parallel for Turso writes.
The API is Turso-only and does not call Google Sheets.

### Required Vercel environment variables

- `ktapps_TURSO_DATABASE_URL`
- `ktapps_TURSO_AUTH_TOKEN`

### Local check

```bash
npm install
npm test
```

