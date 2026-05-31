// ─────────────────────────────────────────────────────────────────────────────
// Google Apps Script — à coller dans Extensions > Apps Script de votre Sheets
// ─────────────────────────────────────────────────────────────────────────────

const SHEET_ID = "1thpB8XTpMd2c2l15GJMU089XkUog5S5ePeIMe6FddV0";
const SHEET_NAME = "Commandes";

function doGet(e) {
  const action = e.parameter.action;
  if (action === "getOrders") {
    return getOrders();
  }
  return ContentService.createTextOutput("OK");
}

function doPost(e) {
  const data = JSON.parse(e.postData.contents);
  if (data.action === "updateStatus") {
    updateStatus(data.row, data.status);
  }
  return ContentService.createTextOutput("OK");
}

function getOrders() {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  const lastRow = sheet.getLastRow();
  if (lastRow < 2) {
    return ContentService.createTextOutput(JSON.stringify([]))
      .setMimeType(ContentService.MimeType.JSON);
  }
  const data = sheet.getRange(2, 1, lastRow - 1, 10).getValues();
  const filtered = data.filter(row => row[1] !== "");
  return ContentService.createTextOutput(JSON.stringify(filtered))
    .setMimeType(ContentService.MimeType.JSON);
}

function updateStatus(row, status) {
  const sheet = SpreadsheetApp.openById(SHEET_ID).getSheetByName(SHEET_NAME);
  sheet.getRange(row, 10).setValue(status);
}
