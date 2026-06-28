/*
Google Apps Script for wallet module.
Sheet columns:
id | owner | type | title | textValue | idType | idNumber | idName | cardLabel | cardNumber | cardExpiry | cardCvv | cardHolder | savedAt
*/

const SHEET_NAME = 'Wallet';

function doGet(e) {
  const action = (e.parameter.action || '').trim();
  if (action === 'addWalletEntry') return json(addWalletEntry_(e.parameter));
  if (action === 'listWalletEntries') return json(listWalletEntries_());
  if (action === 'deleteWalletEntry') return json(deleteWalletEntry_(e.parameter.id));
  return json({ success: false, message: 'Unknown action' });
}

function addWalletEntry_(p) {
  const sh = getSheet_();
  const id = String(new Date().getTime());
  sh.appendRow([
    id,
    p.owner || '',
    p.type || '',
    p.title || '',
    p.textValue || '',
    p.idType || '',
    p.idNumber || '',
    p.idName || '',
    p.cardLabel || '',
    p.cardNumber || '',
    p.cardExpiry || '',
    p.cardCvv || '',
    p.cardHolder || '',
    p.savedAt || new Date().toISOString()
  ]);
  return { success: true, id: id };
}

function listWalletEntries_() {
  const sh = getSheet_();
  const values = sh.getDataRange().getValues();
  if (values.length <= 1) return { success: true, data: [] };

  const rows = values.slice(1).map(function(r) {
    return {
      id: r[0],
      owner: r[1],
      type: r[2],
      title: r[3],
      textValue: r[4],
      idType: r[5],
      idNumber: r[6],
      idName: r[7],
      cardLabel: r[8],
      cardNumber: r[9],
      cardExpiry: r[10],
      cardCvv: r[11],
      cardHolder: r[12],
      savedAt: r[13]
    };
  });

  rows.sort(function(a, b) {
    return String(b.savedAt || '').localeCompare(String(a.savedAt || ''));
  });

  return { success: true, data: rows };
}

function deleteWalletEntry_(id) {
  if (!id) return { success: false, message: 'Missing id' };
  const sh = getSheet_();
  const values = sh.getDataRange().getValues();

  for (let i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(id)) {
      sh.deleteRow(i + 1);
      return { success: true };
    }
  }
  return { success: false, message: 'Record not found' };
}

function getSheet_() {
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET_NAME) || SpreadsheetApp.getActiveSpreadsheet().insertSheet(SHEET_NAME);
  if (sh.getLastRow() === 0) {
    sh.appendRow(['id', 'owner', 'type', 'title', 'textValue', 'idType', 'idNumber', 'idName', 'cardLabel', 'cardNumber', 'cardExpiry', 'cardCvv', 'cardHolder', 'savedAt']);
  }
  return sh;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}

