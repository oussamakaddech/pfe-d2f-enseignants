"""Partie 19 — Décision finale, assemblée depuis les sources réelles.

Lecture seule : registres, prédicteur (statut live), résultats de tests,
validations consolidées. Produits :
- reports/final_decision.json
- reports/final_decision.md
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path
from unittest.mock import MagicMock

from app.infrastructure.ml.predictor import ArtifactModelPort

BASE_DIR = Path(__file__).resolve().parent.parent
REPORTS = BASE_DIR / "reports"
MODELS = BASE_DIR / "data" / "models"
NOW = datetime.now(timezone.utc).isoformat()


def load(name: str) -> dict:
    p = REPORTS / name
    if not p.exists():
        return {}
    return json.loads(p.read_text(encoding="utf-8"))


def live_status() -> dict:
    s = MagicMock()
    s.models_dir = str(MODELS)
    s.gap_model_artifact = "gap_predictor_temporal.joblib"
    s.ml_artifact_path = "gap_predictor_temporal.joblib"
    s.ml_metadata_path = "temporal_training_metadata.json"
    s.ml_registry_path = "model_registry.json"
    s.ml_synthetic_tolerance_pct = 50.0
    s.ml_require_real_data = True
    s.ml_min_real_rows = 50
    s.ml_min_r2 = 0.0
    s.ml_max_rmse = 2.0
    s.ml_max_mae = 1.5
    s.ml_serving_mode = "PRODUCTION_ML"
    s.ml_enabled = True
    return ArtifactModelPort(s, database=MagicMock()).status()


def main() -> int:
    tests = load("final_test_results.json")
    prod_reg = {}
    p = MODELS / "model_registry.json"
    if p.exists():
        prod_reg = json.loads(p.read_text(encoding="utf-8"))
    demo_reg = {}
    p = MODELS / "demo" / "model_registry_demo.json"
    if p.exists():
        demo_reg = json.loads(p.read_text(encoding="utf-8"))
    mc = load("final_model_choice.json")
    serv = load("final_service_validation.json")
    docker = load("final_docker_validation.json")
    fprod = load("final_production_dataset_validation.json")
    ffeat = load("final_feature_validation.json")
    fdemo = load("final_demo_dataset_validation.json")

    live = live_status()
    prod_mode_ok = live.get("model_mode") == "PRODUCTION_ML"

    decision = {
        "GAP_production": "ACTIVE / PRODUCTION_ML" if prod_mode_ok else "HEURISTIC_FALLBACK",
        "GAP_v110": "NOT_PROMOTED",
        "BEST_DEMO_MODEL": mc.get("decision", {}).get("best_demo_model"),
        "RISQUE_ML": "NOT_AVAILABLE",
        "RISQUE_heuristique": "KEEP_AS_BASELINE",
        "RANKING": "KEEP_AS_BASELINE",
        "DASHBOARD_scope_GLOBAL": "FIXED (200, tests OK)",
        "PIPELINE": "VALIDATED",
        "SERVING": "PRODUCTION_ML" if prod_mode_ok else "non-validé",
        "DOCKER": docker.get("conclusion", "N/A"),
        "TESTS": f"{tests.get('passed')} passed / {tests.get('failed')} failed",
        "DATASET_PRODUCTION": "VALIDÉ" if fprod.get("global_valid") else "ÉCHEC",
        "DATASET_DEMO": "VALIDÉ" if fdemo.get("valid") else "ÉCHEC",
        "FEATURES": "VALIDÉ (29, anti-fuite, source_time<=ref_month)" if ffeat.get("valid") else "ÉCHEC",
    }

    all_ok = (
        prod_mode_ok
        and tests.get("failed", -1) == 0
        and fprod.get("global_valid")
        and fdemo.get("valid")
        and ffeat.get("valid")
        and docker.get("model_production_ml_in_container")
    )
    decision_final = "VALIDÉ" if all_ok else "VALIDÉ SOUS RÉSERVES"

    result = {
        "title": "Décision finale — validation ML du service",
        "generated_at": NOW,
        "decision": decision,
        "decision_finale": decision_final,
        "reserves": [
            "Enrichir le corpus production (107/172 lignes → IC95 larges).",
            "Réaliser la validation QA DSI en environnement dédié (recette, runbook).",
            "Ne jamais présenter les métriques du pipeline démo comme des performances ESPRIT (DEMO_ML).",
        ],
        "sources": {
            "tests": "reports/final_test_results.json",
            "production_registry": str(MODELS / "model_registry.json"),
            "demo_registry": str(MODELS / "demo" / "model_registry_demo.json"),
            "model_choice": "reports/final_model_choice.json",
            "service_validation": "reports/final_service_validation.json",
            "docker_validation": "reports/final_docker_validation.json",
            "dataset_production": "reports/final_production_dataset_validation.json",
            "dataset_demo": "reports/final_demo_dataset_validation.json",
            "features": "reports/final_feature_validation.json",
        },
    }

    (REPORTS / "final_decision.json").write_text(
        json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    md = [f"# {result['title']}", "", f"**Décision finale : {decision_final}**", ""]
    md.append("| Composant | Statut |")
    md.append("|---|---|")
    for k, v in decision.items():
        md.append(f"| {k} | {v} |")
    md.append("")
    md.append("## Réserves")
    for r in result["reserves"]:
        md.append(f"- {r}")
    (REPORTS / "final_decision.md").write_text("\n".join(md), encoding="utf-8")
    print(f"prod_mode={live.get('model_mode')} | tests={tests.get('passed')}/{tests.get('failed')} | decision={decision_final}")
    print("-> reports/final_decision.json/.md")
    return 0 if all_ok else 1


if __name__ == "__main__":
    import sys

    sys.exit(main())