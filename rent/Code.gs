// Instructions for setting up the Google Sheet and deploying the script:
// 1. Create a new Google Sheet.
// 2. Get the Spreadsheet ID from the URL (e.g., "https://docs.google.com/spreadsheets/d/SPREADSHEET_ID/edit").
// 3. Go to "Extensions" > "Apps Script".
// 4. Paste this code into the `Code.gs` file.
// 5. Replace "YOUR_SPREADSHEET_ID" with your actual Spreadsheet ID.
// 6. Deploy as a Web App ("Deploy" > "New deployment").
// 7. Set "Who has access" to "Anyone".
// 8. Copy the Web App URL and paste it into the `scriptURL` variable in your `script.js` file.

var SPREADSHEET_ID = "YOUR_SPREADSHEET_ID";
var SHEET_NAME = "Data";

function doPost(e) {
  try {
    var ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    var sheet = ss.getSheetByName(SHEET_NAME);

    if (!sheet) {
      sheet = ss.insertSheet(SHEET_NAME);
      var headers = ["Timestamp", "Date", "Rent Amount", "Paid Amount", "Balance Amount", "Side", "Power Bill", "Water Bill", "Total Paid", "Remarks"];
      sheet.appendRow(headers);
    }

    var params = e.parameter;
    var newRow = [
      new Date(),
      params.date,
      params.rentAmount,
      params.paidAmount,
      params.balanceAmount,
      params.side,
      params.powerBill,
      params.waterBill,
      params.totalPaid,
      params.remarks
    ];

    sheet.appendRow(newRow);

    return ContentService.createTextOutput(JSON.stringify({ 'result': 'success' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({ 'result': 'error', 'error': error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
