"""Risque final après V16 pour ENS903 (et 2 enseignants IA avec niveaux)."""
from app.core.config import get_settings
from app.infrastructure.container import Container

settings = get_settings()
container = Container(settings)
container.database.connect()

for tid in ("ENS903", "ENS023", "ENS025"):
    risk, mode, version, reason, payload = container.compute_risk.execute_serving(tid)
    d = risk.to_dict(mode)
    profile = d.get("data", d)
    print(f"\n=== {tid} ===")
    print("mode:", mode, "| fallback_reason risk:", reason)
    for f in profile.get("factors", []):
        print(f"   {f.get('label')}: valeur={f.get('value')} norm={f.get('normalized_value')} "
              f"poids={f.get('weight')} contrib={f.get('contribution')} scope={f.get('scope_label')}")
    print("risk_score:", profile.get("risk_score"), profile.get("risk_level"))

status = container.model_port.status()
print("\n=== ML status (résumé) ===")
print("gap model:", status.get("model_mode"), status.get("model_version"),
      "| drift_detected:", status.get("drift_check", {}).get("drift_detected"))
print("risk model:", status.get("risk_model", {}).get("available"),
      status.get("risk_model", {}).get("mode"))
print("relevance model:", status.get("relevance_model", {}).get("available"))