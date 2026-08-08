import requests
import json

url = "https://script.google.com/macros/s/AKfycbxp0hjiaqTMYj_Iyz64VzDjeXJNj6vQ1EQRUakdlFuJV7nEKUtREYRKb3uaVzITr0Wc/exec"
payload = {"sheetName": "DATA PS", "data": []}
headers = {'Content-Type': 'application/json'}

try:
    response = requests.post(url, data=json.dumps(payload), headers=headers, allow_redirects=True)
    print("Status Code:", response.status_code)
    print("Content:", response.text[:200])
except Exception as e:
    print("Error:", e)
