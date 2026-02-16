// Google Apps Script code to fetch reports
// Copy and paste this into your Google Apps Script project (Extensions > Apps Script)

const SHEET_NAME = "Tenet Rent History"; // Change this if your sheet name is different

function doGet(e) {
  return handleRequest(e);
}

function doPost(e) {
  return handleRequest(e);
}

function handleRequest(e) {
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
  if (data.length === 0) {
     return ContentService
      .createTextOutput(JSON.stringify({ "result": "success", "data": [] }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const headers = data[0].map(h => h.toString().toLowerCase().trim());
  const rows = data.slice(1);
  
  // Helper to find column index by header name
  function getColIndex(possibleNames) {
    return headers.findIndex(h => possibleNames.some(name => h.includes(name)));
  }

  // Dynamic Column Mapping
  const colMap = {
    date: getColIndex(['date']),
    side: getColIndex(['side']),
    rentAmount: getColIndex(['rent']),
    paidAmount: getColIndex(['paid', 'amount paid']),
    balanceAmount: getColIndex(['balance']),
    powerBill: getColIndex(['power', 'electricity']),
    waterBill: getColIndex(['water']),
    totalPaid: getColIndex(['total']),
    remarks: getColIndex(['remark', 'note', 'description'])
  };

  const jsonData = rows.map(row => {
    let obj = {};
    
    // Map data using found indices
    obj.date = colMap.date > -1 ? row[colMap.date] : '';
    obj.side = colMap.side > -1 ? row[colMap.side] : '';
    obj.rentAmount = colMap.rentAmount > -1 ? row[colMap.rentAmount] : 0;
    obj.paidAmount = colMap.paidAmount > -1 ? row[colMap.paidAmount] : 0;
    obj.balanceAmount = colMap.balanceAmount > -1 ? row[colMap.balanceAmount] : 0;
    obj.powerBill = colMap.powerBill > -1 ? row[colMap.powerBill] : 0;
    obj.waterBill = colMap.waterBill > -1 ? row[colMap.waterBill] : 0;
    obj.totalPaid = colMap.totalPaid > -1 ? row[colMap.totalPaid] : 0;
    obj.remarks = colMap.remarks > -1 ? row[colMap.remarks] : '';
    
    // Format date object to string if needed
    if (obj.date instanceof Date) {
      const day = String(obj.date.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[obj.date.getMonth()];
      const year = obj.date.getFullYear();
      obj.date = `${day}/${month}/${year}`;
    }

    return obj;
  });

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
    throw new Error("Sheet '" + SHEET_NAME + "' not found");
  }

  const data = JSON.parse(e.postData.contents);
  
  const headers = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0].map(h => h.toString().toLowerCase().trim());
  
  function getColIndex(possibleNames) {
    return headers.findIndex(h => possibleNames.some(name => h.includes(name)));
  }
  
  const colMap = {
    date: getColIndex(['date']),
    side: getColIndex(['side']),
    rentAmount: getColIndex(['rent']),
    paidAmount: getColIndex(['paid', 'amount paid']),
    balanceAmount: getColIndex(['balance']),
    powerBill: getColIndex(['power', 'electricity']),
    waterBill: getColIndex(['water']),
    totalPaid: getColIndex(['total']),
    remarks: getColIndex(['remark', 'note', 'description'])
  };
  
  // Helper to format date for comparison
  function formatDate(d) {
    if (!d) return '';
    let dateObj = d;
    
    // If it's a string, try to parse it
    if (typeof d === 'string') {
        // Try parsing standard formats
        const parsed = new Date(d);
        if (!isNaN(parsed.getTime())) {
            dateObj = parsed;
        } else {
            // If parsing fails, return the string as is (trimmed)
            return d.trim();
        }
    }
    
    if (dateObj instanceof Date) {
      const day = String(dateObj.getDate()).padStart(2, '0');
      const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
      const month = months[dateObj.getMonth()];
      const year = dateObj.getFullYear();
      return `${day}/${month}/${year}`;
    }
    
    return String(d).trim();
  }

  if (data.action === 'update') {
    const allData = sheet.getDataRange().getValues();
    let rowIndexToUpdate = -1;
    
    const targetDate = data.originalDate || data.date;
    const targetSide = data.originalSide || data.side;
    
    // Search for the row
    for (let i = 1; i < allData.length; i++) {
      const row = allData[i];
      const rowDate = colMap.date > -1 ? formatDate(row[colMap.date]) : '';
      const rowSide = colMap.side > -1 ? row[colMap.side] : '';
      
      let match = (rowDate === targetDate);
      if (match && targetSide && rowSide) {
          match = (rowSide === targetSide);
      }
      
      if (match) {
        rowIndexToUpdate = i + 1; // 1-based index
        break;
      }
    }
    
    if (rowIndexToUpdate > -1) {
      // Update the row
      if (colMap.date > -1) sheet.getRange(rowIndexToUpdate, colMap.date + 1).setValue(data.date);
      if (colMap.side > -1) sheet.getRange(rowIndexToUpdate, colMap.side + 1).setValue(data.side);
      if (colMap.rentAmount > -1) sheet.getRange(rowIndexToUpdate, colMap.rentAmount + 1).setValue(data.rentAmount);
      if (colMap.paidAmount > -1) sheet.getRange(rowIndexToUpdate, colMap.paidAmount + 1).setValue(data.paidAmount);
      if (colMap.balanceAmount > -1) sheet.getRange(rowIndexToUpdate, colMap.balanceAmount + 1).setValue(data.balanceAmount);
      if (colMap.powerBill > -1) sheet.getRange(rowIndexToUpdate, colMap.powerBill + 1).setValue(data.powerBill);
      if (colMap.waterBill > -1) sheet.getRange(rowIndexToUpdate, colMap.waterBill + 1).setValue(data.waterBill);
      if (colMap.totalPaid > -1) sheet.getRange(rowIndexToUpdate, colMap.totalPaid + 1).setValue(data.totalPaid);
      if (colMap.remarks > -1) sheet.getRange(rowIndexToUpdate, colMap.remarks + 1).setValue(data.remarks);
      
      return ContentService
        .createTextOutput(JSON.stringify({ "result": "success", "message": "Record updated" }))
        .setMimeType(ContentService.MimeType.JSON);
    } else {
       return ContentService
        .createTextOutput(JSON.stringify({ 
            "result": "error", 
            "error": `Record not found for ${data.action}. Searched for Date: '${targetDate}'` + (targetSide ? ` and Side: '${targetSide}'` : '')
        }))
        .setMimeType(ContentService.MimeType.JSON);
    }
    
  } else {
    // Add new record
    const newRow = new Array(headers.length).fill('');
    
    if (colMap.date > -1) newRow[colMap.date] = data.date;
    if (colMap.side > -1) newRow[colMap.side] = data.side;
    if (colMap.rentAmount > -1) newRow[colMap.rentAmount] = data.rentAmount;
    if (colMap.paidAmount > -1) newRow[colMap.paidAmount] = data.paidAmount;
    if (colMap.balanceAmount > -1) newRow[colMap.balanceAmount] = data.balanceAmount;
    if (colMap.powerBill > -1) newRow[colMap.powerBill] = data.powerBill;
    if (colMap.waterBill > -1) newRow[colMap.waterBill] = data.waterBill;
    if (colMap.totalPaid > -1) newRow[colMap.totalPaid] = data.totalPaid;
    if (colMap.remarks > -1) newRow[colMap.remarks] = data.remarks;

    if (headers.length === 0) {
        sheet.appendRow([
          data.date,
          data.side,
          data.rentAmount,
          data.paidAmount,
          data.balanceAmount,
          data.powerBill,
          data.waterBill,
          data.totalPaid,
          data.remarks
        ]);
    } else {
        sheet.appendRow(newRow);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ "result": "success" }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}
