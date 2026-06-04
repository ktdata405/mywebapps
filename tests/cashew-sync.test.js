const assert = require('assert');
const fs = require('fs');
const path = require('path');

const apiFile = path.join(__dirname, '..', 'api', 'cashew-sync.js');
const source = fs.readFileSync(apiFile, 'utf8');

assert(source.includes('Promise.allSettled(['), 'API should sync Turso and Sheets in parallel');
assert(source.includes('ktapps_TURSO_DATABASE_URL'), 'API should use ktapps_TURSO_DATABASE_URL env var');
assert(source.includes('ktapps_TURSO_AUTH_TOKEN'), 'API should use ktapps_TURSO_AUTH_TOKEN env var');
assert(source.includes('GOOGLE_SHEET_URL_CASHEW'), 'API should use GOOGLE_SHEET_URL_CASHEW env var');

console.log('cashew-sync checks passed');

