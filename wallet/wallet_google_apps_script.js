/*
Google Apps Script for wallet module.
Stores records in 3 individual sheets in one spreadsheet file:
Bank (credential), IDs (id_card), Cards (card).
*/

const LEGACY_SHEET_NAME = 'Wallet-Prod';
const SHEET_CONFIG = {
  credential: {
    sheetName: 'Bank',
    headers: [
      'id', 'owner', 'type', 'title', 'textValue', 'savedAt',
      'credBankName', 'credUsername', 'credLoginPassword', 'credTPassOrPin', 'credChannel', 'credCardPin', 'credStatus'
    ]
  },
  id_card: {
    sheetName: 'IDs',
    headers: [
      'id', 'owner', 'type', 'savedAt',
      'idType', 'idNumber', 'idName', 'validFrom', 'validTo'
    ]
  },
  card: {
    sheetName: 'Cards',
    headers: [
      'id', 'owner', 'type', 'savedAt',
      'cardLabel', 'cardNumber', 'cardExpiry', 'cardCvv', 'cardHolder'
    ]
  }
};

function doGet(e) {
  const action = (e.parameter.action || '').trim();
  if (action === 'addWalletEntry') return json(addWalletEntry_(e.parameter));
  if (action === 'listWalletEntries') return json(listWalletEntries_());
  if (action === 'deleteWalletEntry') return json(deleteWalletEntry_(e.parameter.id));
  return json({ success: false, message: 'Unknown action' });
}

function addWalletEntry_(p) {
  const type = String(p.type || '').trim();
  const config = SHEET_CONFIG[type];
  if (!config) return { success: false, message: 'Invalid type' };

  const sh = getOrCreateSheet_(config.sheetName, config.headers);
  const idx = indexMap_(config.headers);
  const id = String(new Date().getTime());
  const row = new Array(config.headers.length).fill('');

  setAt_(row, idx.id, id);
  setAt_(row, idx.owner, p.owner || '');
  setAt_(row, idx.type, type);
  setAt_(row, idx.savedAt, p.savedAt || new Date().toISOString());

  if (type === 'credential') {
    setAt_(row, idx.title, p.title || p.credBankName || '');
    setAt_(row, idx.textValue, p.textValue || '');
    setAt_(row, idx.credBankName, p.credBankName || p.title || '');
    setAt_(row, idx.credUsername, p.credUsername || '');
    setAt_(row, idx.credLoginPassword, p.credLoginPassword || '');
    setAt_(row, idx.credTPassOrPin, p.credTPassOrPin || '');
    setAt_(row, idx.credChannel, p.credChannel || '');
    setAt_(row, idx.credCardPin, p.credCardPin || '');
    setAt_(row, idx.credStatus, p.credStatus || '');
  } else if (type === 'id_card') {
    setAt_(row, idx.idType, p.idType || '');
    setAt_(row, idx.idNumber, p.idNumber || '');
    setAt_(row, idx.idName, p.idName || '');
    setAt_(row, idx.validFrom, p.validFrom || '');
    setAt_(row, idx.validTo, p.validTo || '');
  } else if (type === 'card') {
    setAt_(row, idx.cardLabel, p.cardLabel || '');
    setAt_(row, idx.cardNumber, p.cardNumber || '');
    setAt_(row, idx.cardExpiry, p.cardExpiry || '');
    setAt_(row, idx.cardCvv, p.cardCvv || '');
    setAt_(row, idx.cardHolder, p.cardHolder || '');
  }

  sh.appendRow(row);
  return { success: true, id: id };
}

function listWalletEntries_() {
  const rows = [];

  Object.keys(SHEET_CONFIG).forEach(function(type) {
    const cfg = SHEET_CONFIG[type];
    const sh = getOrCreateSheet_(cfg.sheetName, cfg.headers);
    rows.push.apply(rows, mapSheetRows_(sh));
  });

  // Keep existing data visible if legacy single-sheet data exists.
  const legacy = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(LEGACY_SHEET_NAME);
  if (legacy) rows.push.apply(rows, mapSheetRows_(legacy));

  rows.sort(function(a, b) {
    return String(b.savedAt || '').localeCompare(String(a.savedAt || ''));
  });

  return { success: true, data: rows };
}

function deleteWalletEntry_(id) {
  if (!id) return { success: false, message: 'Missing id' };

  const sheetNames = [
    SHEET_CONFIG.credential.sheetName,
    SHEET_CONFIG.id_card.sheetName,
    SHEET_CONFIG.card.sheetName,
    LEGACY_SHEET_NAME
  ];

  for (let s = 0; s < sheetNames.length; s++) {
    const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(sheetNames[s]);
    if (!sh || sh.getLastRow() <= 1) continue;

    const values = sh.getDataRange().getValues();
    const idCol = indexMap_(values[0]).id;
    if (idCol === undefined) continue;

    for (let i = 1; i < values.length; i++) {
      if (String(values[i][idCol]) === String(id)) {
        sh.deleteRow(i + 1);
        return { success: true };
      }
    }
  }

  return { success: false, message: 'Record not found' };
}

function getOrCreateSheet_(sheetName, headers) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(sheetName) || ss.insertSheet(sheetName);
  if (sh.getLastRow() === 0) sh.appendRow(headers);
  else ensureHeaders_(sh, headers);
  return sh;
}

function ensureHeaders_(sh, headers) {
  const existing = sh.getRange(1, 1, 1, sh.getLastColumn()).getValues()[0].map(String);
  const missing = headers.filter(function(h) { return existing.indexOf(h) === -1; });
  if (missing.length === 0) return;
  sh.getRange(1, existing.length + 1, 1, missing.length).setValues([missing]);
}

function mapSheetRows_(sh) {
  const values = sh.getDataRange().getValues();
  if (values.length <= 1) return [];
  const idx = indexMap_(values[0]);

  return values.slice(1).map(function(r) {
    return {
      id: valueAt_(r, idx.id),
      owner: valueAt_(r, idx.owner),
      type: valueAt_(r, idx.type),
      title: valueAt_(r, idx.title),
      textValue: valueAt_(r, idx.textValue),
      idType: valueAt_(r, idx.idType),
      idNumber: valueAt_(r, idx.idNumber),
      idName: valueAt_(r, idx.idName),
      validFrom: valueAt_(r, idx.validFrom),
      validTo: valueAt_(r, idx.validTo),
      cardLabel: valueAt_(r, idx.cardLabel),
      cardNumber: valueAt_(r, idx.cardNumber),
      cardExpiry: valueAt_(r, idx.cardExpiry),
      cardCvv: valueAt_(r, idx.cardCvv),
      cardHolder: valueAt_(r, idx.cardHolder),
      savedAt: valueAt_(r, idx.savedAt),
      credBankName: valueAt_(r, idx.credBankName),
      credUsername: valueAt_(r, idx.credUsername),
      credLoginPassword: valueAt_(r, idx.credLoginPassword),
      credTPassOrPin: valueAt_(r, idx.credTPassOrPin),
      credChannel: valueAt_(r, idx.credChannel),
      credCardPin: valueAt_(r, idx.credCardPin),
      credStatus: valueAt_(r, idx.credStatus)
    };
  });
}

function indexMap_(header) {
  const map = {};
  header.forEach(function(name, i) {
    map[String(name)] = i;
  });
  return map;
}

function valueAt_(row, idx) {
  if (idx === undefined || idx < 0) return '';
  return row[idx] === undefined || row[idx] === null ? '' : row[idx];
}

function setAt_(row, idx, val) {
  if (idx === undefined || idx < 0) return;
  row[idx] = val;
}

function json(obj) {
  return ContentService
    .createTextOutput(JSON.stringify(obj))
    .setMimeType(ContentService.MimeType.JSON);
}
