// Google Apps Script Code for Scan
// Create a new Google Sheet (or use existing), go to Extensions > Apps Script, and paste this code.
// Publish > Deploy as web app > Execute as: Me > Who has access: Anyone.
// IMPORTANT: After updating this code, you must create a NEW deployment (Manage Deployments > New Version) for changes to take effect.

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const files = data.files;
    
    // 1. Google Drive Configuration
    // Automatically find or create "Scans" folder
    const folderName = 'Scans';
    const folders = DriveApp.getFoldersByName(folderName);
    let folder;
    if (folders.hasNext()) {
      folder = folders.next();
    } else {
      folder = DriveApp.createFolder(folderName);
    }
    
    // 2. Google Sheet Configuration
    let sheet;
    const doc = SpreadsheetApp.getActiveSpreadsheet();
    
    if (doc) {
      // If script is bound to a spreadsheet
      sheet = doc.getSheetByName('Scans');
      if (!sheet) {
        sheet = doc.insertSheet('Scans');
        sheet.appendRow(['Timestamp', 'Name', 'URL', 'ID', 'Type']);
      }
    } else {
      // Fallback: If standalone script, try to use ID if provided
      const sheetId = 'YOUR_GOOGLE_SHEET_ID'; // Replace if using standalone script
      if (sheetId && sheetId !== 'YOUR_GOOGLE_SHEET_ID') {
        sheet = SpreadsheetApp.openById(sheetId).getSheetByName('Scans');
      }
    }
    
    const uploadedFiles = [];
    
    files.forEach(file => {
      // Decode and save to Drive
      const blob = Utilities.newBlob(Utilities.base64Decode(file.data), file.type, file.name);
      const newFile = folder.createFile(blob);
      
      // Set sharing permission to anyone with link can view
      newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      const fileInfo = {
        name: newFile.getName(),
        url: newFile.getUrl(),
        id: newFile.getId(),
        type: file.type,
        timestamp: new Date()
      };
      
      uploadedFiles.push(fileInfo);
      
      // Append to Google Sheet
      if (sheet) {
        sheet.appendRow([
          fileInfo.timestamp,
          fileInfo.name,
          fileInfo.url,
          fileInfo.id,
          fileInfo.type
        ]);
      }
    });

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      files: uploadedFiles
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}

function doGet(e) {
  try {
    const doc = SpreadsheetApp.getActiveSpreadsheet();
    let sheet;
    
    if (doc) {
      sheet = doc.getSheetByName('Scans');
    } else {
       const sheetId = 'YOUR_GOOGLE_SHEET_ID';
       if (sheetId && sheetId !== 'YOUR_GOOGLE_SHEET_ID') {
         sheet = SpreadsheetApp.openById(sheetId).getSheetByName('Scans');
       }
    }

    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({
        status: 'success',
        data: []
      })).setMimeType(ContentService.MimeType.JSON);
    }

    const data = sheet.getDataRange().getValues();
    const headers = data[0];
    const rows = data.slice(1);
    
    // Map rows to objects based on headers
    // Assuming headers are: Timestamp, Name, URL, ID, Type
    const scans = rows.map(row => {
      return {
        timestamp: row[0],
        name: row[1],
        url: row[2],
        id: row[3],
        type: row[4]
      };
    });
    
    // Sort by timestamp descending (newest first)
    scans.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    return ContentService.createTextOutput(JSON.stringify({
      status: 'success',
      data: scans
    })).setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    return ContentService.createTextOutput(JSON.stringify({
      status: 'error',
      message: error.toString()
    })).setMimeType(ContentService.MimeType.JSON);
  }
}