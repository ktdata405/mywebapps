// Google Apps Script for monthly repayment status tracking
// Sheet: RepaymentStatus (columns: LoanID, Year, Month, Status)

function getRepaymentStatus(e) {
  var loanId = e.parameter.loanId;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('RepaymentStatus');
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Sheet not found' })).setMimeType(ContentService.MimeType.JSON);
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

function updateRepaymentStatus(e) {
  var loanId = e.parameter.loanId;
  var year = e.parameter.year;
  var month = e.parameter.month;
  var status = e.parameter.status;
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('RepaymentStatus');
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ status: 'error', message: 'Sheet not found' })).setMimeType(ContentService.MimeType.JSON);
  var data = sheet.getDataRange().getValues();
  var found = false;
  for (var i = 1; i < data.length; i++) {
    if (String(data[i][0]) === String(loanId) && String(data[i][1]) === String(year) && String(data[i][2]) === String(month)) {
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

// Add to doGet/doPost dispatchers in Code.gs:
//   else if (action === 'getRepaymentStatus') return getRepaymentStatus(e);
//   else if (action === 'updateRepaymentStatus') return updateRepaymentStatus(e);

