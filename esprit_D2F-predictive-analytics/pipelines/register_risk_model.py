"""Enregistre le modele de risque dans le registre : risk-simulation-v1.0.0.

Gouvernance (regle d'or) :
- data_origin=SIMULATED, target_validity=OBSERVED_IN_SIMULATION,
  validation_scope=SIMULATION_VALIDATED — JAMAIS REAL_VALIDATED (aucune
  re-mesure reelle n'existe).
- status=ACTIVE seulement si decision=accept (Brier <= 0.05 ET macro-F1 >= 0.70
  sur le holdout de simulation). Sinon CANDIDATE/APPROVED : le modele reste
  documente mais n'est PAS servi (le /risk continue de servir l'heuristique
  0.50/0.12/0.40 avec fallback_reason explicite).

Usage:
    python -m pipelines.register_risk_model
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

from app.infrastructure.ml.model_registry import (
    DATA_ORIGIN_SIMULATED,
    TARGET_VALIDITY_OBSERVED_SIMULATION,
    VALIDATION_SCOPE_SIMULATION,
    ModelRegistry,
    RegistryEntry,
)

BASE_DIR = Path(__file__).parent.parent
MODELS_DIR = BASE_DIR / "data" / "models"
METADATA_PATH = MODELS_DIR / "risk_training_metadata.json"
MODEL_VERSION = "risk-simulation-v1.0.0"


def main() -> int:
    if not METADATA_PATH.exists():
        raise SystemExit("metadonnees absentes — executer pipelines.train_risk_model d'abord")
    meta = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    decision = str(meta.get("decision"))
    registry = ModelRegistry(MODELS_DIR / "model_registry.json", MODELS_DIR)

    status = "ACTIVE" if decision == "accept" else "CANDIDATE"
    metrics = meta.get("metrics") or {}
    entry = RegistryEntry(
        model_name="risk_predictor",
        model_version=MODEL_VERSION,
        status=status,
        created_at=datetime.now(timezone.utc).isoformat(),
        dataset_version="simulation-v1.0.0",
        dataset_hash=(meta.get("dataset") or {}).get("dataset_hash", ""),
        artifact_sha256=meta.get("artifact_sha256", ""),
        synthetic_share_pct=100.0,
        feature_names=meta.get("feature_cols") or [],
        feature_schema_version="risk-1.0",
        metrics={
            "macro_f1": metrics.get("macro_f1", 0.0),
            "brier_critical": metrics.get("brier_critical_calibrated", 0.0),
        },
        approval_status="APPROVED",
        approval_date=datetime.now(timezone.utc).isoformat(),
        approval_actor="risk-pipeline",
        notes=(
            f"Modele de risque SIMULATION_VALIDATED (cibles M+3 observees, decision={decision}). "
            "Seuils : Brier<=0.05 ET macro-F1>=0.70 sur holdout de simulation. "
            "Repli heuristique 0.50/0.12/0.40 conserve (fail-closed)."
        ),
        target_validity=TARGET_VALIDITY_OBSERVED_SIMULATION,
        real_future_observation_count=int((meta.get("dataset") or {}).get("rows", 0)),
        distinct_observation_months=int((meta.get("dataset") or {}).get("months", 0)),
        data_origin=DATA_ORIGIN_SIMULATED,
        validation_scope=VALIDATION_SCOPE_SIMULATION,
        generator_version="simulation-v1.0.0",
        seed=meta.get("seed", 42),
    )
    registry.register(entry)
    if status == "ACTIVE":
        approved = registry.approve(MODEL_VERSION, actor="risk-pipeline")
        if approved is None:
            status = "CANDIDATE"
            print("promotion refusee par la gouvernance (fail-closed) — l'entree reste CANDIDATE")
    print(f"[OK] registre : risk_predictor {MODEL_VERSION} -> {status} "
          f"(decision={decision}, macro_f1={metrics.get('macro_f1')}, brier={metrics.get('brier_critical_calibrated')})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
