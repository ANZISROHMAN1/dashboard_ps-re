import pandas as pd
import datetime

today_str = "2026-08-07"
today_str_ind = "07/08/2026"
today_m_d_y = "8/7/2026"
today_d_m_y = "7/8/2026"

def is_date_match(val):
    if pd.isna(val): return False
    val_str = str(val).strip()
    if today_str in val_str or today_str_ind in val_str: 
        return True
    if today_m_d_y in val_str or today_d_m_y in val_str:
        return True
    
    try:
        # try without dayfirst
        if pd.to_datetime(val).strftime("%Y-%m-%d") == today_str: return True
    except:
        pass

    try:
        if pd.to_datetime(val, dayfirst=True).strftime("%Y-%m-%d") == today_str: return True
    except:
        pass
    
    return False

print(is_date_match("8/7/2026"))
print(is_date_match("08/07/2026"))
print(is_date_match("2026-08-07 15:30:00"))
