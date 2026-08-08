import pandas as pd
import sys

file_path = "KPRO_RE_DOWNLOAD.xlsx"
print(f"Reading {file_path} using read_html...")
try:
    dfs = pd.read_html(file_path)
    df = dfs[0]
    print(f"Successfully read! Shape: {df.shape}")
    print("First few columns:")
    print(df.columns.tolist()[:10])
except Exception as e:
    print(f"Error reading HTML: {e}")
