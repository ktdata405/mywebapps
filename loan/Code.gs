// This code should be pasted into the Google Apps Script editor associated with your Google Sheet.

const SHEET_NAME = 'Loan Details';

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
    }

    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Invalid action' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function getSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    // Initialize with new headers
    sheet.appendRow(['ID', 'Date', 'Name', 'Amount', 'Interest Rate', 'Tenure', 'Type', 'Status', 'Remarks', 'Timestamp']);
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
  const sheet = getSheet();
  const headerMap = getHeaderMap(sheet);

  const timestamp = new Date();
  const id = Utilities.getUuid();
  const status = data.status || 'Active';

  if (headerMap['ID'] === undefined) {
     sheet.appendRow([
       data.date,
       data.name,
       data.amount,
       data.interestRate,
       data.tenure || '',
       data.type,
       data.remarks || '',
       timestamp
     ]);
  } else {
     const lastCol = sheet.getLastColumn();
     const row = new Array(lastCol).fill('');

     const setVal = (header, val) => {
        if (headerMap[header] !== undefined) row[headerMap[header]] = val;
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
  }

  return ContentService.createTextOutput(JSON.stringify({ status: 'success', message: 'Loan added successfully' }))
    .setMimeType(ContentService.MimeType.JSON);
}

function updateLoan(data) {
  const sheet = getSheet();
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
  const sheet = getSheet();
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
  const sheet = getSheet();
  const data = sheet.getDataRange().getValues();

  if (data.length < 2) {
    return ContentService.createTextOutput(JSON.stringify({ status: 'success', data: [] })).setMimeType(ContentService.MimeType.JSON);
  }

  const headers = data.shift();
  const headerMap = {};
  headers.forEach((h, i) => headerMap[h.toString().trim()] = i);

  const loans = data.map(row => {
    return {
      id: headerMap['ID'] !== undefined ? row[headerMap['ID']] : ('temp_' + Math.random().toString(36).substr(2, 9)),
      date: headerMap['Date'] !== undefined ? row[headerMap['Date']] : '',
      name: headerMap['Name'] !== undefined ? row[headerMap['Name']] : '',
      amount: headerMap['Amount'] !== undefined ? row[headerMap['Amount']] : 0,
      interestRate: headerMap['Interest Rate'] !== undefined ? row[headerMap['Interest Rate']] : 0,
      tenure: headerMap['Tenure'] !== undefined ? row[headerMap['Tenure']] : '',
      type: headerMap['Type'] !== undefined ? row[headerMap['Type']] : '',
      status: headerMap['Status'] !== undefined ? row[headerMap['Status']] : 'Active',
      remarks: headerMap['Remarks'] !== undefined ? row[headerMap['Remarks']] : '',
      timestamp: headerMap['Timestamp'] !== undefined ? row[headerMap['Timestamp']] : ''
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
