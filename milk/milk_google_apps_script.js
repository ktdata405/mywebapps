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
      return dateVal;
    });
    return ContentService.createTextOutput(JSON.stringify({ dates: dates }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const formattedData = data.map(row => {
    let obj = {};
    headers.forEach((header, i) => {
      obj[header.toLowerCase()] = row[i];
    });
    return obj;
  });
  
  return ContentService.createTextOutput(JSON.stringify({ data: formattedData }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doPost(e) {
  const payload = JSON.parse(e.postData.contents);
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  
  const date = new Date(payload.date);
  const monthNames = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const sheetName = monthNames[date.getMonth()] + " " + date.getFullYear();
  
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(["Date", "Morning", "Evening", "UnitPrice", "Remarks"]);
    // Format header
    sheet.getRange(1, 1, 1, 5).setFontWeight("bold").setBackground("#f3f4f6");
  } else {
    // Check if Remarks column exists, if not add it
    const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
    if (headers.indexOf("Remarks") === -1) {
      sheet.getRange(1, 5).setValue("Remarks").setFontWeight("bold").setBackground("#f3f4f6");
    }
  }
  
  const data = sheet.getDataRange().getValues();
  let existingRowIndex = -1;
  
  // Format date for comparison
  const formattedInputDate = Utilities.formatDate(date, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd");
  
  for (let i = 1; i < data.length; i++) {
    const rowDate = data[i][0];
    const formattedRowDate = rowDate instanceof Date ? Utilities.formatDate(rowDate, ss.getSpreadsheetTimeZone(), "yyyy-MM-dd") : rowDate;
    
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
    sheet.getRange(existingRowIndex, 5).setValue(payload.remarks || "");
  } else {
    // Add new row
    sheet.appendRow([payload.date, payload.morning, payload.evening, payload.unitPrice, payload.remarks || ""]);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}