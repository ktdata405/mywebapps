const assert = require('assert');
const fs = require('fs');
const path = require('path');

const syncFile = path.join(__dirname, '..', 'api', 'milk-sync.js');
const syncSource = fs.readFileSync(syncFile, 'utf8');

assert(syncSource.includes('ktapps_TURSO_DATABASE_URL'), 'Milk sync API should use ktapps_TURSO_DATABASE_URL env var');
assert(syncSource.includes('ktapps_TURSO_AUTH_TOKEN'), 'Milk sync API should use ktapps_TURSO_AUTH_TOKEN env var');
assert(syncSource.includes('CREATE TABLE IF NOT EXISTS milk_entries'), 'Milk sync API should create milk_entries table');
assert(syncSource.includes("DELETE FROM milk_entries WHERE entry_date = ?"), 'Milk sync API should replace data by date to avoid duplicates');
assert(syncSource.includes('markMonthPaid'), 'Milk sync API should support markMonthPaid action');

const fetchFile = path.join(__dirname, '..', 'api', 'milk-fetch.js');
const fetchSource = fs.readFileSync(fetchFile, 'utf8');
assert(fetchSource.includes('matchesMonthYear'), 'Milk fetch API should support date fallback filtering');
assert(fetchSource.includes('WHERE entry_month = ? AND entry_year = ?'), 'Milk fetch API should query by month/year columns');
assert(fetchSource.includes('backfillMonthYear'), 'Milk fetch API should backfill month/year for legacy rows');

const bridgeFile = path.join(__dirname, '..', 'api', 'milk-sync-bridge.js');
const bridgeSource = fs.readFileSync(bridgeFile, 'utf8');
assert(bridgeSource.includes('sheet-to-db'), 'Milk bridge API should support syncing from sheet to db');
assert(bridgeSource.includes('db-to-sheet'), 'Milk bridge API should support syncing from db to sheet');
assert(bridgeSource.includes('dedupeRows'), 'Milk bridge API should dedupe date rows during sync');

const milkFile = path.join(__dirname, '..', 'milk', 'milk.html');
const milkSource = fs.readFileSync(milkFile, 'utf8');
assert(milkSource.includes('CONFIG.GOOGLE_SHEET_URL_MILK'), 'Milk page should post to Google Sheets config URL');
assert(milkSource.includes('CONFIG.MILK_SYNC_API_URL'), 'Milk page should post to Turso sync API endpoint');
assert(milkSource.includes('Promise.allSettled([saveToSheets, saveToTurso])'), 'Milk page should save Sheets and Turso independently');

const reportFile = path.join(__dirname, '..', 'milk', 'milkreport.html');
const reportSource = fs.readFileSync(reportFile, 'utf8');
assert(reportSource.includes('syncSheetToDatabase'), 'Milk report should expose Sheet to DB sync action');
assert(reportSource.includes('syncDatabaseToSheet'), 'Milk report should expose DB to Sheet sync action');
assert(reportSource.includes('CONFIG.MILK_SYNC_BRIDGE_API_URL'), 'Milk report sync should use bridge API config');
assert(reportSource.includes('setDataSource'), 'Milk report should support data source switching between db and sheet');

console.log('milk-sync checks passed');

