// Google Apps Script Code for Cashew
// Create a new Google Sheet, go to Extensions > Apps Script, and paste this code.
// Publish > Deploy as web app > Execute as: Me > Who has access: Anyone.
// IMPORTANT: After updating this code, you must create a NEW deployment (Manage Deployments > New Version) for changes to take effect.

function doPost(e) {
  var lock = LockService.getScriptLock();
  lock.tryLock(10000);

  try {
    var doc = SpreadsheetApp.getActiveSpreadsheet();
    var timezone = doc.getSpreadsheetTimeZone(); // Use spreadsheet timezone

    var data = JSON.parse(e.postData.contents);

    // Check if the data is for Cashew
    if (data.type === 'cashew') {
      var expenses = data.expenses; // Array of expense objects
      
      // Handle Update: Delete old entries first
      if (data.action === 'update' && data.originalDate) {
         var originalParts = data.originalDate.split('/');
         if (originalParts.length === 3) {
             var originalSheetName = originalParts[1] + ' ' + originalParts[2];
             var originalSheet = doc.getSheetByName(originalSheetName);
             
             if (originalSheet) {
                 var range = originalSheet.getDataRange();
                 var values = range.getValues();
                 var rowsToDelete = [];
                 var currentDate = '';
                 
                 // Identify rows to delete
                 for (var r = 1; r < values.length; r++) { // Skip header
                     var rowDate = values[r][0];
                     
                     // If rowDate is present (not empty), it marks the start of a new entry/block
                     if (rowDate && String(rowDate).trim() !== "") {
                         var dateObj = null;
                         
                         if (rowDate instanceof Date) {
                             dateObj = rowDate;
                         } else {
                             var strVal = String(rowDate).trim();
                             // Check for direct string match first to avoid parsing issues
                             if (strVal === data.originalDate) {
                                 currentDate = strVal;
                                 dateObj = null; // Already handled
                             } else {
                                 // Try parsing
                                 var parsed = new Date(strVal);
                                 if (!isNaN(parsed.getTime())) {
                                     dateObj = parsed;
                                 } else {
                                     currentDate = strVal; // Use as is
                                 }
                             }
                         }
                         
                         if (dateObj) {
                             currentDate = Utilities.formatDate(dateObj, timezone, "dd/MMM/yyyy");
                         }
                     }
                     
                     // Check if the current row belongs to the date we want to delete
                     if (currentDate === data.originalDate) {
                         rowsToDelete.push(r + 1); // Store 1-based row index
                     }
                 }
                 
                 // Delete rows from bottom up
                 if (rowsToDelete.length > 0) {
                     // Sort descending to avoid index shifting issues
                     rowsToDelete.sort(function(a, b){return b-a});
                     
                     for (var i = 0; i < rowsToDelete.length; i++) {
                         originalSheet.deleteRow(rowsToDelete[i]);
                     }
                 }
             }
         }
      }

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
    var timezone = doc.getSpreadsheetTimeZone(); // Use spreadsheet timezone
    
    // Check if we need to fetch all data
    if (e.parameter.fetchAll === 'true') {
        var allExpenses = [];
        var totalAvailableBalance = 0;
        var monthlyBalances = {};
        var sheets = doc.getSheets();
        
        // Iterate through all sheets
        for (var s = 0; s < sheets.length; s++) {
            var sheet = sheets[s];
            var sheetName = sheet.getName();
            
            // Skip sheets that don't look like month/year sheets (e.g., "Jan 2024")
            // Simple regex check: 3 letters space 4 digits
            if (!sheetName.match(/^[A-Z][a-z]{2} \d{4}$/)) {
                continue;
            }
            
            var data = sheet.getDataRange().getValues();
            var sheetBalance = 0;
            
            // Accumulate Available Balance from E1 (Row 0, Col 4)
            if (data.length > 0 && data[0].length > 4) {
                var balance = data[0][4];
                if (typeof balance === 'number') {
                    sheetBalance = balance;
                } else {
                    sheetBalance = parseFloat(balance) || 0;
                }
            }
            totalAvailableBalance += sheetBalance;
            monthlyBalances[sheetName] = sheetBalance;

            var lastDate = '';
            
            // Skip header row (index 0)
            for (var i = 1; i < data.length; i++) {
                var row = data[i];
                // Skip empty rows (if any)
                if (!row[1] && !row[2] && !row[3]) continue;

                var date = row[0];
                if (date) {
                    // Format date to dd/MMM/yyyy if it's a Date object
                    if (date instanceof Date) {
                        date = Utilities.formatDate(date, timezone, "dd/MMM/yyyy");
                    }
                    lastDate = date;
                } else {
                    date = lastDate; // Fill in missing date from previous row
                }

                // Check if amount is a number
                var amount = parseFloat(row[3]);
                if (isNaN(amount)) amount = 0;

                allExpenses.push({
                    date: date,
                    category: row[1],
                    description: row[2],
                    amount: amount
                });
            }
        }
        
        return ContentService.createTextOutput(JSON.stringify({
            data: allExpenses,
            availableBalance: totalAvailableBalance,
            monthlyBalances: monthlyBalances
        })).setMimeType(ContentService.MimeType.JSON);
    }

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
        // Format date to dd/MMM/yyyy if it's a Date object
        if (date instanceof Date) {
            date = Utilities.formatDate(date, timezone, "dd/MMM/yyyy");
        }
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