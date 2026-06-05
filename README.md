# mywebapps

Web App

## Cashew save sync (separate paths)

`cashew/cashew.html` writes to Google Sheets directly using `CONFIG.GOOGLE_SHEET_URL_CASHEW` (same behavior as before).

`cashew/cashew.html` also calls `api/cashew-sync.js` in parallel for Turso writes.
The API is Turso-only and does not call Google Sheets.

## Cashew bidirectional sync (month/year wise)

`api/cashew-sync-bridge.js` supports:

- `sheet-to-db` (copy Google Sheet data into Turso)
- `db-to-sheet` (copy Turso data back into Google Sheet)

Request body options:

- `direction`: `sheet-to-db` or `db-to-sheet`
- `month`, `year` for month-wise sync
- `fetchAll: true` for full sync
- `sheetUrl` (Google Apps Script URL)

Duplicate prevention:

- During sync, rows are deduped by `date + category + description + amount`.
- For each synced date, update mode replaces that date's rows instead of appending duplicates.
- The report page has quick actions for both sync directions.

### Required Vercel environment variables

- `ktapps_TURSO_DATABASE_URL`
- `ktapps_TURSO_AUTH_TOKEN`

Use this Turso DB URL value for `ktapps_TURSO_DATABASE_URL`:

- `libsql://ktapps-database-vercel-icfg-lwmjz4tns514tgybfewlpsk9.aws-ap-south-1.turso.io`

### Environment setup example

```bash
ktapps_TURSO_DATABASE_URL="libsql://ktapps-database-vercel-icfg-lwmjz4tns514tgybfewlpsk9.aws-ap-south-1.turso.io"
ktapps_TURSO_AUTH_TOKEN="<your-turso-auth-token>"
```

### Vercel env commands

```bash
vercel env add ktapps_TURSO_DATABASE_URL
vercel env add ktapps_TURSO_AUTH_TOKEN
```

### Local check

```bash
npm install
npm test
```

