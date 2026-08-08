function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('PS/RE Monitoring Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

function getDashboardData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      throw new Error("Script is not bound to a Spreadsheet. Please open the Google Sheet, go to Extensions > Apps Script, and run it from there.");
    }
    
    // 1. Get raw data with specific ranges to avoid reading millions of empty rows
    const sheetPS = ss.getSheetByName('DATA PS');
    const sheetRE = ss.getSheetByName('DATA RE');
    const sheetMapping = ss.getSheetByName('MAPPING');
    
    if (!sheetPS || !sheetRE || !sheetMapping) {
      throw new Error("One or more required sheets (DATA PS, DATA RE, MAPPING) are missing.");
    }

    // Helper: Find actual last row by checking Column A, to avoid reading thousands of empty formula rows
    function getActualLastRow(sheet) {
      const maxRows = sheet.getLastRow();
      if (maxRows <= 1) return 1;
      const colA = sheet.getRange(1, 1, maxRows, 1).getValues();
      for (let i = maxRows - 1; i > 0; i--) {
        if (colA[i][0] !== "") {
          return i + 1;
        }
      }
      return 1;
    }

    // Optimize: Fetch only up to the actual last data row
    const psLastRow = getActualLastRow(sheetPS);
    const reLastRow = getActualLastRow(sheetRE);
    const mappingLastRow = getActualLastRow(sheetMapping);

    // Fetch up to column 67 (Index 66) because DATA PS and DATA RE need index 66 (TANGGAL)
    const dataPS = sheetPS.getRange(1, 1, psLastRow, 67).getValues();
    const dataRE = sheetRE.getRange(1, 1, reLastRow, 67).getValues();
    const mapping = sheetMapping.getRange(1, 1, mappingLastRow, 10).getValues();
  
  // Create Date object for TODAY to match exactly with Excel's TODAY()
  // Ensure we strip time for exact date comparison
  const now = new Date();
  const todayStr = _formatDate(now);
  
  // Maps to aggregate data
  const stoAggregations = {};
  
  // Initialize MAPPING STOs
  // Assuming mapping header is on row 1 (index 0)
  for (let i = 1; i < mapping.length; i++) {
    const row = mapping[i];
    const stoCode = row[0]; // STO CODE LOCATION
    if (!stoCode) continue;
    
    stoAggregations[stoCode] = {
      district: String(row[5] || ''),     // DISTRICT
      serviceArea: String(row[8] || ''),  // SERVICE AREA
      mitra: String(row[9] || ''),        // MITRA STAR
      reHI: 0,
      reMTD: 0,
      psHI: 0,
      psMTD: 0,
      reHIHomeId: 0,
      reMTDHomeId: 0,
      psHIHomeId: 0,
      psMTDHomeId: 0
    };
  }
  
  // 2. Process DATA RE
  // Columns: STO = index 6, HOMEPASSID = index 60, TANGGAL RE = index 66
  for (let i = 1; i < dataRE.length; i++) {
    const row = dataRE[i];
    const sto = row[6];
    if (!sto || !stoAggregations[sto]) continue;
    
    const homePassId = row[60];
    const tanggalRE = row[66];
    
    // RE MTD
    stoAggregations[sto].reMTD++;
    if (homePassId === 'HOMEPASSID') {
      stoAggregations[sto].reMTDHomeId++;
    }
    
    // RE HI
    if (_isDateMatch(tanggalRE, todayStr)) {
      stoAggregations[sto].reHI++;
      if (homePassId === 'HOMEPASSID') {
        stoAggregations[sto].reHIHomeId++;
      }
    }
  }
  
  // 3. Process DATA PS
  // Columns: STO = index 10, FLAG_HOMEPASSID = index 57, TANGGAL PS = index 66
  for (let i = 1; i < dataPS.length; i++) {
    const row = dataPS[i];
    const sto = row[10];
    if (!sto || !stoAggregations[sto]) continue;
    
    const homePassId = row[57];
    const tanggalPS = row[66];
    
    // PS MTD
    stoAggregations[sto].psMTD++;
    if (homePassId === 'HOMEPASSID') {
      stoAggregations[sto].psMTDHomeId++;
    }
    
    // PS HI
    if (_isDateMatch(tanggalPS, todayStr)) {
      stoAggregations[sto].psHI++;
      if (homePassId === 'HOMEPASSID') {
        stoAggregations[sto].psHIHomeId++;
      }
    }
  }
  
  // 4. Aggregate by District -> Service Area -> Mitra
  const reportData = {};
  // Format:
  // {
  //    "BEKASI": { // District
  //       "BEKASI|TELKOM AKSES": { serviceArea: "BEKASI", mitra: "TELKOM AKSES", ...totals }
  //    }
  // }
  
  for (const sto in stoAggregations) {
    const data = stoAggregations[sto];
    // Abaikan jika District atau Service Area kosong (karena di sheet REPORT Excel hal ini diabaikan)
    if (!data.district || !data.serviceArea || data.district.trim() === '' || data.district === 'UNKNOWN') continue;
    
    const district = data.district;
    const key = data.serviceArea + '|' + data.mitra;
    
    if (!reportData[district]) {
      reportData[district] = {};
    }
    
    if (!reportData[district][key]) {
      reportData[district][key] = {
        serviceArea: data.serviceArea,
        mitra: data.mitra,
        reHI: 0, reMTD: 0, psHI: 0, psMTD: 0,
        reHIHomeId: 0, reMTDHomeId: 0, psHIHomeId: 0, psMTDHomeId: 0
      };
    }
    
    const agg = reportData[district][key];
    agg.reHI += data.reHI;
    agg.reMTD += data.reMTD;
    agg.psHI += data.psHI;
    agg.psMTD += data.psMTD;
    agg.reHIHomeId += data.reHIHomeId;
    agg.reMTDHomeId += data.reMTDHomeId;
    agg.psHIHomeId += data.psHIHomeId;
    agg.psMTDHomeId += data.psMTDHomeId;
  }
  
  return {
    success: true,
    data: reportData,
    dateStr: _formatDateToUI(now)
  };
  } catch (e) {
    return {
      success: false,
      error: e.message + "\\nLine: " + e.lineNumber
    };
  }
}

// Helper Functions
function _formatDate(dateObj) {
  if (!dateObj || !(dateObj instanceof Date)) return '';
  const d = new Date(dateObj);
  const month = '' + (d.getMonth() + 1);
  const day = '' + d.getDate();
  const year = d.getFullYear();
  return [year, month.padStart(2, '0'), day.padStart(2, '0')].join('-');
}

function _isDateMatch(dateValue, todayStr) {
  if (!dateValue) return false;
  
  const str = String(dateValue).trim();
  
  if (str.includes(todayStr)) return true;
  
  const parts = todayStr.split('-');
  if (parts.length === 3) {
    const y = parts[0];
    const m = parts[1]; 
    const d = parts[2]; 
    
    const mInt = parseInt(m, 10).toString();
    const dInt = parseInt(d, 10).toString();
    
    const possibleFormats = [
      `${d}/${m}/${y}`,
      `${m}/${d}/${y}`,
      `${dInt}/${mInt}/${y}`,
      `${mInt}/${dInt}/${y}`,
      `${y}/${m}/${d}`
    ];
    
    for (let i = 0; i < possibleFormats.length; i++) {
      if (str.includes(possibleFormats[i])) return true;
    }
  }
  
  const dObj = new Date(dateValue);
  if (!isNaN(dObj.getTime())) {
    const yObj = dObj.getFullYear();
    const mObj = String(dObj.getMonth() + 1).padStart(2, '0');
    const dayObj = String(dObj.getDate()).padStart(2, '0');
    if (`${yObj}-${mObj}-${dayObj}` === todayStr) return true;
  }
  
  return false;
}

function _formatDateToUI(dateObj) {
  const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
  const day = String(dateObj.getDate()).padStart(2, '0');
  const month = months[dateObj.getMonth()];
  const year = dateObj.getFullYear();
  
  const hours = String(dateObj.getHours()).padStart(2, '0');
  const minutes = String(dateObj.getMinutes()).padStart(2, '0');
  
  return `${day} ${month} ${year} | Jam ${hours}:${minutes}`;
}
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

