"""Enregistrement d'un modèle dans le registre d'artefacts.

Usage :
    python -m pipelines.register_model --model-version v1.0.0 --approve
    python -m pipelines.register_model --model-version v1.0.0 --rollback
"""
from __future__ import annotations

import argparse
import hashlib
import json
import sys
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).parent.parent
MODELS_DIR = BASE_DIR / "data" / "models"
CLEAN_DIR = BASE_DIR / "data" / "clean"
MODEL_PATH = MODELS_DIR / "gap_predictor_temporal.joblib"
METADATA_PATH = MODELS_DIR / "temporal_training_metadata.json"
REGISTRY_PATH = MODELS_DIR / "model_registry.json"
PROVENCED_CORPUS = CLEAN_DIR / "training_corpus_provenanced.csv"


def _sha256_of_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _dataset_hash_from_corpus() -> str:
    """Calcule le SHA-256 du dataset provenancé (lignes triées, index reset)."""
    if not PROVENCED_CORPUS.exists():
        return ""
    df = pd.read_csv(PROVENCED_CORPUS)
    if df.empty:
        return ""
    canonical = df.copy().sort_values(by=df.columns.tolist()).reset_index(drop=True)
    payload = canonical.to_csv(index=False).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def register_model(model_version: str, approve: bool = False, actor: str | None = None) -> dict:
    """Enregistre le modèle courant dans le registre (CANDIDATE ou ACTIVE)."""
    from app.infrastructure.ml.model_registry import (
        APPROVAL_APPROVED,
        APPROVAL_PENDING,
        STATUS_ACTIVE,
        STATUS_CANDIDATE,
        ModelRegistry,
        RegistryEntry,
    )

    if not MODEL_PATH.exists():
        raise SystemExit(f"[ERROR] Artefact introuvable : {MODEL_PATH}")
    if not METADATA_PATH.exists():
        raise SystemExit(f"[ERROR] Metadata introuvable : {METADATA_PATH}")

    metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    metrics = metadata.get("metrics") or {}
    data_sources = metadata.get("data_sources") or {}

    entry = RegistryEntry(
        model_name="gap_predictor_temporal",
        model_version=model_version,
        status=STATUS_ACTIVE if approve else STATUS_CANDIDATE,
        created_at=datetime.now(timezone.utc).isoformat(),
        dataset_version=metadata.get("dataset_version", "unknown"),
        dataset_hash=_dataset_hash_from_corpus() or metadata.get("dataset_hash", ""),
        artifact_sha256=_sha256_of_file(MODEL_PATH),
        synthetic_share_pct=float(data_sources.get("synthetic_share_pct", 0.0)),
        feature_names=list(metadata.get("feature_cols", [])),
        feature_schema_version=metadata.get("feature_schema_version", "1.0"),
        metrics={
            "rmse": float(metrics.get("test_rmse", 0.0)),
            "mae": float(metrics.get("test_mae", 0.0)),
            "r2": float(metrics.get("test_r2", 0.0)),
        },
        approval_status=APPROVAL_APPROVED if approve else APPROVAL_PENDING,
        approval_date=datetime.now(timezone.utc).isoformat() if approve else None,
        approval_actor=actor if approve else None,
        notes=metadata.get("notes", ""),
    )

    registry = ModelRegistry(REGISTRY_PATH, MODELS_DIR)
    if approve:
        registry.promote_to_active(entry, actor=actor)
        print(f"[OK] Modèle {model_version} enregistré et approuvé (ACTIVE)")
    else:
        registry.register(entry)
        print(f"[OK] Modèle {model_version} enregistré (CANDIDATE, PENDING)")

    print(f"    artifact_sha256={entry.artifact_sha256[:16]}...")
    print(f"    synthetic_share_pct={entry.synthetic_share_pct}%")
    print(f"    metrics={entry.metrics}")
    return entry.to_dict()


def rollback_model(target_version: str | None = None, actor: str | None = None) -> dict | None:
    """Restaure la dernière version approuvée archivée."""
    from app.infrastructure.ml.model_registry import ModelRegistry

    registry = ModelRegistry(REGISTRY_PATH, MODELS_DIR)
    entry = registry.rollback(target_version, actor=actor)
    if entry is None:
        print("[ERROR] Aucune version archivée approuvée disponible pour rollback")
        return None
    print(f"[OK] Rollback vers {entry.model_version} (ACTIVE)")
    return entry.to_dict()


def main() -> int:
    parser = argparse.ArgumentParser(description="Registre d'artefacts ML")
    parser.add_argument("--model-version", default="v1.0.0")
    parser.add_argument("--approve", action="store_true", help="Approuve immédiatement (ACTIVE)")
    parser.add_argument("--rollback", action="store_true", help="Rollback vers la dernière version approuvée")
    parser.add_argument("--target-version", default=None, help="Version cible pour rollback")
    parser.add_argument("--actor", default=None, help="Acteur de l'approbation")
    args = parser.parse_args()

    if args.rollback:
        rollback_model(args.target_version, args.actor)
    else:
        register_model(args.model_version, approve=args.approve, actor=args.actor)
    return 0


if __name__ == "__main__":
    sys.exit(main())