"""Check if analytics.py imports correctly."""
try:
    import sys
    sys.path.insert(0, r"c:/Users/oussama/Desktop/pfe-d2f-enseignants/esprit_D2F-predictive-analytics")
    from app.routers.analytics import router
    print("OK - analytics router imported successfully")
except Exception as e:
    print(f"ERROR: {e}")
