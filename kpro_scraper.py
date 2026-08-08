import asyncio
from playwright.async_api import async_playwright
import pandas as pd
import requests
import json
import datetime
import webbrowser
import generate_dashboard

# URL Web App Apps Script
APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbyAIbimD1K6c40evOHSNzsjMivrFQAXRJOmp5kYZWgyauwhHcN0KiIrYKTU459owC1s/exec"

def process_and_upload(file_path, sheet_name):
    print(f"\nMemproses file untuk {sheet_name}...")
    try:
        # Baca Excel (menggunakan read_html karena sistem sering mengekspor HTML dengan ekstensi .xlsx)
        try:
            df = pd.read_excel(file_path, header=None)
            df_sliced = df.iloc[1:, :66] # Jika benar-benar Excel, baris 0 adalah header
        except ValueError:
            # Jika "Excel file format cannot be determined", gunakan read_html
            dfs = pd.read_html(file_path)
            df = dfs[0]
            df_sliced = df.iloc[:, :66] # Karena read_html otomatis memisahkan header, ambil semua baris data
        
        # Format Tanggal menjadi dd/mm/yyyy
        # DATA RE -> Kolom U (indeks 20)
        # DATA PS -> Kolom Z (indeks 25)
        date_col_idx = 20 if sheet_name == 'DATA RE' else 25
        
        def format_date(val):
            if pd.isna(val): return ""
            try:
                # Coba parse sebagai datetime, paksa format DD/MM/YYYY
                return pd.to_datetime(val).strftime("%d/%m/%Y")
            except:
                return str(val)
        
        # Aplikasikan format
        df_sliced.iloc[:, date_col_idx] = df_sliced.iloc[:, date_col_idx].apply(format_date)
        
        # Ubah NaN menjadi string kosong agar JSON valid
        df_sliced = df_sliced.fillna("")
        
        # Konversi ke List of Lists (2D Array)
        data_to_send = df_sliced.values.tolist()
        
        if len(data_to_send) == 0:
            print(f"⚠️ PERINGATAN: File {sheet_name} dari KPRO kosong (0 baris data)!")
            return False
            
        print(f"✅ Data valid! Mengirim {len(data_to_send)} baris ke {sheet_name} di Google Sheets...")
        
        # Kirim ke Apps Script via POST
        payload = {
            "sheetName": sheet_name,
            "data": data_to_send
        }
        
        if APPS_SCRIPT_URL == "MASUKKAN_URL_WEB_APP_DISINI":
            print(f"⚠️ PERINGATAN: APPS_SCRIPT_URL belum diisi! Data tidak terkirim.")
            print(f"File hasil potongan tersimpan sementara sebagai {sheet_name}.xlsx")
            df_sliced.to_excel(f"{sheet_name}_cleaned.xlsx", index=False, header=False)
            return False
            
        headers = {'Content-Type': 'application/json'}
        response = requests.post(APPS_SCRIPT_URL, data=json.dumps(payload), headers=headers)
        
        if response.status_code == 200:
            result = response.json()
            if result.get('success'):
                print(f"🎉 SUKSES: {sheet_name} berhasil diupdate di Google Sheet!")
                return True
            else:
                print(f"❌ GAGAL: Apps Script merespon dengan error: {result.get('error')}")
                return False
        else:
            print(f"❌ GAGAL HTTP: Status code {response.status_code}")
            return False
            
    except Exception as e:
        print(f"❌ ERROR SAAT MEMPROSES: {str(e)}")
        return False

async def main():
    import os
    async with async_playwright() as p:
        print("\n🚀 Memulai Robot Scraper KPRO...")
        # Buka browser dengan Persistent Context agar sesi login (Cookies/Token) TERSIMPAN otomatis!
        profile_path = os.path.join(os.getcwd(), "kpro_profile")
        context = await p.chromium.launch_persistent_context(
            user_data_dir=profile_path,
            channel="chrome", # Menggunakan Google Chrome asli milik pengguna
            headless=False,
            accept_downloads=True
        )
        
        # Ambil tab pertama yang terbuka
        page = context.pages[0] if len(context.pages) > 0 else await context.new_page()
        
        # Buka URL KPRO
        await page.goto("https://kpro.telkom.co.id/kpro/pstelkom/perbulanendstate")
        
        print("\n=========================================================")
        print("1️⃣ TAHAP 1: DATA RE (Fulfillment Endstate)")
        print("Silakan kerjakan instruksi berikut di browser yang terbuka:")
        print("   - Lakukan Login, isi OTP, dan Captcha.")
        print("   - Masuk ke menu: End State -> Fulfillment Endstate.")
        print("   - Filter (Teritory: TIF, Area: AREA 2, Regional: EASTERN JABOTABEK).")
        print("   - Klik SUBMIT, lalu klik ANGKA TOTAL PALING BAWAH POJOK KANAN (misal angka 2.202).")
        print("Robot ini sedang MENUNGGU proses download tersebut...")
        print("=========================================================\n")
        
        # Tunggu download PERTAMA (DATA RE) menggunakan Loop agar bisa retry jika kosong
        while True:
            async with page.expect_download(timeout=0) as download_info:
                pass 
                
            download = await download_info.value
            path_re = "KPRO_RE_DOWNLOAD.xlsx"
            await download.save_as(path_re)
            print(f"\n📥 File DATA RE terdeteksi dan diunduh ke: {path_re}")
            
            # Proses & Upload
            if process_and_upload(path_re, "DATA RE"):
                break # Berhasil! Keluar dari loop
            else:
                print("\n🔁 Sistem KPRO mengeluarkan file kosong/error! Silakan KLIK LAGI angkanya di browser...")
        
        print("\n=========================================================")
        print("2️⃣ TAHAP 2: DATA PS (PS Bulanan End State)")
        print("Silakan lanjutkan di browser yang sama:")
        print("   - Masuk ke menu: End State -> PS Bulanan End State.")
        print("   - Filter (Teritory: TIF, Area: AREA 2, Regional: ALL).")
        print("   - Klik SUBMIT, lalu klik ANGKA TOTAL di bulan Agustus baris Eastern Jabotabek (misal angka 1.943).")
        print("Robot ini sedang MENUNGGU proses download kedua...")
        print("=========================================================\n")
        
        # Tunggu download KEDUA (DATA PS) menggunakan Loop
        while True:
            async with page.expect_download(timeout=0) as download_info2:
                pass 
                
            download2 = await download_info2.value
            path_ps = "KPRO_PS_DOWNLOAD.xlsx"
            await download2.save_as(path_ps)
            print(f"\n📥 File DATA PS terdeteksi dan diunduh ke: {path_ps}")
            
            # Proses & Upload
            if process_and_upload(path_ps, "DATA PS"):
                break # Berhasil! Keluar dari loop
            else:
                print("\n🔁 Sistem KPRO mengeluarkan file kosong/error! Silakan KLIK LAGI angkanya di browser...")
        
        print("\n✅ SEMUA DATA BERHASIL DI-DOWNLOAD DAN DI-UPLOAD!")
        
        # Panggil generator dashboard lokal (yang kini mendownload ulang dari Google Sheets agar dapet formula)
        try:
            dashboard_path = generate_dashboard.generate()
            print(f"\n🌐 Membuka Dashboard di Browser: {dashboard_path}")
            webbrowser.open('file://' + dashboard_path)
        except Exception as e:
            print(f"\n❌ Gagal membuat Dashboard Lokal: {e}")
            
        print("\n✅ Robot akan menutup browser KPRO dalam 5 detik...")
        await asyncio.sleep(5)
        await context.close()

if __name__ == "__main__":
    asyncio.run(main())
