const assert = require('assert');
const fs = require('fs');
const path = require('path');

const apiFile = path.join(__dirname, '..', 'api', 'cashew-sync.js');
const source = fs.readFileSync(apiFile, 'utf8');

assert(source.includes('ktapps_TURSO_DATABASE_URL'), 'API should use ktapps_TURSO_DATABASE_URL env var');
assert(source.includes('ktapps_TURSO_AUTH_TOKEN'), 'API should use ktapps_TURSO_AUTH_TOKEN env var');
assert(!source.includes('GOOGLE_SHEET_URL_CASHEW'), 'API should not use Google Sheets URL');assert(source.includes("client.batch(statements, 'write')"), 'API should use supported batch mode signature for current libsql client');
assert(source.includes('uniqueDates'), 'API should always delete existing rows by date before inserting to prevent duplicates');
assert(source.includes('expense_month'), 'Sync API should persist expense_month column to Turso');
assert(source.includes('expense_year'), 'Sync API should persist expense_year column to Turso');

const dedupeFile = path.join(__dirname, '..', 'api', 'cashew-dedupe.js');
const dedupeSource = fs.readFileSync(dedupeFile, 'utf8');
assert(dedupeSource.includes('SELECT MAX(id)'), 'Dedupe endpoint must keep latest row per (expense_date, category)');
assert(dedupeSource.includes('GROUP BY expense_date, category'), 'Dedupe endpoint must group by date and category');

const fetchFile = path.join(__dirname, '..', 'api', 'cashew-fetch.js');
const fetchSource = fs.readFileSync(fetchFile, 'utf8');
assert(fetchSource.includes('matchesMonthYear'), 'Fetch API should filter by month/year via helper logic');
assert(fetchSource.includes('parseExpenseDate'), 'Fetch API should parse mixed date formats safely');
assert(fetchSource.includes('WHERE expense_month = ? AND expense_year = ?'), 'Fetch API should query by month/year columns in Turso');
assert(fetchSource.includes('backfillMonthYear'), 'Fetch API should backfill month/year for legacy rows');

const cashewFile = path.join(__dirname, '..', 'cashew', 'cashew.html');
const cashewSource = fs.readFileSync(cashewFile, 'utf8');
assert(cashewSource.includes('CONFIG.GOOGLE_SHEET_URL_CASHEW'), 'Frontend should still post directly to Google Sheets');
assert(cashewSource.includes('CONFIG.CASHEW_SYNC_API_URL'), 'Frontend should post to Turso API endpoint');
assert(cashewSource.includes('Promise.allSettled([saveToSheets, saveToTurso])'), 'Frontend should save Sheets and Turso independently');

console.log('cashew-sync checks passed');

