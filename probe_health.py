import urllib.request, json
try:
    data = urllib.request.urlopen("http://localhost:8000/api/v1/analytics/health", timeout=10).read().decode()
    print("HEALTH:", data)
except Exception as e:
    print("HEALTH ERROR:", e)
