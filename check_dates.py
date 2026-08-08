import pandas as pd

file_path = "https://docs.google.com/spreadsheets/d/1LVRPixx9BfJMbaPJpCRWZs_mxLO5aUnGEeFiefnfG5g/export?format=xlsx"

print("Fetching data from Google Sheet...")
df_re = pd.read_excel(file_path, sheet_name='DATA RE', header=None)
df_ps = pd.read_excel(file_path, sheet_name='DATA PS', header=None)

print("\n--- SAMPLE TANGGAL RE (Column 66) ---")
print(df_re[66].dropna().head(10).tolist())

print("\n--- SAMPLE TANGGAL PS (Column 66) ---")
print(df_ps[66].dropna().head(10).tolist())
