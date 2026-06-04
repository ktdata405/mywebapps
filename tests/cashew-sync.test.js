const assert = require('assert');
const fs = require('fs');
const path = require('path');

const apiFile = path.join(__dirname, '..', 'api', 'cashew-sync.js');
const source = fs.readFileSync(apiFile, 'utf8');

assert(source.includes('ktapps_TURSO_DATABASE_URL'), 'API should use ktapps_TURSO_DATABASE_URL env var');
assert(source.includes('ktapps_TURSO_AUTH_TOKEN'), 'API should use ktapps_TURSO_AUTH_TOKEN env var');
assert(!source.includes('GOOGLE_SHEET_URL_CASHEW'), 'API should not use Google Sheets URL');

const cashewFile = path.join(__dirname, '..', 'cashew', 'cashew.html');
const cashewSource = fs.readFileSync(cashewFile, 'utf8');
assert(cashewSource.includes('CONFIG.GOOGLE_SHEET_URL_CASHEW'), 'Frontend should still post directly to Google Sheets');
assert(cashewSource.includes('CONFIG.CASHEW_SYNC_API_URL'), 'Frontend should post to Turso API endpoint');

console.log('cashew-sync checks passed');

