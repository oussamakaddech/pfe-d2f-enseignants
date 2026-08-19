"""Validation des metriques et de l'absence de fuite du modele entrene.

Usage :
    python -m pipelines.validate_model_metrics --json
"""
from __future__ import annotations

import argparse
import json
import os
import sys
from pathlib import Path

BASE_DIR = Path(__file__).parent.parent
MODELS_DIR = BASE_DIR / "data" / "models"
METADATA_PATH = MODELS_DIR / "temporal_training_metadata.json"
FEATURE_SCHEMA_PATH = MODELS_DIR / "feature_schema.json"

from app.infrastructure.ml.feature_schema import LEAK_COLUMNS  # noqa: E402


def default_thresholds() -> dict:
    return {
        "min_r2": float(os.environ.get("ML_MIN_R2", "0.0")),
        "max_rmse": float(os.environ.get("ML_MAX_RMSE", "2.0")),
        "max_mae": float(os.environ.get("ML_MAX_MAE", "1.5")),
        "max_train_test_gap_pct": float(os.environ.get("ML_MAX_TRAIN_TEST_GAP_PCT", "50.0")),
    }


def validate(metadata: dict, schema: dict, thresholds: dict) -> dict:
    """Valide que le modele respecte les seuils et l'anti-fuite."""
    errors: list[str] = []
    metrics = metadata.get("metrics") or {}
    data_sources = metadata.get("data_sources") or {}
    feature_cols = metadata.get("feature_cols") or schema.get("feature_names") or []

    # Anti-fuite
    leaks = [c for c in feature_cols if c in LEAK_COLUMNS]
    if leaks:
        errors.append(f"colonnes de fuite detectees dans X : {leaks}")

    # Metriques
    test_r2 = metrics.get("test_r2")
    test_rmse = metrics.get("test_rmse")
    test_mae = metrics.get("test_mae")
    baseline_rmse = metrics.get("baseline_rmse")

    if test_r2 is None or test_r2 < thresholds["min_r2"]:
        errors.append(f"R2={test_r2} < minimum requis {thresholds['min_r2']}")
    if test_rmse is None or test_rmse > thresholds["max_rmse"]:
        errors.append(f"RMSE={test_rmse} > maximum autorise {thresholds['max_rmse']}")
    if test_mae is None or test_mae > thresholds["max_mae"]:
        errors.append(f"MAE={test_mae} > maximum autorise {thresholds['max_mae']}")

    # RMSE inferieur a la baseline
    if baseline_rmse is not None and test_rmse is not None and test_rmse >= baseline_rmse:
        errors.append(
            f"RMSE modele ({test_rmse}) >= baseline ({baseline_rmse}) : "
            "le modele n'amelioore pas la baseline"
        )

    # Provenance
    synth_pct = float(data_sources.get("synthetic_share_pct", 0.0) or 0.0)
    tolerance = float(os.environ.get("ML_SYNTHETIC_TOLERANCE_PCT", "50.0"))
    real_rows = int(data_sources.get("real_rows", 0))
    min_real = int(os.environ.get("ML_MIN_REAL_ROWS", "50"))
    require_real = os.environ.get("ML_REQUIRE_REAL_DATA", "true").lower() == "true"
    if synth_pct > tolerance:
        errors.append(f"corpus {synth_pct}% synthetique > tolerance {tolerance}%")
    if require_real and real_rows < min_real:
        errors.append(f"donnees reelles insuffisantes : {real_rows} < {min_real}")

    decision = "accept" if not errors else "reject"
    return {
        "valid": decision == "accept",
        "decision": decision,
        "errors": errors,
        "metrics": metrics,
        "synthetic_share_pct": synth_pct,
        "real_rows": real_rows,
        "thresholds": thresholds,
    }


def main() -> int:
    parser = argparse.ArgumentParser(description="Valide les metriques et l'anti-fuite")
    parser.add_argument("--json", action="store_true")
    args = parser.parse_args()

    if not METADATA_PATH.exists():
        report = {"valid": False, "decision": "reject", "errors": ["metadata d'entrainement introuvable"]}
    elif not FEATURE_SCHEMA_PATH.exists():
        report = {"valid": False, "decision": "reject", "errors": ["feature_schema introuvable"]}
    else:
        metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
        schema = json.loads(FEATURE_SCHEMA_PATH.read_text(encoding="utf-8"))
        report = validate(metadata, schema, default_thresholds())

    if args.json:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    else:
        print(json.dumps(report, indent=2, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    sys.exit(main())
