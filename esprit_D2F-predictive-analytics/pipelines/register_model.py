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


def _dataset_hash_from_corpus(corpus: Path | None = None) -> str:
    """Calcule le SHA-256 du dataset provenancé (lignes triées, index reset).

    lineterminator="\\n" obligatoire : to_csv() suit sinon os.linesep (CRLF
    sur Windows) et le hash différerait entre plateformes pour un même
    dataset — même convention que dataset_provenance.file_hash.
    """
    path = corpus or PROVENCED_CORPUS
    if not path.exists():
        return ""
    df = pd.read_csv(path)
    if df.empty:
        return ""
    canonical = df.copy().sort_values(by=df.columns.tolist(), kind="stable").reset_index(drop=True)
    payload = canonical.to_csv(index=False, lineterminator="\n").encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def _corpus_institutionally_verified(corpus: Path) -> bool:
    """True si toutes les lignes du corpus portent institutional_verified=true.

    Garde audit 1.2 : INSTITUTIONAL_RECORD ne peut etre ecrit que si les
    lignes du corpus sont attestées DSI (colonne institutional_verified à
    true sur toutes les lignes) — sinon le corpus est une donnée de dev non
    attestée (DEMO_SEED), même si elle provient de la base.
    """
    if not corpus.exists():
        return False
    df = pd.read_csv(corpus)
    if df.empty or "institutional_verified" not in df.columns:
        return False
    vals = df["institutional_verified"].astype(str).str.strip().str.lower()
    return bool(len(vals) > 0 and vals.isin(("true", "1", "yes", "oui", "vrai")).all())


def register_model(
    model_version: str,
    approve: bool = False,
    actor: str | None = None,
    artifact_path: Path | None = None,
    metadata_path: Path | None = None,
    corpus_path: Path | None = None,
    attestation_dsi: str | None = None,
) -> dict:
    """Enregistre le modèle courant dans le registre (CANDIDATE ou ACTIVE)."""
    from app.infrastructure.ml.model_registry import (
        APPROVAL_APPROVED,
        APPROVAL_PENDING,
        STATUS_ACTIVE,
        STATUS_CANDIDATE,
        ModelRegistry,
        RegistryEntry,
    )

    artifact = artifact_path or MODEL_PATH
    meta = metadata_path or METADATA_PATH
    corpus = corpus_path or PROVENCED_CORPUS

    if not artifact.exists():
        raise SystemExit(f"[ERROR] Artefact introuvable : {artifact}")
    if not meta.exists():
        raise SystemExit(f"[ERROR] Metadata introuvable : {meta}")

    metadata = json.loads(meta.read_text(encoding="utf-8"))
    metrics = metadata.get("metrics") or {}
    data_sources = metadata.get("data_sources") or {}

    # Origine honnête dérivée du corpus (audit 1.2) : INSTITUTIONAL_RECORD
    # UNIQUEMENT si les lignes du corpus sont attestées DSI (colonne
    # institutional_verified=true sur toutes les lignes) OU si une référence
    # d'attestation DSI est fournie explicitement — sinon DEMO_SEED (données
    # de dev non attestées, même si issues de la base postgresql_d2f).
    synth_pct = float(data_sources.get("synthetic_share_pct", 0.0))
    from app.infrastructure.ml.model_registry import DATA_ORIGIN_INSTITUTIONAL, DATA_ORIGIN_DEMO_SEED

    data_origin = DATA_ORIGIN_DEMO_SEED
    if synth_pct <= 0.0 and (attestation_dsi or _corpus_institutionally_verified(corpus)):
        data_origin = DATA_ORIGIN_INSTITUTIONAL

    entry = RegistryEntry(
        model_name="gap_predictor_temporal",
        model_version=model_version,
        status=STATUS_ACTIVE if approve else STATUS_CANDIDATE,
        created_at=datetime.now(timezone.utc).isoformat(),
        dataset_version=metadata.get("dataset_version", "unknown"),
        dataset_hash=_dataset_hash_from_corpus(corpus) or metadata.get("dataset_hash", ""),
        artifact_sha256=_sha256_of_file(artifact),
        synthetic_share_pct=synth_pct,
        data_origin=data_origin,
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
        attestation_dsi=attestation_dsi,
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
    parser.add_argument("--artifact-path", default=None, help="Chemin de l'artefact joblib")
    parser.add_argument("--metadata-path", default=None, help="Chemin de la metadata JSON")
    parser.add_argument("--corpus-path", default=None, help="Chemin du dataset provenancé")
    parser.add_argument("--attestation-dsi", default=None, help="Référence d'attestation DSI (requis pour INSTITUTIONAL_RECORD si le corpus n'est pas attesté)")
    args = parser.parse_args()

    if args.rollback:
        rollback_model(args.target_version, args.actor)
    else:
        register_model(
            args.model_version,
            approve=args.approve,
            actor=args.actor,
            artifact_path=Path(args.artifact_path) if args.artifact_path else None,
            metadata_path=Path(args.metadata_path) if args.metadata_path else None,
            corpus_path=Path(args.corpus_path) if args.corpus_path else None,
            attestation_dsi=args.attestation_dsi,
        )
    return 0


if __name__ == "__main__":
    sys.exit(main())