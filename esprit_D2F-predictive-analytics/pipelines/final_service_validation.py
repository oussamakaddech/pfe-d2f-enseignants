"""Parties 11-15 — Rapport final de validation du service ML.

Consolide : risque (heuristique + classifier), ranking, serving API (JWT,
DEMO_ML / PRODUCTION_ML), registres/artefacts + garde anti-promotion, et
domain shift (Wasserstein + warning). Lecture seule — aucun artefact modifié.

Produits :
- reports/final_service_validation.json
- reports/final_service_validation.md
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


def live_serving_status() -> dict:
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
    port = ArtifactModelPort(s, database=MagicMock())
    return port.status()


def main() -> int:
    risk = load("demo_risk_report.json")
    ranking = load("demo_ranking_report.json")
    domain = load("domain_shift_report.json")
    demo_serving = load("demo_serving_validation.json")
    prod_serving = load("final_serving_validation.json")
    demo_final = load("demo_final_validation.json")

    live = live_serving_status()

    demo_reg = {}
    demo_reg_path = MODELS / "demo" / "model_registry_demo.json"
    if demo_reg_path.exists():
        demo_reg = json.loads(demo_reg_path.read_text(encoding="utf-8"))
    prod_reg = {}
    prod_reg_path = MODELS / "model_registry.json"
    if prod_reg_path.exists():
        prod_reg = json.loads(prod_reg_path.read_text(encoding="utf-8"))

    result = {
        "title": "Validation finale du service ML — risque, ranking, serving, registres, domain shift",
        "generated_at": NOW,
        "risque": {
            "labels_origin": risk.get("risk_labels_origin"),
            "note": risk.get("note"),
            "caveat": risk.get("caveat_heuristic_accuracy"),
            "heuristic_six_factors": risk.get("heuristic_six_factors"),
            "random_forest": risk.get("random_forest"),
            "valid": risk.get("n_rows", 0) > 0,
        },
        "ranking": {
            "labels_origin": ranking.get("relevance_labels_origin"),
            "formula": ranking.get("formula"),
            "metrics": ranking.get("metrics"),
            "warning": ranking.get("warning"),
            "valid": ranking.get("n_queries", 0) > 0,
        },
        "domain_shift": {
            "method": domain.get("drift_indicator", {}).get("method"),
            "mean_wasserstein": domain.get("drift_indicator", {}).get("mean_wasserstein"),
            "interpretation": domain.get("drift_indicator", {}).get("interpretation"),
            "warning": domain.get("warning"),
            "valid": domain.get("drift_indicator", {}).get("mean_wasserstein") is not None,
        },
        "serving_production": {
            "mode": live.get("model_mode"),
            "available": live.get("available"),
            "kill_switch": live.get("kill_switch"),
            "model_version": live.get("model_version"),
            "prediction_horizon": live.get("prediction_horizon"),
            "provenance": live.get("provenance", {}).get("synthetic_share_pct"),
            "dataset_version": live.get("provenance", {}).get("dataset_version"),
            "fallback_reason": live.get("fallback_reason"),
            "modele_production_actif": live.get("model_mode") == "PRODUCTION_ML",
        },
        "serving_demo": {
            "mode": demo_final.get("serving", {}).get("model_mode"),
            "model_version": demo_final.get("serving", {}).get("model_version"),
            "data_origin": demo_final.get("serving", {}).get("data_origin"),
            "institutional_verified": demo_final.get("serving", {}).get("institutional_verified"),
            "promotion_refused": demo_final.get("serving", {}).get("promotion_refused"),
        },
        "anti_promotion_guard": {
            "demo_serving_validation": {
                "promotion_guard": demo_serving.get("promotion_guard"),
                "production_unchanged": demo_serving.get("production_unchanged"),
                "warning": demo_serving.get("warning"),
            }
        },
        "registres": {
            "production": prod_reg,
            "demo": demo_reg,
        },
    }

    md = [f"# {result['title']}", ""]
    for section in (
        "risque",
        "ranking",
        "domain_shift",
        "serving_production",
        "serving_demo",
        "anti_promotion_guard",
        "registres",
    ):
        md.append(f"## {section}")
        md.append(f"```json\n{json.dumps(result[section], ensure_ascii=False, indent=2)}\n```")
        md.append("")

    (REPORTS / "final_service_validation.json").write_text(
        json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    (REPORTS / "final_service_validation.md").write_text("\n".join(md), encoding="utf-8")
    print(
        f"prod_mode={live.get('model_mode')} | demo_mode={demo_final.get('serving',{}).get('model_mode')} | "
        f"domain_shift={domain.get('drift_indicator',{}).get('mean_wasserstein')}"
    )
    print("-> reports/final_service_validation.json/.md")
    return 0


if __name__ == "__main__":
    import sys

    sys.exit(main())