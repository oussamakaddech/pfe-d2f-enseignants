"""Correctif fiable (script) : model_name identite canonique = gap_predictor_temporal.

Applique la correction sur :
  - pipelines/train_gap_model.py (source) : ajoute MODEL_NAME et deconule algorithm.
  - data/models/temporal_training_metadata.json : corrige le model_name existant.
"""
import json
from pathlib import Path

BASE = Path(__file__).parent
# 1. Source train_gap_model.py
p = BASE / "pipelines" / "train_gap_model.py"
s = p.read_text(encoding="utf-8")
if "MODEL_NAME = \"gap_predictor_temporal\"" not in s:
    s = s.replace(
        'MODEL_PATH = MODELS_DIR / "gap_predictor_temporal.joblib"\n',
        'MODEL_PATH = MODELS_DIR / "gap_predictor_temporal.joblib"\nMODEL_NAME = "gap_predictor_temporal"\n',
    )
s = s.replace(
    '        "model_name": best_name,\n        "model_version": model_version,',
    '        "model_name": MODEL_NAME,\n        "algorithm": best_name,\n        "model_version": model_version,',
)
p.write_text(s, encoding="utf-8")
print("train_gap_model.py corrige ; MODEL_NAME present =", "MODEL_NAME" in s)

# 2. Metadata JSON existant
mp = BASE / "data" / "models" / "temporal_training_metadata.json"
meta = json.loads(mp.read_text(encoding="utf-8"))
meta["model_name"] = "gap_predictor_temporal"
meta["algorithm"] = meta.get("algorithm") or meta.get("model_name") or "unknown"
mp.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
print("metadata model_name =", meta.get("model_name"), "| algorithm =", meta.get("algorithm"))
