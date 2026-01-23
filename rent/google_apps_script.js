// Google Apps Script code to fetch reports
// Copy and paste this into your Google Apps Script project (Extensions > Apps Script)

const SHEET_NAME = "Tenet"; // Change this if your sheet name is different

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
  // CORS headers
  const headers = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type"
  };

  try {
    // If it's a POST request (saving data)
    if (e.postData && e.postData.contents) {
      return handlePost(e);
    }
    
    // If it's a GET request (fetching report)
    return handleGet(e);
    
  } catch (error) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        "result": "error", 
        "error": error.toString() 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

function handleGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    return ContentService
      .createTextOutput(JSON.stringify({ 
        "result": "error", 
        "error": "Sheet '" + SHEET_NAME + "' not found" 
      }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const rows = data.slice(1);
  
  // Map headers to the keys expected by the frontend
  // Assuming headers in sheet are: Date, Rent Amount, Paid Amount, Balance Amount, Power Bill, Water Bill, Total Paid, Remarks
  // We need to map them to: date, rentAmount, paidAmount, balanceAmount, powerBill, waterBill, totalPaid, remarks
  
  const jsonData = rows.map(row => {
    let obj = {};
    // You might need to adjust these indices based on your actual column order
    obj.date = row[0]; 
    obj.rentAmount = row[1];
    obj.paidAmount = row[2];
    obj.balanceAmount = row[3];
    obj.powerBill = row[4];
    obj.waterBill = row[5];
    obj.totalPaid = row[6];
    obj.remarks = row[7];
    
    // If you have a 'Side' column, adjust accordingly. 
    // The frontend code handles 'side' if present, but we removed it from the form.
    
    return obj;
  });

  // Return the data wrapped in a structure the frontend expects
  // The frontend checks for Array.isArray(response) OR response.data OR response.records
  // We'll return { result: 'success', data: [...] } which covers the bases
  
  return ContentService
    .createTextOutput(JSON.stringify({
      "result": "success",
      "data": jsonData
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

function handlePost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(SHEET_NAME);
  
  if (!sheet) {
    // Create sheet if it doesn't exist
    // sheet = ss.insertSheet(SHEET_NAME);
    // sheet.appendRow(["Date", "Rent Amount", "Paid Amount", "Balance Amount", "Power Bill", "Water Bill", "Total Paid", "Remarks"]);
    throw new Error("Sheet '" + SHEET_NAME + "' not found");
  }

  const data = JSON.parse(e.postData.contents);
  
  // Append the new row
  // Ensure the order matches the columns in your sheet
  sheet.appendRow([
    data.date,
    data.rentAmount,
    data.paidAmount,
    data.balanceAmount,
    data.powerBill,
    data.waterBill,
    data.totalPaid,
    data.remarks
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ "result": "success" }))
    .setMimeType(ContentService.MimeType.JSON);
}