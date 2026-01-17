import requests
import json

url = "https://cg5h2ba15i.execute-api.ap-south-1.amazonaws.com/prod"

try:
    print(f"Fetching {url}...")
    resp = requests.get(url)
    print(f"Status Code: {resp.status_code}")
    
    data = resp.json()
    print("Top level keys:", list(data.keys()))
    
    if 'body' in data:
        print("Body type:", type(data['body']))
        if isinstance(data['body'], str):
            try:
                inner = json.loads(data['body'])
                print("Inner body keys:", list(inner.keys()))
                if 'RealTimeDataMonitor' in inner:
                    print("RealTimeDataMonitor found. Type:", type(inner['RealTimeDataMonitor']))
                    print("Count:", len(inner['RealTimeDataMonitor']))
                    if len(inner['RealTimeDataMonitor']) > 0:
                        print("Sample Item:", inner['RealTimeDataMonitor'][0])
                else:
                    print("RealTimeDataMonitor NOT found in inner body")
            except Exception as e:
                print("Failed to parse body string:", e)
        else:
             print("Body is not a string. Keys:", list(data['body'].keys()))
    else:
        print("No 'body' key in response.")
        
except Exception as e:
    print("Error:", e)
