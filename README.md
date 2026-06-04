# mywebapps

Web App

## Cashew save sync (Turso + Google Sheets)

`cashew/cashew.html` now saves through the Vercel API endpoint `api/cashew-sync.js`.
That API writes to Turso and Google Sheets in parallel and reports success only when both writes complete.

### Required Vercel environment variables

- `ktapps_TURSO_DATABASE_URL`
- `ktapps_TURSO_AUTH_TOKEN`
- `GOOGLE_SHEET_URL_CASHEW`

### Local check

```bash
npm install
npm test
```

