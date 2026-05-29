const SHEET_NAME = 'Debts';
const HEADERS = ['ID', 'Date', 'Type', 'Person', 'Amount', 'Remarks', 'Status', 'Settle Remarks'];
const MAX_ID = 100000;
// Optional: set this if the script is deployed as a standalone project.
const SPREADSHEET_ID = '';

function doGet(e) {
  try {
    const action = (e && e.parameter && e.parameter.action) || 'list';
    if (action === 'list') {
      return jsonResponse({ success: true, data: getAllDebts() });
    }

    if (action === 'getDebt') {
      const debt = getDebtById(e.parameter.id);
      if (!debt) return jsonResponse({ success: false, message: 'Debt record not found' });
      return jsonResponse({ success: true, data: debt });
    }

    if (action === 'addDebt') {
      const savedDebt = addDebt(e.parameter || {});
      return jsonResponse({ success: true, debt: savedDebt });
    }

    if (action === 'updateDebt') {
      updateDebt(e.parameter || {});
      return jsonResponse({ success: true });
    }

    if (action === 'updateStatus') {
      updateDebtStatus(e.parameter.id, e.parameter.status, e.parameter.settleRemarks || e.parameter.remarks);
      return jsonResponse({ success: true });
    }

    if (action === 'deleteDebt') {
      deleteDebt(e.parameter.id);
      return jsonResponse({ success: true });
    }

    return jsonResponse({ success: false, message: 'Invalid action' });
  } catch (error) {
    return jsonResponse({ success: false, message: error.message });
  }
}

function doPost(e) {
  try {
    const payload = parseRequestBody(e);
    const action = payload.action || 'syncAll';

    if (action === 'syncAll') {
      if (!Array.isArray(payload.debts)) {
        throw new Error('debts array is required for syncAll');
      }
      syncAllDebts(payload.debts);
      return jsonResponse({ success: true, count: payload.debts.length });
    }

    if (action === 'addDebt') {
      const savedDebt = addDebt(payload.debt || {});
      return jsonResponse({ success: true, debt: savedDebt });
    }

    if (action === 'updateStatus') {
      updateDebtStatus(payload.id, payload.status, payload.settleRemarks || payload.remarks);
      return jsonResponse({ success: true });
    }

    if (action === 'updateDebt') {
      updateDebt(payload.debt || {});
      return jsonResponse({ success: true });
    }

    if (action === 'deleteDebt') {
      deleteDebt(payload.id);
      return jsonResponse({ success: true });
    }

    if (action === 'clearAll') {
      syncAllDebts([]);
      return jsonResponse({ success: true });
    }

    return jsonResponse({ success: false, message: 'Invalid action' });
  } catch (error) {
    return jsonResponse({ success: false, message: error.message });
  }
}

function getAllDebts() {
  const sheet = getOrCreateSheet();
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return [];
  }

  const values = sheet.getRange(2, 1, lastRow - 1, HEADERS.length).getValues();
  return values
    .map(function(row) {
      return {
        id: Number(row[0]) || '',
        date: normalizeDateValue(row[1]),
        type: normalizeType(row[2]),
        person: String(row[3] || ''),
        amount: Number(row[4]) || 0,
        remarks: String(row[5] || ''),
        status: normalizeStatus(row[6]),
        settleRemarks: String(row[7] || '')
      };
    })
    .filter(function(item) {
      return item.id !== '' && item.id !== null;
    });
}

function syncAllDebts(debts) {
  const sheet = getOrCreateSheet();

  const lastRow = sheet.getLastRow();
  if (lastRow > 1) {
    sheet.getRange(2, 1, lastRow - 1, HEADERS.length).clearContent();
  }

  if (!debts.length) {
    return;
  }

  var usedIds = {};
  var nextId = 1;
  const rows = debts.map(function(item) {
    const debt = sanitizeDebt(item);
    if (!debt.id || usedIds[debt.id]) {
      debt.id = getNextAvailableIdFromMap(usedIds, nextId);
      nextId = debt.id + 1;
    }
    usedIds[debt.id] = true;

    return [
      debt.id,
      debt.date,
      debt.type,
      debt.person,
      debt.amount,
      debt.remarks,
      debt.status,
      debt.settleRemarks
    ];
  });

  sheet.getRange(2, 1, rows.length, HEADERS.length).setValues(rows);
  applyColumnFormats(sheet, rows.length + 1);
}

function addDebt(input) {
  const sheet = getOrCreateSheet();
  const debt = sanitizeDebt(input);

  if (!debt.id) {
    debt.id = getNextDebtId(sheet);
  }

  sheet.appendRow([
    debt.id,
    debt.date,
    debt.type,
    debt.person,
    debt.amount,
    debt.remarks,
    debt.status,
    debt.settleRemarks
  ]);

  applyColumnFormats(sheet, sheet.getLastRow());

  return debt;
}

function getDebtById(id) {
  const sheet = getOrCreateSheet();
  const rowIndex = findDebtRowById(sheet, id);
  if (rowIndex < 0) return null;
  const row = sheet.getRange(rowIndex, 1, 1, HEADERS.length).getValues()[0];
  return {
    id: Number(row[0]) || '',
    date: normalizeDateValue(row[1]),
    type: normalizeType(row[2]),
    person: String(row[3] || ''),
    amount: Number(row[4]) || 0,
    remarks: String(row[5] || ''),
    status: normalizeStatus(row[6]),
    settleRemarks: String(row[7] || '')
  };
}

function updateDebtStatus(id, status, remarks) {
  const sheet = getOrCreateSheet();
  const rowIndex = findDebtRowById(sheet, id);
  if (rowIndex < 0) {
    throw new Error('Debt record not found');
  }
  sheet.getRange(rowIndex, 7).setValue(normalizeStatus(status));
  if (remarks !== undefined && remarks !== null && String(remarks).trim() !== '') {
    sheet.getRange(rowIndex, 8).setValue(String(remarks).trim());
  }
}

function updateDebt(input) {
  const sheet = getOrCreateSheet();
  const debt = sanitizeDebt(input);
  const rowIndex = findDebtRowById(sheet, debt.id);
  if (rowIndex < 0) {
    throw new Error('Debt record not found for update');
  }
  sheet.getRange(rowIndex, 1, 1, HEADERS.length).setValues([[
    debt.id, debt.date, debt.type, debt.person, debt.amount, debt.remarks, debt.status, debt.settleRemarks
  ]]);
  applyColumnFormats(sheet, rowIndex);
}

function deleteDebt(id) {
  const sheet = getOrCreateSheet();
  const rowIndex = findDebtRowById(sheet, id);
  if (rowIndex < 0) {
    throw new Error('Debt record not found');
  }

  sheet.deleteRow(rowIndex);
}

function findDebtRowById(sheet, id) {
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return -1;
  }

  const values = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
  const needle = String(id);

  for (var i = 0; i < values.length; i++) {
    if (String(values[i][0]) === needle) {
      return i + 2;
    }
  }

  return -1;
}

function sanitizeDebt(input) {
  var parsedId = Number(input.id);

  return {
    id: isFinite(parsedId) && parsedId >= 1 && parsedId <= MAX_ID ? Math.floor(parsedId) : null,
    date: normalizeDateValue(input.date),
    type: normalizeType(input.type),
    person: String(input.person || '').trim(),
    amount: Number(input.amount) || 0,
    remarks: String(input.remarks || input.notes || ''),
    status: normalizeStatus(input.status),
    settleRemarks: String(input.settleRemarks || '').trim()
  };
}

function normalizeDateValue(value) {
  var date = parseDateInput(value);
  if (date) {
    return Utilities.formatDate(date, Session.getScriptTimeZone(), 'dd/MMM/yyyy');
  }

  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return Utilities.formatDate(value, Session.getScriptTimeZone(), 'dd/MMM/yyyy');
  }
  return '';
}

function parseDateInput(value) {
  if (Object.prototype.toString.call(value) === '[object Date]' && !isNaN(value.getTime())) {
    return value;
  }

  var str = String(value || '').trim();
  if (!str) return null;

  var ymd = str.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (ymd) {
    return new Date(Number(ymd[1]), Number(ymd[2]) - 1, Number(ymd[3]));
  }

  var dmy = str.match(/^(\d{2})\/(\w{3})\/(\d{4})$/i);
  if (dmy) {
    var months = {
      jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
      jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11
    };
    var monthIndex = months[dmy[2].toLowerCase()];
    if (monthIndex === undefined) return null;
    return new Date(Number(dmy[3]), monthIndex, Number(dmy[1]));
  }

  var parsed = new Date(str);
  return isNaN(parsed.getTime()) ? null : parsed;
}

function normalizeType(typeValue) {
  var value = String(typeValue || '').toLowerCase();
  if (value === 'taken' || value === 'borrowed') return 'Taken';
  return 'Given';
}

function normalizeStatus(statusValue) {
  var value = String(statusValue || '').toLowerCase();
  if (value === 'paid' || value === 'settled') return 'Paid';
  return 'Unpaid';
}

function getOrCreateSheet() {
  const spreadsheet = getSpreadsheet_();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  } else if (sheet.getLastRow() === 0) {
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
    sheet.setFrozenRows(1);
  } else {
    migrateIfNeeded(sheet);
  }

  applyColumnFormats(sheet, sheet.getLastRow());
  sheet.autoResizeColumns(1, HEADERS.length);

  return sheet;
}

function getSpreadsheet_() {
  if (SPREADSHEET_ID) {
    return SpreadsheetApp.openById(SPREADSHEET_ID);
  }

  const active = SpreadsheetApp.getActiveSpreadsheet();
  if (!active) {
    throw new Error('No active spreadsheet found. Set SPREADSHEET_ID in debts_google_apps_script.js.');
  }
  return active;
}

function migrateIfNeeded(sheet) {
  var lastCol = Math.max(sheet.getLastColumn(), HEADERS.length);
  var headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  var existingHeaders = headerRow.slice(0, HEADERS.length).map(function(h) { return String(h || '').trim(); });
  var isNewSchema = HEADERS.every(function(header, i) { return existingHeaders[i] === header; });
  if (isNewSchema) return;

  var lastRow = sheet.getLastRow();
  var rows = [];
  if (lastRow > 1) {
    var oldRows = sheet.getRange(2, 1, lastRow - 1, lastCol).getValues();
    rows = oldRows.map(function(row) {
      var converted = sanitizeDebt({
        id: row[0],
        date: row[4] || row[1],
        type: row[1],
        person: row[2] || row[3],
        amount: row[3] || row[4],
        remarks: row[5],
        notes: row[5],
        status: row[6],
        settleRemarks: row[7]
      });
      if (!converted.id) {
        converted.id = null;
      }
      return converted;
    }).filter(function(item) { return item.person || item.amount || item.date; });
  }

  sheet.clearContents();
  sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  sheet.setFrozenRows(1);

  if (rows.length) {
    var usedIds = {};
    var nextId = 1;
    var values = rows.map(function(item) {
      if (!item.id || usedIds[item.id]) {
        item.id = getNextAvailableIdFromMap(usedIds, nextId);
        nextId = item.id + 1;
      }
      usedIds[item.id] = true;
      return [item.id, item.date, item.type, item.person, item.amount, item.remarks, item.status, item.settleRemarks];
    });
    sheet.getRange(2, 1, values.length, HEADERS.length).setValues(values);
  }
}

function getNextDebtId(sheet) {
  var lastRow = sheet.getLastRow();
  var used = {};
  if (lastRow > 1) {
    var ids = sheet.getRange(2, 1, lastRow - 1, 1).getValues();
    for (var i = 0; i < ids.length; i++) {
      var value = Number(ids[i][0]);
      if (isFinite(value) && value >= 1 && value <= MAX_ID) {
        used[Math.floor(value)] = true;
      }
    }
  }
  return getNextAvailableIdFromMap(used, 1);
}

function getNextAvailableIdFromMap(usedMap, startFrom) {
  var start = Math.max(1, Number(startFrom) || 1);
  for (var i = start; i <= MAX_ID; i++) {
    if (!usedMap[i]) return i;
  }
  for (var j = 1; j < start; j++) {
    if (!usedMap[j]) return j;
  }
  throw new Error('ID limit reached (1-100000). Clear old records to continue.');
}

function applyColumnFormats(sheet, lastRow) {
  if (lastRow < 2) return;
  sheet.getRange(2, 1, lastRow - 1, 1).setNumberFormat('0');
  sheet.getRange(2, 2, lastRow - 1, 1).setNumberFormat('dd/mmm/yyyy');
  sheet.getRange(2, 5, lastRow - 1, 1).setNumberFormat('#,##0.00');
}

function parseRequestBody(e) {
  if (!e || !e.postData || !e.postData.contents) {
    return {};
  }

  return JSON.parse(e.postData.contents);
}

function jsonResponse(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

