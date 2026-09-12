"""Patch minimal et verifie le model_name de la metadata."""
import json
mp = "data/models/temporal_training_metadata.json"
m = json.loads(open(mp, encoding="utf-8").read())
print("AVANT model_name =", m.get("model_name"), "| algorithm =", m.get("algorithm"))
m["model_name"] = "gap_predictor_temporal"
m["algorithm"] = m.get("algorithm") or "gradient_boosting"
open(mp, "w", encoding="utf-8").write(json.dumps(m, indent=2, ensure_ascii=False))
m2 = json.loads(open(mp, encoding="utf-8").read())
print("APRES  model_name =", m2.get("model_name"), "| algorithm =", m2.get("algorithm"))
