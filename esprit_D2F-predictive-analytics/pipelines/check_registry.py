"""Vérifie l'état du registre des modèles."""
import hashlib
import json
from pathlib import Path

registry = json.loads(Path("data/models/model_registry.json").read_text(encoding="utf-8"))
for entry in registry:
    print(f"Model: {entry['model_name']} v{entry['model_version']}")
    print(f"  Status: {entry['status']}")
    print(f"  Approval: {entry['approval_status']}")
    print(f"  Dataset: {entry['dataset_version']}")
    print(f"  Metrics: {entry.get('metrics', {})}")
    sha = entry.get("artifact_sha256", "N/A")
    print(f"  Artifact SHA: {sha[:16]}..." if sha != "N/A" else "  Artifact SHA: N/A")
    print()

for f in ["gap_predictor_temporal.joblib", "gap_predictor_temporal_v110.joblib"]:
    p = Path("data/models") / f
    if p.exists():
        h = hashlib.sha256(p.read_bytes()).hexdigest()
        print(f"{f}: {h[:16]}...")
    else:
        print(f"{f}: ABSENT")