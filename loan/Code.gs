// This code should be pasted into the Google Apps Script editor associated with your Google Sheet.

const SHEET_NAME = 'Loan Details';
const TRANSACTION_SHEET_NAME = 'Transactions';

function doGet(e) {
  const action = e.parameter.action;

  if (action === 'getLoans') {
    return getLoans();
  } else if (action === 'getRepaymentStatus') {
    return getRepaymentStatus(e);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid action' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const action = data.action;

    if (action === 'addLoan') {
      return addLoan(data);
    } else if (action === 'updateLoan') {
      return updateLoan(data);
    } else if (action === 'deleteLoan') {
      return deleteLoan(data);
    } else if (action === 'getRepaymentStatus') {
      return getRepaymentStatus(data);
    } else if (action === 'updateRepaymentStatus') {
      return updateRepaymentStatus(data);
    } else if (action === 'addTransaction') {
      return addTransaction(data);
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid action' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheet(sheetName) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    if (sheetName === SHEET_NAME) {
      sheet.appendRow(['ID', 'Date', 'Name', 'Amount', 'Interest Rate', 'Tenure', 'Type', 'Status', 'Remarks', 'Timestamp']);
    } else if (sheetName === TRANSACTION_SHEET_NAME) {
      sheet.appendRow(['Transaction ID', 'Loan ID', 'Date', 'Amount', 'Type', 'Remarks', 'Timestamp']);
    }
  }
  return sheet;
}

function getRepaymentSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName('RepaymentStatus');
  if (!sheet) {
    sheet = ss.insertSheet('RepaymentStatus');
    sheet.appendRow(['LoanID', 'Year', 'Month', 'Status']);
  }
  return sheet;
}

function getHeaderMap(sheet) {
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  const map = {};
  headers.forEach((header, index) => {
    map[header.toString().trim()] = index;
  });
  return map;
}

function addLoan(data) {
  const sheet = getSheet(SHEET_NAME);
  const headerMap = getHeaderMap(sheet);

  const timestamp = new Date();
  const id = Utilities.getUuid();
  const status = data.status || 'Active';

  const lastCol = sheet.getLastColumn();
  const row = new Array(lastCol).fill('');

  const setVal = (header, val) => {
    if (headerMap[header] !== undefined) {
      row[headerMap[header]] = val;
    }
  };

  setVal('ID', id);
  setVal('Date', data.date);
  setVal('Name', data.name);
  setVal('Amount', data.amount);
  setVal('Interest Rate', data.interestRate);
  setVal('Tenure', data.tenure || '');
  setVal('Type', data.type);
  setVal('Status', status);
  setVal('Remarks', data.remarks || '');
  setVal('Timestamp', timestamp);

  sheet.appendRow(row);

  return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Loan added successfully' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function addTransaction(data) {
  const sheet = getSheet(TRANSACTION_SHEET_NAME);
  const timestamp = new Date();
  const transactionId = Utilities.getUuid();

  sheet.appendRow([
    transactionId,
    data.loanId,
    data.date,
    data.amount,
    data.type,
    data.remarks || '',
    timestamp
  ]);

  // If it's a full settlement, update the loan status to "Closed"
  if (data.type === 'Full Settlement') {
    const loanSheet = getSheet(SHEET_NAME);
    const headerMap = getHeaderMap(loanSheet);
    const idIndex = headerMap['ID'];
    const statusIndex = headerMap['Status'];
    const dataRange = loanSheet.getDataRange();
    const values = dataRange.getValues();

    for (let i = 1; i < values.length; i++) {
      if (values[i][idIndex] === data.loanId) {
        loanSheet.getRange(i + 1, statusIndex + 1).setValue('Closed');
        break;
      }
    }
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Transaction added successfully' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function updateLoan(data) {
  const sheet = getSheet(SHEET_NAME);
  const headerMap = getHeaderMap(sheet);

  if (headerMap['ID'] === undefined) {
     return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Sheet does not support ID-based updates. Please add an ID column.' })).setMimeType(ContentService.MimeType.JSON);
  }

  const id = data.id;
  if (!id) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Missing ID' })).setMimeType(ContentService.MimeType.JSON);

  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const idIndex = headerMap['ID'];

  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (values[i][idIndex] === id) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Loan not found' })).setMimeType(ContentService.MimeType.JSON);
  }

  const updateVal = (header, val) => {
    if (headerMap[header] !== undefined && val !== undefined) {
      sheet.getRange(rowIndex, headerMap[header] + 1).setValue(val);
    }
  };

  updateVal('Date', data.date);
  updateVal('Name', data.name);
  updateVal('Amount', data.amount);
  updateVal('Interest Rate', data.interestRate);
  updateVal('Tenure', data.tenure);
  updateVal('Type', data.type);
  updateVal('Status', data.status);
  updateVal('Remarks', data.remarks);

  return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Loan updated successfully' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function deleteLoan(data) {
  const sheet = getSheet(SHEET_NAME);
  const headerMap = getHeaderMap(sheet);

  if (headerMap['ID'] === undefined) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Sheet incompatible' })).setMimeType(ContentService.MimeType.JSON);

  const id = data.id;
  const dataRange = sheet.getDataRange();
  const values = dataRange.getValues();
  const idIndex = headerMap['ID'];

  let rowIndex = -1;
  for (let i = 1; i < values.length; i++) {
    if (values[i][idIndex] === id) {
      rowIndex = i + 1;
      break;
    }
  }

  if (rowIndex === -1) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Loan not found' })).setMimeType(ContentService.MimeType.JSON);

  sheet.deleteRow(rowIndex);
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Loan deleted successfully' })).setMimeType(ContentService.MimeType.JSON);
}

function getLoans() {
  const loanSheet = getSheet(SHEET_NAME);
  const loanData = loanSheet.getDataRange().getValues();

  if (loanData.length < 2) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: [] })).setMimeType(ContentService.MimeType.JSON);
  }

  const loanHeaders = loanData.shift();
  const loanHeaderMap = {};
  loanHeaders.forEach((h, i) => loanHeaderMap[h.toString().trim()] = i);

  // Get all transactions and calculate total paid for each loan
  const transactionSheet = getSheet(TRANSACTION_SHEET_NAME);
  const transactionData = transactionSheet.getDataRange().getValues();
  const paidAmounts = {};
  if (transactionData.length > 1) {
    const transactionHeaders = transactionData.shift();
    const transHeaderMap = {};
    transactionHeaders.forEach((h, i) => transHeaderMap[h.toString().trim()] = i);
    const loanIdIndex = transHeaderMap['Loan ID'];
    const amountIndex = transHeaderMap['Amount'];

    transactionData.forEach(row => {
      const loanId = row[loanIdIndex];
      const amount = parseFloat(row[amountIndex]) || 0;
      if (loanId) {
        paidAmounts[loanId] = (paidAmounts[loanId] || 0) + amount;
      }
    });
  }

  const loans = loanData.map(row => {
    const loanId = row[loanHeaderMap['ID']];
    return {
      id: loanId,
      date: row[loanHeaderMap['Date']] || '',
      name: row[loanHeaderMap['Name']] || '',
      amount: row[loanHeaderMap['Amount']] || 0,
      interestRate: row[loanHeaderMap['Interest Rate']] || 0,
      tenure: row[loanHeaderMap['Tenure']] || '',
      type: row[loanHeaderMap['Type']] || '',
      status: row[loanHeaderMap['Status']] || 'Active',
      remarks: row[loanHeaderMap['Remarks']] || '',
      timestamp: row[loanHeaderMap['Timestamp']] || '',
      paid: paidAmounts[loanId] || 0 // Add the paid amount
    };
  });

  return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: loans }))
    .setMimeType(ContentService.MimeType.JSON);
}

function getRepaymentStatus(eOrData) {
  // Handle both event object (from doGet) and data object (from doPost)
  var loanId = eOrData.loanId || (eOrData.parameter && eOrData.parameter.loanId);

  var sheet = getRepaymentSheet();
  var data = sheet.getDataRange().getValues();
  var result = [];
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(loanId)) {
      result.push({
        year: data[i][1],
        month: data[i][2],
        status: data[i][3]
      });
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: result })).setMimeType(ContentService.MimeType.JSON);
}

function updateRepaymentStatus(data) {
  // Expects data object directly
  var loanId = data.loanId;
  var year = data.year;
  var month = data.month;
  var status = data.status;

  var sheet = getRepaymentSheet();
  var range = sheet.getDataRange();
  var values = range.getValues();
  var found = false;

  for (var i = 1; i < values.length; i++) {
    if (String(values[i][0]) === String(loanId) && String(values[i][1]) === String(year) && String(values[i][2]) === String(month)) {
      sheet.getRange(i+1, 4).setValue(status);
      found = true;
      break;
    }
  }

  if (!found) {
    sheet.appendRow([loanId, year, month, status]);
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'success' })).setMimeType(ContentService.MimeType.JSON);
}
