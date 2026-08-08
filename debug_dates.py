import pandas as pd
import datetime

file_path = "https://docs.google.com/spreadsheets/d/1LVRPixx9BfJMbaPJpCRWZs_mxLO5aUnGEeFiefnfG5g/export?format=xlsx"

print("Fetching data from Google Sheet...")
df_re = pd.read_excel(file_path, sheet_name='DATA RE', header=None)

today_str = datetime.datetime.now().strftime("%Y-%m-%d")
today_str_ind = datetime.datetime.now().strftime("%d/%m/%Y")

print(f"Server today_str: {today_str}")
print(f"Server today_str_ind: {today_str_ind}")

matches_found = 0
for index, row in df_re.iloc[1:].iterrows():
    val = row[66] # BO
    if pd.isna(val): continue
    
    val_str = str(val)
    if '06' in val_str and '08' in val_str: # Cari manual tanggal 6 Agustus
        print(f"Row {index} RE: Type: {type(val)}, Value: {repr(val)}, str(val): {repr(val_str)}")
        matches_found += 1
        if matches_found > 10:
            break

if matches_found == 0:
    print("NO ROWS WITH '06' and '08' FOUND IN COLUMN BO!")
