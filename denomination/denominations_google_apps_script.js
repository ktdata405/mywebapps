// Google Apps Script Code for Cash Counter
// Create a new Google Sheet, go to Extensions > Apps Script, and paste this code.
// Publish > Deploy as web app > Execute as: Me > Who has access: Anyone.

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var sheetName = 'Offerings'; // Ensure this matches your sheet name
    var sheet = doc.getSheetByName(sheetName);

    if (!sheet) {
      sheet = doc.insertSheet(sheetName);
      // Add headers including the new fields
      sheet.appendRow(['Date', '500', '200', '100', '50', '20', '10', '5', '2', '1', 'Total', 'Week Expenses', 'Adjust Amount', 'ATM Withdrawal', 'A/C Paid', 'Remarks']);
      sheet.getRange(1, 1, 1, 16).setFontWeight('bold').setBackground('#e0f2f1'); // Light teal background
    }

    var data = JSON.parse(e.postData.contents);

    // Prepare the row data
    var row = [
      data.date,
      data.d500 || 0,
      data.d200 || 0,
      data.d100 || 0,
      data.d50 || 0,
      data.d20 || 0,
      data.d10 || 0,
      data.d5 || 0,
      data.d2 || 0,
      data.d1 || 0,
      data.total || 0,
      data.weekExpenses || 0,   // New Field: Week Expenses
      data.adjustAmount || 0,   // New Field: Adjust Amount
      data.atmWithdrawal || 0,  // New Field: ATM Withdrawal
      data.acPaid || 0,         // New Field: A/C Paid
      data.remarks || ''        // New Field: Remarks
    ];

    if (data.action === 'update' && data.rowIndex) {
      var rowIndex = parseInt(data.rowIndex);
      if (rowIndex > 1 && rowIndex <= sheet.getLastRow()) {
        sheet.getRange(rowIndex, 1, 1, row.length).setValues([row]);
        return ContentService.createTextOutput(JSON.stringify({ 'result': 'success', 'row': row, 'action': 'update' }))
            .setMimeType(ContentService.MimeType.JSON);
      } else {
        return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'error': 'Invalid rowIndex' }))
            .setMimeType(ContentService.MimeType.JSON);
      }
    } else {
      // Append the row
      sheet.appendRow(row);
      return ContentService.createTextOutput(JSON.stringify({ 'result': 'success', 'row': row, 'action': 'append' }))
          .setMimeType(ContentService.MimeType.JSON);
    }

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

    // 1. Prepare Sheet2 Lookup (Date -> Week Closing Balance)
    var sheet2 = doc.getSheetByName('Dashboard');
    var closingBalanceMap = {};
    var sheet2Data = null;

    if (sheet2) {
      // Existing: Get Available Balance from A1
      sheet2Data = sheet2.getRange("G1").getValue();

      // New: Build lookup map from Sheet2 (Date in Col A, Balance in Col C)
      var lastRow = sheet2.getLastRow();
      if (lastRow > 0) {
        // Get data from columns A, B, C (1, 2, 3)
        var range = sheet2.getRange(1, 1, lastRow, 3);
        var values = range.getValues();

        for (var i = 0; i < values.length; i++) {
          var row = values[i];
          var dateVal = row[0]; // Column A
          var balance = row[2]; // Column C

          if (dateVal) {
            var dateKey = formatDateKey(dateVal);
            closingBalanceMap[dateKey] = balance;
          }
        }
      }
    }

    // 2. Get Data from Main Sheet (CashCounter)
    var sheetName = 'Offerings';
    var sheet = doc.getSheetByName(sheetName);
    var result = [];

    if (sheet) {
      var data = sheet.getDataRange().getValues();
      if (data.length > 1) {
        var headers = data[0];
        var rows = data.slice(1);

        // Convert to array of objects
        result = rows.map(function(row, index) {
          var obj = {};
          headers.forEach(function(header, colIndex) {
            obj[header] = row[colIndex];
          });

          obj['rowIndex'] = index + 2; // Store 1-based row index

          // Inject Week Closing Balance based on Date
          var rowDate = row[0]; // Assuming Date is first column
          var dateKey = formatDateKey(rowDate);

          // Use the looked-up value, or 0 if not found
          obj['Week Closing Balance'] = closingBalanceMap[dateKey] || 0;

          return obj;
        });

        // Reverse to show latest first
        result.reverse();
      }
    }

    // 3. Return both sets of data
    var responsePayload = {
      reports: result,
      sheet2Data: sheet2Data
    };

    return ContentService.createTextOutput(JSON.stringify(responsePayload))
        .setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'error': e.toString() }))
        .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}

function formatDateKey(date) {
  if (date instanceof Date) {
    return Utilities.formatDate(date, Session.getScriptTimeZone(), "dd/MMM/YYYY");
  }
  return date;
}