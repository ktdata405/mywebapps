// Google Apps Script Code for Scan
// Create a new Google Sheet (or use existing), go to Extensions > Apps Script, and paste this code.
// Publish > Deploy as web app > Execute as: Me > Who has access: Anyone.
// IMPORTANT: After updating this code, you must create a NEW deployment (Manage Deployments > New Version) for changes to take effect.

function getSheet() {
  const doc = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = doc.getSheetByName('Scans');
  if (!sheet) {
    sheet = doc.insertSheet('Scans');
    sheet.appendRow(['Timestamp', 'Name', 'URL', 'ID', 'Type', 'Folder']);
  }
  return sheet;
}

function findRowByFileId(sheet, fileId) {
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const idColIndex = headers.indexOf('ID');
  if (idColIndex === -1) return -1;

  for (let i = 1; i < data.length; i++) {
    if (data[i][idColIndex] === fileId) {
      return i + 1; // Return 1-based row index
    }
  }
  return -1;
}

function getOrCreateFolderByPath(root, path) {
  if (!path) return root;
  const parts = path.split('/');
  let current = root;
  for (let part of parts) {
    if (!part) continue;
    const next = current.getFoldersByName(part);
    if (next.hasNext()) {
      current = next.next();
    } else {
      current = current.createFolder(part);
    }
  }
  return current;
}

function handleAction(action, payload, rootFolder) {
  switch (action) {
    case 'createFolder':
      if (!payload.folderName) throw new Error("Folder path is required.");
      // payload.folderName is the full path e.g. "A/B"
      getOrCreateFolderByPath(rootFolder, payload.folderName);
      return { status: 'success', message: 'Folder created.' };

    case 'renameFile':
      if (!payload.fileId || !payload.newName) throw new Error("File ID and new name are required.");
      DriveApp.getFileById(payload.fileId).setName(payload.newName);
      const sheet_rf = getSheet();
      const row_rf = findRowByFileId(sheet_rf, payload.fileId);
      if (row_rf !== -1) {
        const nameColIndex = sheet_rf.getDataRange().getValues()[0].indexOf('Name') + 1;
        sheet_rf.getRange(row_rf, nameColIndex).setValue(payload.newName);
      }
      return { status: 'success', message: 'File renamed.' };

    case 'renameFolder':
      // payload.oldPath (e.g. "A/B"), payload.newName (e.g. "C") -> New Path "A/C"
      if (!payload.oldPath || !payload.newName) throw new Error("Old path and new name are required.");
      
      const targetFolder = getOrCreateFolderByPath(rootFolder, payload.oldPath);
      targetFolder.setName(payload.newName);
      
      // Calculate new path prefix
      const pathParts = payload.oldPath.split('/');
      pathParts.pop(); // Remove old name
      const parentPath = pathParts.join('/');
      const newPath = parentPath ? parentPath + '/' + payload.newName : payload.newName;

      const sheet_rnf = getSheet();
      const data_rnf = sheet_rnf.getDataRange().getValues();
      const folderColIndex_rnf = data_rnf[0].indexOf('Folder');
      
      if (folderColIndex_rnf === -1) throw new Error("Folder column not found in sheet.");
      
      for (let i = 1; i < data_rnf.length; i++) {
        const rowFolder = data_rnf[i][folderColIndex_rnf];
        if (rowFolder === payload.oldPath) {
          // Exact match
          sheet_rnf.getRange(i + 1, folderColIndex_rnf + 1).setValue(newPath);
        } else if (rowFolder.startsWith(payload.oldPath + '/')) {
          // Nested match
          const updatedRowFolder = newPath + rowFolder.substring(payload.oldPath.length);
          sheet_rnf.getRange(i + 1, folderColIndex_rnf + 1).setValue(updatedRowFolder);
        }
      }
      return { status: 'success', message: 'Folder renamed.' };

    case 'deleteFile':
      if (!payload.fileId) throw new Error("File ID is required.");
      DriveApp.getFileById(payload.fileId).setTrashed(true);
      const sheet_df = getSheet();
      const row_df = findRowByFileId(sheet_df, payload.fileId);
      if (row_df !== -1) sheet_df.deleteRow(row_df);
      return { status: 'success', message: 'File deleted.' };

    case 'deleteFolder':
      if (!payload.folderPath) throw new Error("Folder path is required.");
      const folderToDelete = getOrCreateFolderByPath(rootFolder, payload.folderPath);
      folderToDelete.setTrashed(true);
      
      const sheet_dfo = getSheet();
      const data_dfo = sheet_dfo.getDataRange().getValues();
      const folderColIndex_dfo = data_dfo[0].indexOf('Folder');
      const rowsToDelete = [];
      
      for (let i = 1; i < data_dfo.length; i++) {
        const rowFolder = data_dfo[i][folderColIndex_dfo];
        if (rowFolder === payload.folderPath || rowFolder.startsWith(payload.folderPath + '/')) rowsToDelete.push(i + 1);
      }
      rowsToDelete.sort((a, b) => b - a).forEach(rowIndex => sheet_dfo.deleteRow(rowIndex));
      return { status: 'success', message: 'Folder and its sheet entries deleted.' };

    case 'updateFileContent':
      if (!payload.fileId || !payload.file) throw new Error("File ID and new file info are required.");
      const fileToUpdate = DriveApp.getFileById(payload.fileId);
      const newFileInfo = payload.file;
      const blob = Utilities.newBlob(Utilities.base64Decode(newFileInfo.data), newFileInfo.type, newFileInfo.name);
      fileToUpdate.setContent(blob);
      const sheet_ufc = getSheet();
      const row_ufc = findRowByFileId(sheet_ufc, payload.fileId);
      if (row_ufc !== -1) {
        const headers = sheet_ufc.getDataRange().getValues()[0];
        const nameCol = headers.indexOf('Name') + 1;
        const typeCol = headers.indexOf('Type') + 1;
        sheet_ufc.getRange(row_ufc, nameCol).setValue(newFileInfo.name);
        sheet_ufc.getRange(row_ufc, typeCol).setValue(newFileInfo.type);
      }
      return { status: 'success', message: 'File content updated.' };

    case 'moveFile':
      if (!payload.fileId || payload.newFolderPath === undefined) throw new Error("File ID and new folder path are required.");
      
      const fileToMove = DriveApp.getFileById(payload.fileId);
      const destinationFolder = getOrCreateFolderByPath(rootFolder, payload.newFolderPath);
      
      // Move file in Drive by removing from all parents and adding to new one
      const sourceFolders = fileToMove.getParents();
      while (sourceFolders.hasNext()) {
        const parent = sourceFolders.next();
        parent.removeFile(fileToMove);
      }
      destinationFolder.addFile(fileToMove);

      // Update Sheet
      const sheet_mf = getSheet();
      const row_mf = findRowByFileId(sheet_mf, payload.fileId);
      if (row_mf !== -1) {
        const folderColIndex = sheet_mf.getDataRange().getValues()[0].indexOf('Folder') + 1;
        sheet_mf.getRange(row_mf, folderColIndex).setValue(payload.newFolderPath);
      }
      return { status: 'success', message: 'File moved.' };

    default:
      return null;
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    
    // 1. Google Drive Configuration
    // Automatically find or create "Scans" folder
    const folderName = 'Scans';
    const folders = DriveApp.getFoldersByName(folderName);
    let rootFolder;
    if (folders.hasNext()) {
      rootFolder = folders.next();
    } else {
      rootFolder = DriveApp.createFolder(folderName);
    }

    if (data.action) {
      const result = handleAction(data.action, data, rootFolder);
      if (result) return ContentService.createTextOutput(JSON.stringify(result)).setMimeType(ContentService.MimeType.JSON);
    }
    // 2. Google Sheet Configuration
    let sheet;
    const doc = SpreadsheetApp.getActiveSpreadsheet();
    
    const files = data.files;
    if (!files || files.length === 0) {
      // This could be a folder creation request, which is handled above.
      if (!data.action) throw new Error("No files or action provided.");
      return; // Action was handled, but no files to upload.
    }

    let targetFolder = rootFolder;
    const targetFolderName = data.folderName;
    if (targetFolderName) {
      targetFolder = getOrCreateFolderByPath(rootFolder, targetFolderName);
    }

    sheet = getSheet();
    
    const uploadedFiles = [];
    
    files.forEach(file => {
      // Decode and save to Drive
      const blob = Utilities.newBlob(Utilities.base64Decode(file.data), file.type, file.name);
      const newFile = targetFolder.createFile(blob);
      
      // Set sharing permission to anyone with link can view
      newFile.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      
      const fileInfo = {
        name: newFile.getName(),
        url: newFile.getUrl(),
        id: newFile.getId(),
        type: file.type,
        timestamp: new Date(),
        folder: targetFolderName || ''
      };
      
      uploadedFiles.push(fileInfo);
      
      // Append to Google Sheet
      if (sheet) {
        sheet.appendRow([
          fileInfo.timestamp,
          fileInfo.name,
          fileInfo.url,
          fileInfo.id,
          fileInfo.type,
          fileInfo.folder
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
    let sheet = getSheet();

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
    // Assuming headers are: Timestamp, Name, URL, ID, Type, Folder
    const scans = rows.map(row => {
      return {
        timestamp: row[0],
        name: row[1],
        url: row[2],
        id: row[3],
        type: row[4],
        folder: row[5] || ''
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