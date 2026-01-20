// Google Apps Script Code for MSI - BOUND SCRIPT
// To use: Open your Google Sheet, then go to Extensions > Apps Script.
// Paste this code into the Code.gs file, save, and deploy.
// Publish > Deploy as web app > Execute as: Me > Who has access: Anyone.

const SHEET_NAME = 'Sheet1'; // The name of the sheet tab in your spreadsheet

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet(); // This script MUST be bound to the sheet
    var sheet = doc.getSheetByName(SHEET_NAME);
    if (!sheet) {
      sheet = doc.insertSheet(SHEET_NAME);
    }

    var data = JSON.parse(e.postData.contents);

    const headers = [
      'month', 'year', 'total_investment',
      'nj_axis_midcap', 'nj_dsp_midcap', 'nj_invesco_midcap', 'nj_kotak_emerging', 'nj_nippon_growth',
      'coin_quantum_liquid', 'coin_navi_nifty', 'coin_invesco_small', 'coin_axis_nifty', 
      'coin_birla_nifty', 'coin_dsp_nifty', 'coin_edelweiss_bond',
      'coin_canara_small', 'coin_quant_small', 'coin_birla_psu', 'coin_power_grid',
      'nps_tier1', 'nps_tier2', 'ssa_account', 'ppf_account'
    ];

    if (sheet.getLastRow() === 0) {
      sheet.appendRow(headers);
    }

    const row = headers.map(header => {
      return data[header] !== undefined ? data[header] : '';
    });
    
    const timestamp = new Date();
    row.push(timestamp); 
    
    sheet.appendRow(row);

    return ContentService.createTextOutput(JSON.stringify({ 'result': 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'error': e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function doGet(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheet = doc.getSheetByName(SHEET_NAME);

    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify([])) // Return empty array if sheet not found
        .setMimeType(ContentService.MimeType.JSON);
    }

    var data = sheet.getDataRange().getValues();
    var headers = data[0];
    var rows = data.slice(1);

    var result = rows.map(row => {
      var obj = {};
      headers.forEach((header, index) => {
        obj[header] = row[index];
      });
      return obj;
    });

    return ContentService.createTextOutput(JSON.stringify(result))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'error': e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}