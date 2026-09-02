import pandas as pd
import json
import datetime
import os

def generate():
    print("\\n📊 [Dashboard] Memulai pembuatan Dashboard Lokal...")
    
    print("[Dashboard] Mendownload seluruh data dari Google Sheet (MAPPING, DATA RE, DATA PS)...")
    print("⏳ Mohon tunggu sekitar 15-20 detik karena file berukuran besar dan berisi banyak rumus (formula)...")
    
    file_path = "https://docs.google.com/spreadsheets/d/1LVRPixx9BfJMbaPJpCRWZs_mxLO5aUnGEeFiefnfG5g/export?format=xlsx"
    
    df_mapping = pd.read_excel(file_path, sheet_name='MAPPING', header=None)
    df_re = pd.read_excel(file_path, sheet_name='DATA RE', header=None)
    df_ps = pd.read_excel(file_path, sheet_name='DATA PS', header=None)

    stoAggregations = {}

    # 1. Process MAPPING
    for index, row in df_mapping.iloc[1:].iterrows():
        stoCode = str(row[0]).strip()
        if pd.isna(row[0]) or not stoCode or stoCode == 'nan':
            continue

        stoAggregations[stoCode] = {
            'district': str(row[5]).strip() if pd.notna(row[5]) else '',
            'serviceArea': str(row[8]).strip() if pd.notna(row[8]) else '',
            'mitra': str(row[9]).strip() if pd.notna(row[9]) else '',
            'reHI': 0, 'reMTD': 0, 'psHI': 0, 'psMTD': 0,
            'reHIHomeId': 0, 'reMTDHomeId': 0, 'psHIHomeId': 0, 'psMTDHomeId': 0
        }

    # Cari tanggal terbaru (Maksimal) dari DATA RE dan DATA PS (kolom 66 / index 66)
    # Ini sangat penting karena data KPRO biasanya H-1, jadi jika script dijalankan hari ini, "Hari Ini" harus mengacu ke H-1
    dates_re = pd.to_datetime(df_re[66].dropna(), errors='coerce', dayfirst=True)
    dates_ps = pd.to_datetime(df_ps[66].dropna(), errors='coerce', dayfirst=True)
    all_dates = pd.concat([dates_re, dates_ps]).dropna()
    
    if not all_dates.empty:
        latest_date = all_dates.max()
        today_str = latest_date.strftime("%Y-%m-%d")
        today_str_ind = latest_date.strftime("%d/%m/%Y")
        today_d = latest_date.day
        today_m = latest_date.month
        today_y = latest_date.year
        today_m_d_y = f"{today_m}/{today_d}/{today_y}"
        today_d_m_y = f"{today_d}/{today_m}/{today_y}"
    else:
        # Fallback jika sheet kosong
        now = datetime.datetime.now()
        today_str = now.strftime("%Y-%m-%d")
        today_str_ind = now.strftime("%d/%m/%Y")
        today_m_d_y = f"{now.month}/{now.day}/{now.year}"
        today_d_m_y = f"{now.day}/{now.month}/{now.year}"

    def is_date_match(val):
        if pd.isna(val): return False
        val_str = str(val).strip()
        if today_str_ind in val_str or today_str in val_str: 
            return True
        if today_m_d_y in val_str or today_d_m_y in val_str:
            return True

        try:
            # try parsing standard
            if pd.to_datetime(val).strftime("%Y-%m-%d") == today_str: return True
        except:
            pass

        try:
            # try parsing with dayfirst
            if pd.to_datetime(val, dayfirst=True).strftime("%Y-%m-%d") == today_str: return True
        except:
            pass
            
        return False

    # 2. Process DATA RE
    for index, row in df_re.iloc[1:].iterrows():
        sto = str(row[6]).strip() if pd.notna(row[6]) else ''
        if not sto or sto not in stoAggregations:
            continue

        homePassId = str(row[60]).strip().upper() if pd.notna(row[60]) else ''
        tanggalRE = row[66]

        stoAggregations[sto]['reMTD'] += 1
        if homePassId == 'HOMEPASSID':
            stoAggregations[sto]['reMTDHomeId'] += 1

        if is_date_match(tanggalRE):
            stoAggregations[sto]['reHI'] += 1
            if homePassId == 'HOMEPASSID':
                stoAggregations[sto]['reHIHomeId'] += 1

    # 3. Process DATA PS
    for index, row in df_ps.iloc[1:].iterrows():
        sto = str(row[10]).strip() if pd.notna(row[10]) else ''
        if not sto or sto not in stoAggregations:
            continue

        homePassId = str(row[57]).strip().upper() if pd.notna(row[57]) else ''
        tanggalPS = row[66]

        stoAggregations[sto]['psMTD'] += 1
        if homePassId == 'HOMEPASSID':
            stoAggregations[sto]['psMTDHomeId'] += 1

        if is_date_match(tanggalPS):
            stoAggregations[sto]['psHI'] += 1
            if homePassId == 'HOMEPASSID':
                stoAggregations[sto]['psHIHomeId'] += 1

    # 4. Aggregate by District
    reportData = {}
    for sto, data in stoAggregations.items():
        district = data['district']
        sa = data['serviceArea']
        if not district or not sa or district == 'UNKNOWN':
            continue

        key = sa + '|' + data['mitra']
        if district not in reportData:
            reportData[district] = {}

        if key not in reportData[district]:
            reportData[district][key] = {
                'serviceArea': sa,
                'mitra': data['mitra'],
                'reHI': 0, 'reMTD': 0, 'psHI': 0, 'psMTD': 0,
                'reHIHomeId': 0, 'reMTDHomeId': 0, 'psHIHomeId': 0, 'psMTDHomeId': 0
            }

        agg = reportData[district][key]
        agg['reHI'] += data['reHI']
        agg['reMTD'] += data['reMTD']
        agg['psHI'] += data['psHI']
        agg['psMTD'] += data['psMTD']

        agg['reHIHomeId'] += data['reHIHomeId']
        agg['reMTDHomeId'] += data['reMTDHomeId']
        agg['psHIHomeId'] += data['psHIHomeId']
        agg['psMTDHomeId'] += data['psMTDHomeId']

    # Menyiapkan output HTML
    json_payload = json.dumps({
        "success": True,
        "data": reportData,
        "dateStr": today_str,
        "lastUpdateStr": datetime.datetime.now().strftime('%d %b %Y | %H:%M:%S')
    })

    with open("FINAL_Index.html", "r", encoding="utf-8") as f:
        html_content = f.read()

    # Ganti bagian google.script.run dengan inject JSON
    js_to_inject = f"""
        // INJECTED BY PYTHON LOCAL SCRIPT
        setTimeout(function() {{
            var response = {json_payload};
            initDashboard(response);
        }}, 100);
    """

    import re
    # Hapus google.script.run yang lama jika ada (menggunakan regex agar kebal dari masalah indentasi)
    html_content = re.sub(r'// Start fetching data immediately.*?}, 100\);', js_to_inject, html_content, flags=re.DOTALL)

    # Simpan sebagai Dashboard_Lokal.html
    with open("Dashboard_Lokal.html", "w", encoding="utf-8") as f:
        f.write(html_content)

    print("✅ [Dashboard] BERHASIL! File 'Dashboard_Lokal.html' telah dibuat dalam sekejap!")
    return os.path.abspath("Dashboard_Lokal.html")

if __name__ == "__main__":
    generate()
