import urllib.request, json

TOKEN = "eyJhbGciOiJIUzUxMiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiJhZG1pbiIsInNjb3BlIjoiUk9MRV9BRE1JTiIsImVtYWlsIjoiYWRtaW5AZDJmLmxvY2FsIiwidXNlcklkIjoiYWRtaW4tMDAxIiwiaWF0IjoxNzgzODg1NDIwLCJleHAiOjE3ODM5NzE4MjB9.YLDeoc1Hc7DHHFdWumPiV8NP85ioMGx3e9jhe9IuZoSrKzKOiUHvUL9ghADrCBoIDDtgS8VgyXpt4ducJGJrnA"
BASE = "http://localhost:8000"

# Check model performance
req = urllib.request.Request(f"{BASE}/api/v1/analytics/dashboard/model-performance")
req.add_header("Authorization", f"Bearer {TOKEN}")
with urllib.request.urlopen(req, timeout=10) as resp:
    data = json.loads(resp.read())
    print("Model Performance:")
    print(json.dumps(data, indent=2))

# Check overview KPIs
print("\n---")
req2 = urllib.request.Request(f"{BASE}/api/v1/analytics/dashboard/overview")
req2.add_header("Authorization", f"Bearer {TOKEN}")
with urllib.request.urlopen(req2, timeout=10) as resp:
    data = json.loads(resp.read())
    print("Overview:")
    for k, v in data.items():
        if isinstance(v, (int, float, str, bool)):
            print(f"  {k}: {v}")
        elif isinstance(v, list):
            print(f"  {k}: list[{len(v)}]")
        elif isinstance(v, dict):
            print(f"  {k}: {json.dumps(v)[:200]}")

# Check risk distribution for non_affecte
print("\n---")
req3 = urllib.request.Request(f"{BASE}/api/v1/analytics/dashboard/risk-distribution")
req3.add_header("Authorization", f"Bearer {TOKEN}")
with urllib.request.urlopen(req3, timeout=10) as resp:
    data = json.loads(resp.read())
    print("Risk Distribution by_department:")
    for d in data.get("by_department", []):
        print(f"  {d}")
