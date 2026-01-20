// Google Apps Script Code for Cashew
// Create a new Google Sheet, go to Extensions > Apps Script, and paste this code.
// Publish > Deploy as web app > Execute as: Me > Who has access: Anyone.

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();

    var data = JSON.parse(e.postData.contents);

    // Check if the data is for Cashew
    if (data.type === 'cashew') {
      var expenses = data.expenses; // Array of expense objects
      var rows = [];
      var lastDate = '';

      // Determine Sheet Name from the first expense date (e.g., "08/Jan/2026" -> "Jan 2026")
      var sheetName = 'Cashew'; // Default fallback
      if (expenses.length > 0 && expenses[0].date) {
        var parts = expenses[0].date.split('/');
        if (parts.length === 3) {
          sheetName = parts[1] + ' ' + parts[2];
        }
      }

      var sheet = doc.getSheetByName(sheetName);
      if (!sheet) {
        sheet = doc.insertSheet(sheetName);
        sheet.appendRow(['Date', 'Category', 'Description', 'Amount']);
        sheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#f3f4f6');
      }

      // Prepare rows for bulk insertion
      for (var i = 0; i < expenses.length; i++) {
        var expense = expenses[i];

        var displayDate = expense.date;
        if (displayDate === lastDate) {
          displayDate = '';
        } else {
          lastDate = displayDate;
        }

        rows.push([
          displayDate,         // Column A: Date
          expense.category,    // Column B: Category
          expense.description, // Column C: Description
          expense.amount       // Column D: Amount
        ]);
      }

      // Append all rows at once if there is data
      if (rows.length > 0) {
        var lastRow = sheet.getLastRow();
        var startRow = lastRow + 1;

        // Add 2 rows spacing if there is existing data (headers are row 1)
        if (lastRow > 1) {
          startRow += 2;
        }

        sheet.getRange(startRow, 1, rows.length, 4).setValues(rows);
      }

      return ContentService.createTextOutput(JSON.stringify({ 'result': 'success', 'count': rows.length }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Fallback if type is not cashew (or handle other types here)
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'message': 'Unknown data type' }))
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
    var sheetName = e.parameter.sheetName;

    if (!sheetName) {
      return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'message': 'Sheet name is required' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = doc.getSheetByName(sheetName);
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ data: [], availableBalance: 0 })) // Return empty structure if sheet not found
        .setMimeType(ContentService.MimeType.JSON);
    }

    // Get Available Balance from E1
    var availableBalance = sheet.getRange("E1").getValue();
    // Ensure it's a number
    if (typeof availableBalance !== 'number') {
        availableBalance = parseFloat(availableBalance) || 0;
    }

    var data = sheet.getDataRange().getValues();
    var expenses = [];
    var lastDate = '';

    // Skip header row (index 0)
    for (var i = 1; i < data.length; i++) {
      var row = data[i];
      // Skip empty rows (if any)
      if (!row[1] && !row[2] && !row[3]) continue;

      var date = row[0];
      if (date) {
        lastDate = date;
      } else {
        date = lastDate; // Fill in missing date from previous row
      }

      // Assuming columns are: Date, Category, Description, Amount
      // Check if amount is a number
      var amount = parseFloat(row[3]);
      if (isNaN(amount)) amount = 0;

      expenses.push({
        date: date,
        category: row[1],
        description: row[2],
        amount: amount
      });
    }

    return ContentService.createTextOutput(JSON.stringify({
        data: expenses,
        availableBalance: availableBalance
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (e) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'error': e.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  } finally {
    lock.releaseLock();
  }
}