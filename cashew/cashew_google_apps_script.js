// Google Apps Script Code for Cashew
// Create a new Google Sheet, go to Extensions > Apps Script, and paste this code.
// Publish > Deploy as web app > Execute as: Me > Who has access: Anyone.
// IMPORTANT: After updating this code, you must create a NEW deployment (Manage Deployments > New Version) for changes to take effect.

var SCHEDULED_SHEET_NAME = 'Scheduled';
var STATUS_COLUMN_INDEX_REGULAR = 6; // Column F (E is reserved for available balance in monthly sheets)
var STATUS_COLUMN_INDEX_SCHEDULED = 6; // Column F

function findHeaderColumnIndex(sheet, headerName) {
  var target = String(headerName || '').trim().toLowerCase();
  if (!target) return 0;
  var lastCol = Math.max(sheet.getLastColumn(), STATUS_COLUMN_INDEX_SCHEDULED);
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
  for (var i = 0; i < headers.length; i++) {
    if (String(headers[i] || '').trim().toLowerCase() === target) {
      return i + 1;
    }
  }
  return 0;
}

function ensureHeaderColumn(sheet, preferredColIndex, headerName) {
  var existingIndex = findHeaderColumnIndex(sheet, headerName);
  if (existingIndex > 0) return existingIndex;

  var colIndex = preferredColIndex || sheet.getLastColumn() + 1;
  sheet.getRange(1, colIndex).setValue(headerName);
  sheet.getRange(1, colIndex).setFontWeight('bold').setBackground('#f3f4f6');
  return colIndex;
}

function getSheetColumnMap(sheet, isScheduledSheet) {
  var statusCol = ensureHeaderColumn(
    sheet,
    isScheduledSheet ? STATUS_COLUMN_INDEX_SCHEDULED : STATUS_COLUMN_INDEX_REGULAR,
    'Status'
  );

  var repeatCol = 0;
  if (isScheduledSheet) {
    repeatCol = ensureHeaderColumn(sheet, 5, 'Repeat');
  }

  return {
    statusCol: statusCol,
    repeatCol: repeatCol
  };
}

function ensureSheetWithHeaders(doc, sheetName, includeRepeatColumn) {
  var sheet = doc.getSheetByName(sheetName);
  if (!sheet) {
    sheet = doc.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0) {
    if (includeRepeatColumn) {
      var scheduledHeaders = ['Date', 'Category', 'Description', 'Amount', 'Repeat', 'Status'];
      sheet.getRange(1, 1, 1, scheduledHeaders.length).setValues([scheduledHeaders]);
      sheet.getRange(1, 1, 1, scheduledHeaders.length).setFontWeight('bold').setBackground('#f3f4f6');
    } else {
      var regularHeaders = ['Date', 'Category', 'Description', 'Amount'];
      sheet.getRange(1, 1, 1, regularHeaders.length).setValues([regularHeaders]);
      sheet.getRange(1, 6).setValue('Status');
      sheet.getRange(1, 1, 1, 4).setFontWeight('bold').setBackground('#f3f4f6');
      sheet.getRange(1, 6).setFontWeight('bold').setBackground('#f3f4f6');
    }
  } else if (includeRepeatColumn) {
    ensureHeaderColumn(sheet, 5, 'Repeat');
    ensureHeaderColumn(sheet, STATUS_COLUMN_INDEX_SCHEDULED, 'Status');
    sheet.getRange(1, 1, 1, Math.max(sheet.getLastColumn(), STATUS_COLUMN_INDEX_SCHEDULED)).setFontWeight('bold').setBackground('#f3f4f6');
  } else {
    ensureHeaderColumn(sheet, STATUS_COLUMN_INDEX_REGULAR, 'Status');
    if (!String(sheet.getRange(1, 1).getValue() || '').trim()) sheet.getRange(1, 1).setValue('Date');
    if (!String(sheet.getRange(1, 2).getValue() || '').trim()) sheet.getRange(1, 2).setValue('Category');
    if (!String(sheet.getRange(1, 3).getValue() || '').trim()) sheet.getRange(1, 3).setValue('Description');
    if (!String(sheet.getRange(1, 4).getValue() || '').trim()) sheet.getRange(1, 4).setValue('Amount');
  }

  return sheet;
}

function normalizeSheetName(sheetName) {
  var normalized = String(sheetName || '').trim();
  if (!normalized) return '';
  var key = normalized.toLowerCase();
  if (key === 'scheduled' || key === 'scheduled transactions') {
    return SCHEDULED_SHEET_NAME;
  }
  return normalized;
}

function isScheduledPayload(data, expenses) {
  if (data && data.isScheduled === true) return true;
  if (!expenses || !expenses.length) return false;

  for (var i = 0; i < expenses.length; i++) {
    var row = expenses[i] || {};
    var category = String(row.category || '').toLowerCase();
    var description = String(row.description || '').toLowerCase();
    if (category.indexOf('schedule') !== -1 || description.indexOf('repeat:') !== -1) {
      return true;
    }
  }

  return false;
}

function stripScheduledMeta(description) {
  return String(description || '').split('||')[0].trim();
}

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
      
      var requestedSheetName = normalizeSheetName(data.targetSheetName || data.sheetName);
      var looksLikeMonthSheet = /^[A-Z][a-z]{2} \d{4}$/.test(requestedSheetName);
      if (isScheduledPayload(data, expenses) && (!requestedSheetName || looksLikeMonthSheet)) {
        requestedSheetName = SCHEDULED_SHEET_NAME;
      }

      // Handle Update: Delete old entries first
      if (data.action === 'update' && data.originalDate) {
         var originalSheetName = String(data.originalSheetName || '').trim();
         if (!originalSheetName) {
             var originalParts = data.originalDate.split('/');
             if (originalParts.length === 3) {
                 originalSheetName = originalParts[1] + ' ' + originalParts[2];
             }
         }

         if (originalSheetName) {
              originalSheetName = normalizeSheetName(originalSheetName);
             var originalSheet = doc.getSheetByName(originalSheetName);
             
             if (originalSheet) {
                 var range = originalSheet.getDataRange();
                 var values = range.getValues();
                 var rowsToDelete = [];
                 var currentDate = '';
                  var isScheduledUpdate = normalizeSheetName(originalSheetName) === SCHEDULED_SHEET_NAME;
                  var originalEntry = data.originalEntry || null;

                  if (isScheduledUpdate && originalEntry) {
                      var matchCategory = String(originalEntry.category || '').trim();
                      var matchDescription = stripScheduledMeta(originalEntry.description);
                      var matchAmount = Number(originalEntry.amount || 0);

                      for (var sr = 1; sr < values.length; sr++) {
                          var sRow = values[sr];
                          if (!sRow[1] && !sRow[2] && !sRow[3]) continue;

                          var sDate = sRow[0];
                          if (sDate) {
                              if (sDate instanceof Date) {
                                  currentDate = Utilities.formatDate(sDate, timezone, "dd/MMM/yyyy");
                              } else {
                                  currentDate = String(sDate).trim();
                              }
                          }

                          var sCategory = String(sRow[1] || '').trim();
                          var sDescription = stripScheduledMeta(sRow[2]);
                          var sAmount = Number(parseFloat(sRow[3]) || 0);
                          if (currentDate === data.originalDate && sCategory === matchCategory && sDescription === matchDescription && sAmount === matchAmount) {
                              rowsToDelete.push(sr + 1);
                              break;
                          }
                      }
                  }

                  if (rowsToDelete.length === 0) {
                      // Fallback legacy update behavior (group-by-date delete) for non-scheduled sheets.
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

      // Allow explicit target sheet (used for Scheduled tab data).
      // Fallback to historical month-year sheet behavior for regular entries.

      var sheetName = requestedSheetName || 'Cashew';
      if (!requestedSheetName && expenses.length > 0 && expenses[0].date) {
        var parts = expenses[0].date.split('/');
        if (parts.length === 3) {
          sheetName = parts[1] + ' ' + parts[2];
        }
      }

      var isScheduledSheet = normalizeSheetName(sheetName) === SCHEDULED_SHEET_NAME;
      var sheet = ensureSheetWithHeaders(doc, sheetName, isScheduledSheet);
      var columnMap = getSheetColumnMap(sheet, isScheduledSheet);

      // Prepare rows for bulk insertion
      for (var i = 0; i < expenses.length; i++) {
        var expense = expenses[i];

        var displayDate = expense.date;
        if (displayDate === lastDate) {
          displayDate = '';
        } else {
          lastDate = displayDate;
        }

        if (isScheduledSheet) {
          rows.push([
            displayDate,         // Column A: Date
            expense.category,    // Column B: Category
            expense.description, // Column C: Description
            expense.amount,      // Column D: Amount
            String(expense.repeat || 'none').toLowerCase(), // Column E: Repeat
            String(expense.status || 'completed').toLowerCase() // Column F: Status
          ]);
        } else {
          rows.push([
            displayDate,         // Column A: Date
            expense.category,    // Column B: Category
            expense.description, // Column C: Description
            expense.amount,      // Column D: Amount
            String(expense.status || 'completed').toLowerCase() // Column F: Status
          ]);
        }
      }

      // Append all rows at once if there is data
      if (rows.length > 0) {
        var lastRow = sheet.getLastRow();
        var startRow = lastRow + 1;

        // Add 2 rows spacing if there is existing data (headers are row 1)
        if (lastRow > 1) {
          startRow += 2;
        }

        var baseValues = rows.map(function (r) {
          return [r[0], r[1], r[2], r[3]];
        });
        var statusValues = rows.map(function (r) {
          return [isScheduledSheet ? r[5] : r[4]];
        });

        sheet.getRange(startRow, 1, rows.length, 4).setValues(baseValues);
        sheet.getRange(startRow, columnMap.statusCol, rows.length, 1).setValues(statusValues);

        if (isScheduledSheet) {
          var repeatValues = rows.map(function (r) {
            return [r[4]];
          });
          sheet.getRange(startRow, columnMap.repeatCol, rows.length, 1).setValues(repeatValues);
        }
        // Keep amount column numeric; some sheets carry date formatting from prior edits.
        sheet.getRange(startRow, 4, rows.length, 1).setNumberFormat('#,##0.00');
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
            var monthlyColumnMap = getSheetColumnMap(sheet, false);
            
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
                    amount: amount,
                    status: String(row[monthlyColumnMap.statusCol - 1] || '').trim().toLowerCase() || 'completed'
                });
            }
        }
        
        return ContentService.createTextOutput(JSON.stringify({
            data: allExpenses,
            availableBalance: totalAvailableBalance,
            monthlyBalances: monthlyBalances
        })).setMimeType(ContentService.MimeType.JSON);
    }

    var sheetName = normalizeSheetName(e.parameter.sheetName);

    if (!sheetName) {
      return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'message': 'Sheet name is required' }))
        .setMimeType(ContentService.MimeType.JSON);
    }

    var sheet = doc.getSheetByName(sheetName);
    if (!sheet && (sheetName === SCHEDULED_SHEET_NAME)) {
      // Auto-create dedicated Scheduled sheet on first use.
      sheet = ensureSheetWithHeaders(doc, SCHEDULED_SHEET_NAME, true);
    }
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({ data: [], availableBalance: 0 })) // Return empty structure if sheet not found
        .setMimeType(ContentService.MimeType.JSON);
    }

    var isScheduledSheet = normalizeSheetName(sheetName) === SCHEDULED_SHEET_NAME;
    var readColumnMap = getSheetColumnMap(sheet, isScheduledSheet);

    if (e.parameter.datesOnly === 'true') {
        var data = sheet.getDataRange().getValues();
        var uniqueDates = {};
        var lastDate = '';

        // Skip header row (index 0)
        for (var i = 1; i < data.length; i++) {
            var row = data[i];
            // Skip empty rows (if any)
            if (!row[1] && !row[2] && !row[3]) continue;

            var date = row[0];
            if (date) {
                if (date instanceof Date) {
                    date = Utilities.formatDate(date, timezone, "dd/MMM/yyyy");
                }
                lastDate = date;
            } else {
                date = lastDate;
            }
            if (date) uniqueDates[date] = true;
        }
        return ContentService.createTextOutput(JSON.stringify({ dates: Object.keys(uniqueDates) })).setMimeType(ContentService.MimeType.JSON);
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
        amount: amount,
        repeat: String(row[isScheduledSheet ? (readColumnMap.repeatCol - 1) : 4] || '').trim().toLowerCase() || 'none',
        status: String(row[readColumnMap.statusCol - 1] || '').trim().toLowerCase() || 'completed'
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