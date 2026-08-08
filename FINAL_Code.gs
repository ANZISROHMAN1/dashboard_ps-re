function doGet(e) {
  return HtmlService.createTemplateFromFile('Index')
    .evaluate()
    .setTitle('PS/RE Monitoring Dashboard')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL)
    .addMetaTag('viewport', 'width=device-width, initial-scale=1');
}

// Custom function to find the real last row based on column A
function getTrueLastRow(sheet) {
  const data = sheet.getRange("A1:A").getValues();
  for (let i = data.length - 1; i >= 0; i--) {
    if (data[i][0] && data[i][0].toString().trim() !== "") {
      return i + 1;
    }
  }
  return 1;
}

function getDashboardData() {
  try {
    const ss = SpreadsheetApp.getActiveSpreadsheet();
    if (!ss) {
      throw new Error("Script is not bound to a Spreadsheet. Please open the Google Sheet, go to Extensions > Apps Script, and run it from there.");
    }
    
    const sheetPS = ss.getSheetByName('DATA PS');
    const sheetRE = ss.getSheetByName('DATA RE');
    const sheetMapping = ss.getSheetByName('MAPPING');
    
    if (!sheetPS || !sheetRE || !sheetMapping) {
      throw new Error("One or more required sheets (DATA PS, DATA RE, MAPPING) are missing.");
    }

    // Optimize memory by finding the TRUE last row (ignoring blank formatted rows)
    const psLastRow = getTrueLastRow(sheetPS);
    const reLastRow = getTrueLastRow(sheetRE);
    const mappingLastRow = getTrueLastRow(sheetMapping);

    // Fetch up to column 67 (Index 66) because DATA PS and DATA RE need index 66 (TANGGAL)
    const dataPS = sheetPS.getRange(1, 1, psLastRow, 67).getValues();
    const dataRE = sheetRE.getRange(1, 1, reLastRow, 67).getValues();
    const mapping = sheetMapping.getRange(1, 1, mappingLastRow, 10).getValues();
  
  // Create Date object for TODAY to match exactly with Excel's TODAY()
  const now = new Date();
  const todayStr = _formatDate(now);
  
  // Maps to aggregate data
  const stoAggregations = {};
  
  for (let i = 1; i < mapping.length; i++) {
    const row = mapping[i];
    const stoCode = row[0]; // STO CODE LOCATION
    if (!stoCode) continue;
    
    stoAggregations[stoCode] = {
      district: String(row[5] || ''),     // DISTRICT
      serviceArea: String(row[8] || ''),  // SERVICE AREA
      mitra: String(row[9] || ''),        // MITRA STAR
      reHI: 0, reMTD: 0, psHI: 0, psMTD: 0,
      reHIHomeId: 0, reMTDHomeId: 0, psHIHomeId: 0, psMTDHomeId: 0
    };
  }
  
  // 2. Process DATA RE
  for (let i = 1; i < dataRE.length; i++) {
    const row = dataRE[i];
    const sto = row[6];
    if (!sto || !stoAggregations[sto]) continue;
    
    const homePassId = String(row[60] || '').trim().toUpperCase();
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
  for (let i = 1; i < dataPS.length; i++) {
    const row = dataPS[i];
    const sto = row[10];
    if (!sto || !stoAggregations[sto]) continue;
    
    const homePassId = String(row[57] || '').trim().toUpperCase();
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
  
  for (const sto in stoAggregations) {
    const data = stoAggregations[sto];
    // Abaikan jika District kosong atau bernama UNKNOWN
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
    dateStr: todayStr
  };
  
  } catch (e) {
    return {
      success: false,
      error: e.toString()
    };
  }
}

// ---------------- Helper Functions ----------------

function _formatDate(dateObj) {
  const d = new Date(dateObj);
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
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
    try {
      const formatted = Utilities.formatDate(dObj, "GMT+7", "yyyy-MM-dd");
      if (formatted === todayStr) return true;
    } catch(e) {
      const yObj = dObj.getFullYear();
      const mObj = String(dObj.getMonth() + 1).padStart(2, '0');
      const dayObj = String(dObj.getDate()).padStart(2, '0');
      if (`${yObj}-${mObj}-${dayObj}` === todayStr) return true;
    }
  }
  
  return false;
}
