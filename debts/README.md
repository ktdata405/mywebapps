# Debts Google Sheet Setup

## 1) Create the Google Sheet
1. Create a new Google Sheet (example name: `KT Debts`).
2. Open **Extensions -> Apps Script**.
3. Replace default code with the content from `debts_google_apps_script.js`.
4. Save the project.

## 2) Deploy Apps Script Web App
1. Click **Deploy -> New deployment**.
2. Type: **Web app**.
3. Execute as: **Me**.
4. Who has access: **Anyone** (or **Anyone with the link**, based on your requirement).
5. Deploy and copy the `/exec` URL.

## 3) Configure Web App URL in this project
Update `config.js`:
- `CONFIG.GOOGLE_SHEET_URL_DEBTS` -> paste your Apps Script `/exec` URL
- `CONFIG.SHEET_URL_DEBTS` -> optional Google Sheet URL for quick access

If your Apps Script is **standalone** (not opened from a Sheet), set `SPREADSHEET_ID` in `debts_google_apps_script.js`.

## 4) Sheet Schema
The script auto-creates a tab named `Debts` with these headers:

- `ID`
- `Type` (`lent` or `borrowed`)
- `Person`
- `Amount`
- `Date` (`YYYY-MM-DD`)
- `Notes`
- `Status` (`pending` or `settled`)
- `Updated At`

## API Contract used by `debts.html`
- `GET ?action=list` -> `{ success: true, data: [...] }`
- `POST { action: "syncAll", debts: [...] }` -> rewrites current records

The UI saves directly to Google Sheet (no localStorage data cache).

