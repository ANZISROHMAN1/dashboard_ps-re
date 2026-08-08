function doPost(e) {
  try {
    const payload = JSON.parse(e.postData.contents);
    const sheetName = payload.sheetName; // 'DATA RE' atau 'DATA PS'
    const data = payload.data; // 2D array of data

    const ss = SpreadsheetApp.getActiveSpreadsheet();
    const sheet = ss.getSheetByName(sheetName);
    
    if (!sheet) {
      return ContentService.createTextOutput(JSON.stringify({success: false, error: "Sheet not found: " + sheetName})).setMimeType(ContentService.MimeType.JSON);
    }
    
    // Kita hapus data lama mulai dari baris ke-2 (baris 1 adalah header)
    const lastRow = sheet.getLastRow();
    const lastCol = sheet.getLastColumn();
    if (lastRow > 1) {
      // Kita hanya hapus sampai kolom BN (kolom ke-66)
      sheet.getRange(2, 1, lastRow - 1, 66).clearContent();
    }
    
    // Tulis data baru
    if (data && data.length > 0) {
      // Pastikan lebar data tidak melebihi kolom BN (66 kolom)
      const maxColumns = Math.min(data[0].length, 66);
      const rowsToWrite = data.map(row => row.slice(0, maxColumns)); // slice array tiap baris
      
      sheet.getRange(2, 1, rowsToWrite.length, maxColumns).setValues(rowsToWrite);
    }
    
    return ContentService.createTextOutput(JSON.stringify({success: true, message: "Data written to " + sheetName})).setMimeType(ContentService.MimeType.JSON);
    
  } catch (err) {
    return ContentService.createTextOutput(JSON.stringify({success: false, error: err.message})).setMimeType(ContentService.MimeType.JSON);
  }
}
