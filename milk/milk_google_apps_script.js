/**
 * Google Apps Script for Milk Bill Tracker
 * 
 * SETUP INSTRUCTIONS:
 * 1. Create a new Google Sheet.
 * 2. Go to Extensions > Apps Script.
 * 3. Replace the code in the editor with this script.
 * 4. Deploy as a Web App: 
 *    - Click 'Deploy' > 'New deployment'.
 *    - Select 'Web App'.
 *    - Set 'Execute as' to 'Me'.
 *    - Set 'Who has access' to 'Anyone'.
 * 5. Copy the 'Web App URL' and update CONFIG.GOOGLE_SHEET_URL_MILK in your config.js.
 * 6. Update CONFIG.SHEET_URL_MILK with your spreadsheet's URL.
 */

function doGet(e) {
  const sheetName = e.parameter.sheetName;
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(sheetName);
  
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ data: [], message: 'Sheet not found' }))
      .setMimeType(ContentService.MimeType.JSON);
  }
  
  const data = sheet.getDataRange().getValues();
  const headers = data.shift(); // Remove headers
  
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
    sheet.appendRow(["Date", "Morning", "Evening", "UnitPrice"]);
    // Format header
    sheet.getRange(1, 1, 1, 4).setFontWeight("bold").setBackground("#f3f4f6");
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
  } else {
    // Add new row
    sheet.appendRow([payload.date, payload.morning, payload.evening, payload.unitPrice]);
  }
  
  return ContentService.createTextOutput(JSON.stringify({ success: true }))
    .setMimeType(ContentService.MimeType.JSON);
}