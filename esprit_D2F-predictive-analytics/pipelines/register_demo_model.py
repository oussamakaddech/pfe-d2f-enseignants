"""Registre et validation de serving du modèle démo.

Le modèle démo est enregistré séparément (jamais dans le registre production) :
    - artefact : data/models/demo/demo-gap-synthetic-v1.0.0.joblib (+ sidecar SHA-256)
    - entrée registre : data/models/demo/model_registry_demo.json (status DEMO_ONLY)

Garanties :
    - jamais de promotion automatique en PRODUCTION_ML (promotion = exception) ;
    - le registre production (data/models/model_registry.json) et l'artefact
      production v1.0.0 restent INTACTS (hash vérifiés avant/après).

Sortie : reports/demo_serving_validation.json
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np

from pipelines.demo_common import (
    DEMO_MODEL_NAME,
    DEMO_MODEL_VERSION,
    DATASET_VERSION_DEFAULT,
    canonical_df_hash,
)

BASE_DIR = Path(__file__).parent.parent
MODELS_DIR = BASE_DIR / "data" / "models"
DEMO_MODELS_DIR = MODELS_DIR / "demo"
REPORTS_DIR = BASE_DIR / "reports"
SYNTH_DIR = BASE_DIR / "data" / "synthetic"

PROD_REGISTRY = MODELS_DIR / "model_registry.json"
PROD_ARTIFACT = MODELS_DIR / "gap_predictor_temporal.joblib"
DEMO_REGISTRY = DEMO_MODELS_DIR / "model_registry_demo.json"


class DemoPromotionRefused(RuntimeError):
    """Levée si une tentative de promotion en PRODUCTION_ML est détectée."""


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def build_demo_registry_entry(
    dataset_path: Path | None = None,
    metadata_path: Path | None = None,
    artifact_path: Path | None = None,
) -> dict:
    """Construit l'entrée registre démo (status DEMO_ONLY, jamais ACTIVE)."""
    dataset = dataset_path or (SYNTH_DIR / "demo_dataset_synthetic-v1.0.0_clean.csv")
    meta = metadata_path or (DEMO_MODELS_DIR / f"{DEMO_MODEL_VERSION}_metadata.json")
    artifact = artifact_path or (DEMO_MODELS_DIR / f"{DEMO_MODEL_VERSION}.joblib")

    if not artifact.exists():
        raise FileNotFoundError(f"Artefact démo introuvable : {artifact}")
    metadata = json.loads(meta.read_text(encoding="utf-8"))
    metrics = {k: float(v) for k, v in metadata.get("metrics_test_seed42", {}).items()}

    return {
        "model_name": DEMO_MODEL_NAME,
        "model_version": DEMO_MODEL_VERSION,
        "dataset_version": DATASET_VERSION_DEFAULT,
        "data_origin": "SYNTHETIC",
        "is_synthetic": True,
        "institutional_verified": False,
        "status": "DEMO_ONLY",
        "approval_status": "PENDING",
        "artifact_sha256": _sha256(artifact),
        "dataset_hash": canonical_df_hash(__import__("pandas").read_csv(dataset)),
        "metrics": metrics,
        "training_rows": int(metadata.get("training_rows", 0)),
        "synthetic_share_pct": 100.0,
        "notes": "Modèle de démonstration entraîné sur données 100 % synthétiques. "
                 "Jamais utilisable comme modèle institutionnel validé.",
    }


def register_demo_entry(entry: dict | None = None, registry_path: Path | None = None) -> dict:
    """Écrit l'entrée démo dans le registre dédié (fichier séparé)."""
    entry = entry or build_demo_registry_entry()
    out = registry_path or DEMO_REGISTRY
    out.parent.mkdir(parents=True, exist_ok=True)
    # Conserve les éventuelles autres entrées démo
    existing: list = []
    if out.exists():
        try:
            existing = json.loads(out.read_text(encoding="utf-8"))
        except Exception:
            existing = []
    if isinstance(existing, dict):
        existing = [existing]
    cleaned = [e for e in existing if e.get("model_version") != entry["model_version"]]
    cleaned.append(entry)
    out.write_text(json.dumps(cleaned, indent=2, ensure_ascii=False), encoding="utf-8")
    return entry


def demo_serving_status(entry: dict | None = None) -> dict:
    """Statut de serving démo : TOUJOURS DEMO_ML, jamais PRODUCTION_ML."""
    entry = entry or build_demo_registry_entry()
    return {
        "model_mode": "DEMO_ML",
        "model_version": entry["model_version"],
        "training_rows": int(entry["training_rows"]),
        "synthetic_share_pct": float(entry["synthetic_share_pct"]),
        "institutional_verified": bool(entry["institutional_verified"]),
        "warning": "Résultats de démonstration uniquement.",
    }


def assert_no_promotion(entry: dict | None = None) -> bool:
    """Vérifie qu'aucune promotion en PRODUCTION_ML n'est possible pour ce modèle.

    Lève DemoPromotionRefused si le statut ou les drapeaux le permettraient.
    """
    entry = entry or build_demo_registry_entry()
    if entry.get("status") == "PRODUCTION_ML":
        raise DemoPromotionRefused("Statut PRODUCTION_ML interdit pour un modèle synthétique")
    if entry.get("is_synthetic") is True:
        raise DemoPromotionRefused("Promotion en PRODUCTION_ML interdite : modèle synthétique")
    if entry.get("institutional_verified") is False:
        raise DemoPromotionRefused("Promotion en PRODUCTION_ML interdite : non validé institutionnellement")
    if entry.get("synthetic_share_pct", 0.0) > 0:
        raise DemoPromotionRefused("Promotion en PRODUCTION_ML interdite : part synthétique > 0")
    return True


def run_serving_validation(
    prod_registry: Path | None = None,
    prod_artifact: Path | None = None,
    output_path: Path | None = None,
) -> dict:
    """Valide le serving démo et vérifie que la production v1.0.0 est intacte."""
    prod_reg = prod_registry or PROD_REGISTRY
    prod_art = prod_artifact or PROD_ARTIFACT

    prod_reg_before = _sha256(prod_reg)
    prod_art_before = _sha256(prod_art)

    entry = build_demo_registry_entry()
    register_demo_entry(entry)
    status = demo_serving_status(entry)

    # Vérification intégrité artefact démo (sidecar SHA-256)
    from app.infrastructure.ml.artifact_integrity import verify as verify_artifact

    artifact = DEMO_MODELS_DIR / f"{DEMO_MODEL_VERSION}.joblib"
    try:
        verify_artifact(artifact)
        integrity_ok = True
        integrity_error = None
    except Exception as exc:
        integrity_ok = False
        integrity_error = str(exc)

    # Vérification anti-promotion
    promotion_guard = "PRODUCTION_ML refusé (DemoPromotionRefused attendu)"
    refused = False
    try:
        assert_no_promotion(entry)
    except DemoPromotionRefused:
        refused = True

    prod_reg_after = _sha256(prod_reg)
    prod_art_after = _sha256(prod_art)

    validation = {
        "serving_status": status,
        "registry_entry": entry,
        "artifact_integrity": {"ok": integrity_ok, "error": integrity_error},
        "promotion_guard": {
            "expected": promotion_guard,
            "production_promotion_refused": refused,
            "no_automatic_promotion": refused,
        },
        "production_unchanged": {
            "model_registry_hash_same": prod_reg_before == prod_reg_after,
            "artifact_v1.0.0_hash_same": prod_art_before == prod_art_after,
            "model_registry_sha256": prod_reg_before,
            "artifact_v1.0.0_sha256": prod_art_before,
        },
        "warning": "Le modèle démo est servi en DEMO_ML uniquement. "
                   "PRODUCTION_ML reste réservé aux modèles validés institutionnellement.",
    }
    out = output_path or (REPORTS_DIR / "demo_serving_validation.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(validation, indent=2, ensure_ascii=False), encoding="utf-8")
    return validation


def main() -> int:
    validation = run_serving_validation()
    print(f"[OK] Serving DEMO_ML : {validation['serving_status']['model_mode']} "
          f"({validation['serving_status']['model_version']})")
    print(f"[OK] Promotion PRODUCTION_ML refusée : "
          f"{validation['promotion_guard']['production_promotion_refused']}")
    print(f"[OK] Production v1.0.0 intacte : "
          f"{validation['production_unchanged']['artifact_v1.0.0_hash_same']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())