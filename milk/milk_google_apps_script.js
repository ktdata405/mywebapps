/**
 * Google Apps Script for Milk Bill Tracker
 */

function doGet(e) {
  const sheetName = e.parameter.sheetName;
  const datesOnly = e.parameter.datesOnly === 'true';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ 
      data: [], 
      dates: [],
      message: 'Sheet not found' 
    })).setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data.shift(); // Remove headers
  
  if (datesOnly) {
    const dates = data.map(row => {
      const dateVal = row[0];
      if (dateVal instanceof Date) {
        return Utilities.formatDate(dateVal, ss.getSpreadsheetTimeZone(), "dd/MMM/yyyy");
      }
      return String(dateVal);
    });
    return ContentService.createTextOutput(JSON.stringify({ dates: dates }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const formattedData = data.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      const key = header.toString().toLowerCase().replace(/\s+/g, '');
      let val = row[i];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, ss.getSpreadsheetTimeZone(), "dd/MMM/yyyy");
      }
      obj[key] = val;
    });
    return obj;
  });
  
  return ContentService.createTextOutput(JSON.stringify({ data: formattedData }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.getActiveSpreadsheet();

  // Handle markPaid action (single row)
  if (payload.action === 'markPaid') {
    const sheetName = payload.sheetName;
    const dateStr = payload.date;
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Sheet not found' })).setMimeType(ContentService.MimeType.JSON);
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    const statusCol = headers.indexOf("Status") + 1;
    if (statusCol === 0) return ContentService.createTextOutput(JSON.stringify({ success: false })).setMimeType(ContentService.MimeType.JSON);
    for (let i = 1; i < allData.length; i++) {
      const rowDate = allData[i][0];
      let formattedRowDate = rowDate instanceof Date ? Utilities.formatDate(rowDate, ss.getSpreadsheetTimeZone(), "dd/MMM/yyyy") : String(rowDate);
      if (formattedRowDate === dateStr) {
        sheet.getRange(i + 1, statusCol).setValue("Paid");
        return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
      }
    }
    return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Date not found' })).setMimeType(ContentService.MimeType.JSON);
  }

  // Handle markMonthPaid action (all rows in sheet)
  if (payload.action === 'markMonthPaid') {
    const sheetName = payload.sheetName;
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Sheet not found' })).setMimeType(ContentService.MimeType.JSON);
    const allData = sheet.getDataRange().getValues();
    const headers = allData[0];
    let statusCol = headers.indexOf("Status") + 1;
    if (statusCol === 0) {
      // Add Status column if missing
      const nextCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextCol).setValue("Status").setFontWeight("bold").setBackground("#f3f4f6");
      statusCol = nextCol;
    }
    // Mark all data rows as Paid
    for (let i = 1; i < allData.length; i++) {
      sheet.getRange(i + 1, statusCol).setValue("Paid");
    }
    return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
  }

  // payload.date is expected as DD/MMM/YYYY
  let dateStr = payload.date; // e.g. "07/May/2026"
  let date;

  // Parse DD/MMM/YYYY
  const parts = dateStr.split('/');
  if (parts.length === 3) {
    const monthNames = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
    const monthIndex = monthNames.indexOf(parts[1]);
    date = new Date(parseInt(parts[2]), monthIndex, parseInt(parts[0]));
  } else {
    date = new Date(dateStr);
  }

  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const sheetName = monthNames[date.getMonth()] + " " + date.getFullYear();
  
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(["Date", "Morning", "Evening", "UnitPrice", "Remarks", "Status"]);
    sheet.getRange(1, 1, 1, 6).setFontWeight("bold").setBackground("#f3f4f6");
  } else {
    // Ensure Remarks and Status columns exist
    const headerRow = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (headerRow.indexOf("Remarks") === -1) {
      const nextCol = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextCol).setValue("Remarks").setFontWeight("bold").setBackground("#f3f4f6");
    }
    const headerRow2 = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (headerRow2.indexOf("Status") === -1) {
      const nextCol2 = sheet.getLastColumn() + 1;
      sheet.getRange(1, nextCol2).setValue("Status").setFontWeight("bold").setBackground("#f3f4f6");
    }
  }
  
  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const remarksCol = headers.indexOf("Remarks") + 1;
  const statusCol = headers.indexOf("Status") + 1;

  let existingRowIndex = -1;
  const formattedInputDate = Utilities.formatDate(date, ss.getSpreadsheetTimeZone(), "dd/MMM/yyyy");

  for (let i = 1; i < allData.length; i++) {
    const rowDate = allData[i][0];
    let formattedRowDate;
    if (rowDate instanceof Date) {
      formattedRowDate = Utilities.formatDate(rowDate, ss.getSpreadsheetTimeZone(), "dd/MMM/yyyy");
    } else {
      formattedRowDate = String(rowDate);
    }
    if (formattedRowDate === formattedInputDate) {
      existingRowIndex = i + 1;
      break;
    }
  }
  
  if (existingRowIndex !== -1) {
    // Update existing row
    sheet.getRange(existingRowIndex, 2).setValue(payload.morning);
    sheet.getRange(existingRowIndex, 3).setValue(payload.evening);
    sheet.getRange(existingRowIndex, 4).setValue(payload.unitPrice);
    if (remarksCol > 0) sheet.getRange(existingRowIndex, remarksCol).setValue(payload.remarks || "");
    // Only update status if explicitly provided (don't overwrite paid status on edit)
    if (payload.status !== undefined && statusCol > 0) {
      sheet.getRange(existingRowIndex, statusCol).setValue(payload.status);
    }
  } else {
    // Add new row
    const newRow = [formattedInputDate, payload.morning, payload.evening, payload.unitPrice, payload.remarks || "", payload.status || "Unpaid"];
    sheet.appendRow(newRow);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function markAsPaid(e) {
  // Called via POST with action: 'markPaid'
  const payload = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheetName = payload.sheetName;
  const dateStr = payload.date;

  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Sheet not found' })).setMimeType(ContentService.MimeType.JSON);

  const allData = sheet.getDataRange().getValues();
  const headers = allData[0];
  const statusCol = headers.indexOf("Status") + 1;
  if (statusCol === 0) return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'No status column' })).setMimeType(ContentService.MimeType.JSON);

  for (let i = 1; i < allData.length; i++) {
    const rowDate = allData[i][0];
    let formattedRowDate = rowDate instanceof Date ? Utilities.formatDate(rowDate, ss.getSpreadsheetTimeZone(), "dd/MMM/yyyy") : String(rowDate);
    if (formattedRowDate === dateStr) {
      sheet.getRange(i + 1, statusCol).setValue("Paid");
      return ContentService.createTextOutput(JSON.stringify({ success: true })).setMimeType(ContentService.MimeType.JSON);
    }
  }
  return ContentService.createTextOutput(JSON.stringify({ success: false, message: 'Date not found' })).setMimeType(ContentService.MimeType.JSON);
}

