// Google Apps Script Code for Cash Counter
// Create a new Google Sheet, go to Extensions > Apps Script, and paste this code.
// Publish > Deploy as web app > Execute as: Me > Who has access: Anyone.

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var data = JSON.parse(e.postData.contents);

    // Determine Sheet Name from the date (e.g., "08/Jan/2026" -> "Jan 2026")
    var sheetName = 'Offerings'; // Default fallback
    if (data.date) {
      var parts = data.date.split('/');
      if (parts.length === 3) {
        sheetName = parts[1] + ' ' + parts[2];
      } else if (data.date.includes('-')) {
         // Handle YYYY-MM-DD format if passed directly
         var d = new Date(data.date);
         var months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
         sheetName = months[d.getMonth()] + ' ' + d.getFullYear();
      }
    }

    var sheet = doc.getSheetByName(sheetName);

    if (!sheet) {
      sheet = doc.insertSheet(sheetName);
      // Add headers including the new fields
      sheet.appendRow(['Date', '500', '200', '100', '50', '20', '10', '5', '2', '1', 'Total', 'Week Expenses', 'Adjust Amount', 'ATM Withdrawal', 'A/C Paid', 'Remarks']);
      sheet.getRange(1, 1, 1, 16).setFontWeight('bold').setBackground('#e0f2f1'); // Light teal background
    }

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
    var sheetName = e.parameter.sheetName;

    if (!sheetName) {
      // If no sheet name provided, try to default to current month or handle error
      // For now, let's return error or empty
       return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'message': 'Sheet name is required' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = doc.getSheetByName(sheetName);
    var result = [];
    var sheet2Data = null;

    // 1. Prepare Sheet2 Lookup (Date -> Week Closing Balance) - Optional if needed for report
    // Keeping it simple for now, focusing on fetching data from the specific monthly sheet

    if (sheet) {
      var data = sheet.getDataRange().getValues();
      if (data.length > 1) {
        var headers = data[0];
        var rows = data.slice(1);

        // Convert to array of objects
        result = rows.map(function(row, index) {
          var obj = {};
          headers.forEach(function(header, colIndex) {
            var val = row[colIndex];
            // Format Date if it's a date object
            if (header === 'Date' && val instanceof Date) {
               val = Utilities.formatDate(val, Session.getScriptTimeZone(), "dd/MMM/yyyy");
            }
            obj[header] = val;
          });

          obj['rowIndex'] = index + 2; // Store 1-based row index
          return obj;
        });
        
        // No reverse here, let client handle sorting if needed, or keep chronological
      }
    }

    // Return data
    var responsePayload = {
      data: result, // Changed key to 'data' to match client expectation
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