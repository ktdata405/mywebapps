/**
 * Google Apps Script for Milk Bill Tracker
 * VERSION: 3.0 — Clean rewrite with Stage column support
 *
 * TEST the deployment is live by opening this URL in your browser:
 *   https://<YOUR_DEPLOYMENT_URL>/exec?action=test
 * You should see: {"ok":true,"version":"3.0","time":"..."}
 */

// ─────────────────────────────────────────────
// HELPER: Find or create a header column by name (case-insensitive)
// Returns 1-based column index. Creates & flushes column if not found.
// ─────────────────────────────────────────────
function getOrCreateCol(sheet, headerName) {
  const lastCol = sheet.getLastColumn();
  if (lastCol > 0) {
    const headerRow = sheet.getRange(1, 1, 1, lastCol).getValues()[0];
    for (let i = 0; i < headerRow.length; i++) {
      if (String(headerRow[i]).trim().toLowerCase() === headerName.toLowerCase()) {
        return i + 1;
      }
    }
  }
  // Not found — create it
  const newCol = lastCol + 1;
  sheet.getRange(1, newCol).setValue(headerName).setFontWeight("bold").setBackground("#f3f4f6");
  SpreadsheetApp.flush();
  return newCol;
}

function fmtDate(ss, date) {
  return Utilities.formatDate(date, ss.getSpreadsheetTimeZone(), "dd/MMM/yyyy");
}

function parseSheetDate(dateStr) {
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const parts = String(dateStr).split('/');
  if (parts.length === 3) {
    return new Date(parseInt(parts[2]), months.indexOf(parts[1]), parseInt(parts[0]));
  }
  return new Date(dateStr);
}

function jsonOk(data) {
  return ContentService.createTextOutput(JSON.stringify(Object.assign({ success: true }, data)))
    .setMimeType(ContentService.MimeType.JSON);
}
function jsonErr(msg) {
  return ContentService.createTextOutput(JSON.stringify({ success: false, error: msg }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─────────────────────────────────────────────
// GET — returns sheet rows as JSON objects keyed by lowercase header
// Also supports ?action=test to verify deployment
// ─────────────────────────────────────────────
function doGet(e) {
  if (e.parameter.action === 'test') {
    return ContentService.createTextOutput(
      JSON.stringify({ ok: true, version: '3.0', time: new Date().toISOString() })
    ).setMimeType(ContentService.MimeType.JSON);
  }

  const ss    = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(e.parameter.sheetName);
  if (!sheet) {
    return ContentService.createTextOutput(JSON.stringify({ data: [], message: 'Sheet not found' }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  const raw     = sheet.getDataRange().getValues();
  const headers = raw.shift();
  const data    = raw.map(function(row) {
    const obj = {};
    headers.forEach(function(h, i) {
      const key = String(h).trim().toLowerCase().replace(/\s+/g, '');
      let val   = row[i];
      if (val instanceof Date) val = fmtDate(ss, val);
      obj[key]  = (val !== undefined && val !== null) ? val : '';
    });
    return obj;
  });

  return ContentService.createTextOutput(JSON.stringify({ data: data }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ─────────────────────────────────────────────
// POST — routes to correct sub-handler
// ─────────────────────────────────────────────
function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const ss      = SpreadsheetApp.getActiveSpreadsheet();
    if (payload.action === 'markPaid')      return handleMarkPaid(ss, payload);
    if (payload.action === 'markMonthPaid') return handleMarkMonthPaid(ss, payload);
    return handleAddMilk(ss, payload);
  } catch (err) {
    Logger.log('doPost ERROR: ' + err.toString() + '\n' + err.stack);
    return jsonErr(err.toString());
  }
}

// ─────────────────────────────────────────────
// ADD / UPDATE a daily milk entry
// ─────────────────────────────────────────────
function handleAddMilk(ss, payload) {
  const months    = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  const date      = parseSheetDate(payload.date);
  const sheetName = months[date.getMonth()] + ' ' + date.getFullYear();

  // Get or create the month sheet with all standard headers
  let sheet = ss.getSheetByName(sheetName);
  if (!sheet) {
    sheet = ss.insertSheet(sheetName);
    sheet.appendRow(["Date","Morning","Evening","UnitPrice","DailyCost","AdvancePaid","AmountTaken","Remarks","Status","Stage","PaymentAmount","PaymentMode","PaymentRemarks","PaymentDate"]);
    sheet.getRange(1, 1, 1, 14).setFontWeight("bold").setBackground("#f3f4f6");
    SpreadsheetApp.flush();
  }

  // Ensure every required column exists (auto-creates if missing + flushes)
  const dailyCostCol = getOrCreateCol(sheet, "DailyCost");
  const advancePaidCol = getOrCreateCol(sheet, "AdvancePaid");
  const amountTakenCol = getOrCreateCol(sheet, "AmountTaken");
  const remarksCol = getOrCreateCol(sheet, "Remarks");
  const statusCol  = getOrCreateCol(sheet, "Status");   // Paid / Unpaid column
  const stageCol   = getOrCreateCol(sheet, "Stage");    // Draft / Completed column
  const paymentAmountCol = getOrCreateCol(sheet, "PaymentAmount");
  const paymentModeCol = getOrCreateCol(sheet, "PaymentMode");
  const paymentRemarksCol = getOrCreateCol(sheet, "PaymentRemarks");
  const paymentDateCol = getOrCreateCol(sheet, "PaymentDate");

  Logger.log('handleAddMilk → sheetName=' + sheetName + ' stageCol=' + stageCol + ' payload.stage=' + payload.stage);

  // Normalize the stage value sent from the browser
  const stageVal = (String(payload.stage || 'completed').trim().toLowerCase() === 'draft') ? 'draft' : 'completed';

  // Find existing row for this date
  const formattedDate = fmtDate(ss, date);
  const allData       = sheet.getDataRange().getValues();
  let existingRow     = -1;
  for (let i = 1; i < allData.length; i++) {
    const cellVal    = allData[i][0];
    const cellDateStr = (cellVal instanceof Date) ? fmtDate(ss, cellVal) : String(cellVal).trim();
    if (cellDateStr === formattedDate) {
      existingRow = i + 1;
      break;
    }
  }

  if (existingRow > 0) {
    // ── UPDATE existing row ──
    sheet.getRange(existingRow, 1).setValue(formattedDate);
    sheet.getRange(existingRow, 2).setValue(Number(payload.morning)   || 0);
    sheet.getRange(existingRow, 3).setValue(Number(payload.evening)   || 0);
    sheet.getRange(existingRow, 4).setValue(Number(payload.unitPrice) || 80);
    sheet.getRange(existingRow, dailyCostCol).setValue(Number(payload.dailyCost) || 0);
    sheet.getRange(existingRow, advancePaidCol).setValue(Number(payload.advancePaid) || 0);
    sheet.getRange(existingRow, amountTakenCol).setValue(Number(payload.amountTaken) || 0);
    sheet.getRange(existingRow, remarksCol).setValue(payload.remarks || "");
    sheet.getRange(existingRow, stageCol).setValue(stageVal);
    // Entry edits should clear month payment metadata until re-marked paid.
    sheet.getRange(existingRow, paymentAmountCol).setValue("");
    sheet.getRange(existingRow, paymentModeCol).setValue("");
    sheet.getRange(existingRow, paymentRemarksCol).setValue("");
    sheet.getRange(existingRow, paymentDateCol).setValue("");

    // Keep Paid rows as Paid. If blank/unknown, set to Unpaid.
    const currentStatus = String(sheet.getRange(existingRow, statusCol).getValue() || '').trim().toLowerCase();
    if (currentStatus !== 'paid') {
      sheet.getRange(existingRow, statusCol).setValue("Unpaid");
    }
  } else {
    // ── INSERT new row ──
    const newRow = sheet.getLastRow() + 1;
    sheet.getRange(newRow, 1).setValue(formattedDate);
    sheet.getRange(newRow, 2).setValue(Number(payload.morning)   || 0);
    sheet.getRange(newRow, 3).setValue(Number(payload.evening)   || 0);
    sheet.getRange(newRow, 4).setValue(Number(payload.unitPrice) || 80);
    sheet.getRange(newRow, dailyCostCol).setValue(Number(payload.dailyCost) || 0);
    sheet.getRange(newRow, advancePaidCol).setValue(Number(payload.advancePaid) || 0);
    sheet.getRange(newRow, amountTakenCol).setValue(Number(payload.amountTaken) || 0);
    sheet.getRange(newRow, remarksCol).setValue(payload.remarks || "");
    sheet.getRange(newRow, stageCol).setValue(stageVal);
    sheet.getRange(newRow, statusCol).setValue("Unpaid");
    sheet.getRange(newRow, paymentAmountCol).setValue("");
    sheet.getRange(newRow, paymentModeCol).setValue("");
    sheet.getRange(newRow, paymentRemarksCol).setValue("");
    sheet.getRange(newRow, paymentDateCol).setValue("");
  }

  // Backfill this month's blanks so Status column is consistently populated
  const finalLastRow = sheet.getLastRow();
  for (let r = 2; r <= finalLastRow; r++) {
    const s = String(sheet.getRange(r, statusCol).getValue() || '').trim();
    if (!s) {
      sheet.getRange(r, statusCol).setValue("Unpaid");
    }
  }

  return jsonOk({ date: formattedDate, stage: stageVal, stageCol: stageCol });
}

// ─────────────────────────────────────────────
// MARK one date as PAID
// ─────────────────────────────────────────────
function handleMarkPaid(ss, payload) {
  const sheet = ss.getSheetByName(payload.sheetName);
  if (!sheet) return jsonErr('Sheet not found: ' + payload.sheetName);
  const statusCol = getOrCreateCol(sheet, "Status");
  const allData   = sheet.getDataRange().getValues();
  for (let i = 1; i < allData.length; i++) {
    const cellVal    = allData[i][0];
    const cellDateStr = (cellVal instanceof Date) ? fmtDate(ss, cellVal) : String(cellVal).trim();
    if (cellDateStr === payload.date) {
      sheet.getRange(i + 1, statusCol).setValue("Paid");
      return jsonOk({ markedDate: payload.date });
    }
  }
  return jsonErr('Date not found: ' + payload.date);
}

// ─────────────────────────────────────────────
// MARK entire month as PAID
// ─────────────────────────────────────────────
function handleMarkMonthPaid(ss, payload) {
  const sheet = ss.getSheetByName(payload.sheetName);
  if (!sheet) return jsonErr('Sheet not found: ' + payload.sheetName);
  const statusCol = getOrCreateCol(sheet, "Status");
  const paymentAmountCol = getOrCreateCol(sheet, "PaymentAmount");
  const paymentModeCol = getOrCreateCol(sheet, "PaymentMode");
  const paymentRemarksCol = getOrCreateCol(sheet, "PaymentRemarks");
  const paymentDateCol = getOrCreateCol(sheet, "PaymentDate");
  const allData   = sheet.getDataRange().getValues();
  const paymentAmount = Number(payload.paymentAmount) || 0;
  const paymentMode = String(payload.paymentMode || 'full');
  const paymentRemarks = String(payload.paymentRemarks || '');
  const paymentDate = new Date();
  for (let i = 1; i < allData.length; i++) {
    sheet.getRange(i + 1, statusCol).setValue("Paid");
    sheet.getRange(i + 1, paymentAmountCol).setValue(paymentAmount);
    sheet.getRange(i + 1, paymentModeCol).setValue(paymentMode);
    sheet.getRange(i + 1, paymentRemarksCol).setValue(paymentRemarks);
    sheet.getRange(i + 1, paymentDateCol).setValue(paymentDate);
  }
  return jsonOk({ markedSheet: payload.sheetName, rows: allData.length - 1, paymentAmount: paymentAmount, paymentMode: paymentMode });
}
