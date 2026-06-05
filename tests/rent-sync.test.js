const assert = require('assert');
const fs = require('fs');
const path = require('path');

const syncFile = path.join(__dirname, '..', 'api', 'rent-sync.js');
const syncSource = fs.readFileSync(syncFile, 'utf8');

assert(syncSource.includes('ktapps_NEON_DATABASE_URL'), 'Rent sync API should use ktapps_NEON_DATABASE_URL env var');
assert(syncSource.includes("type !== 'rent'"), 'Rent sync API should validate type=rent payload');
assert(syncSource.includes('CREATE TABLE IF NOT EXISTS rent_records'), 'Rent sync API should create rent_records table');
assert(syncSource.includes('DELETE FROM rent_records WHERE record_date'), 'Rent sync API should replace rows by date/side to prevent duplicates');

const fetchFile = path.join(__dirname, '..', 'api', 'rent-fetch.js');
const fetchSource = fs.readFileSync(fetchFile, 'utf8');
assert(fetchSource.includes('matchesMonthYear'), 'Rent fetch API should support month/year fallback filtering');
assert(fetchSource.includes('WHERE record_month ='), 'Rent fetch API should query by month/year columns');

const bridgeFile = path.join(__dirname, '..', 'api', 'rent-sync-bridge.js');
const bridgeSource = fs.readFileSync(bridgeFile, 'utf8');
assert(bridgeSource.includes('sheet-to-db'), 'Rent bridge API should support syncing from sheet to db');
assert(bridgeSource.includes('db-to-sheet'), 'Rent bridge API should support syncing from db to sheet');
assert(bridgeSource.includes('dedupeRecords'), 'Rent bridge API should dedupe rows during sync');

const rentFormFile = path.join(__dirname, '..', 'rent', 'script.js');
const rentFormSource = fs.readFileSync(rentFormFile, 'utf8');
assert(rentFormSource.includes('CONFIG.GOOGLE_SHEET_URL_RENT'), 'Rent form should post to Google Sheets config URL');
assert(rentFormSource.includes('CONFIG.RENT_SYNC_API_URL'), 'Rent form should post to Neon sync API endpoint');
assert(rentFormSource.includes('Promise.allSettled([saveToSheets, saveToNeon])'), 'Rent form should save Sheets and Neon independently');

const reportFile = path.join(__dirname, '..', 'rent', 'tenetreport.html');
const reportSource = fs.readFileSync(reportFile, 'utf8');
assert(reportSource.includes('syncSheetToDatabase'), 'Rent report should expose Sheet to DB sync action');
assert(reportSource.includes('syncDatabaseToSheet'), 'Rent report should expose DB to Sheet sync action');
assert(reportSource.includes('CONFIG.RENT_SYNC_BRIDGE_API_URL'), 'Rent report sync should use bridge API config');
assert(reportSource.includes('setDataSource'), 'Rent report should support data source switching between db and sheet');

console.log('rent-sync checks passed');

