import urllib.request, json
for ep in ["dashboard/global", "dashboard/teachers-at-risk", "dashboard/competences-declining", "dashboard/gap-heatmap", "dashboard/model-performance"]:
    try:
        data = urllib.request.urlopen("http://localhost:8000/api/v1/analytics/" + ep, timeout=10).read().decode()
        print("===", ep, "===")
        print(data[:600])
    except Exception as e:
        print("===", ep, "ERROR ===", e)
