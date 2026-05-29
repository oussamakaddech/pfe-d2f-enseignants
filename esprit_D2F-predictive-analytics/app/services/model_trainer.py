"""Pipeline de ré-entraînement avec protection rollback (spec §5).

Déroulé :
1. Lire l'accuracy (R² test) du modèle courant depuis training_metadata.json.
2. Sauvegarder l'artefact courant (+ sidecars) avant d'écraser.
3. Ré-entraîner le modèle sur les dernières données PostgreSQL.
4. Comparer accuracy_after vs accuracy_before :
   - si la chute dépasse RETRAIN_MAX_ACCURACY_DROP → restaurer la sauvegarde,
     recharger le modèle précédent, journaliser un `rollback`.
   - sinon → conserver, journaliser un `success`.
5. Tracer l'événement dans `model_retraining_log` (avant/après, taille dataset,
   statut, déclencheur) — aucune PII (triggered_by = id utilisateur).
"""

from __future__ import annotations

import json
import logging
import os
import shutil
from datetime import datetime, timezone
from typing import Any, Optional

from sqlalchemy.orm import Session

from app.config import settings
from app.core.exceptions import InsufficientDataError
from app.ml import gap_predictor as gp_module
from app.ml.gap_predictor import gap_predictor
from app.models.db_models import ModelRetrainingLog
from app.services.data_service import DataService

logger = logging.getLogger(__name__)

_SIDECAR_SUFFIXES = (".sha256", ".hmac")


def _metadata_path() -> str:
    return os.path.join(settings.models_dir, "training_metadata.json")


def read_current_accuracy() -> Optional[float]:
    """Lit le R² test du modèle courant (None si absent / jamais entraîné)."""
    path = _metadata_path()
    if not os.path.exists(path):
        return None
    try:
        with open(path, "r", encoding="utf-8") as f:
            meta = json.load(f)
        val = (meta.get("metrics") or {}).get("test_r2")
        return float(val) if val is not None else None
    except Exception as exc:  # pragma: no cover - lecture best-effort
        logger.warning("Impossible de lire l'accuracy courante : %s", exc)
        return None


def _backup_artifact() -> list[tuple[str, str]]:
    """Copie l'artefact courant et ses sidecars en .bak. Retourne les paires (bak, orig)."""
    model_path = gp_module.MODEL_PATH
    pairs: list[tuple[str, str]] = []
    for orig in (model_path, *(model_path + s for s in _SIDECAR_SUFFIXES), _metadata_path()):
        if os.path.exists(orig):
            bak = orig + ".bak"
            shutil.copy2(orig, bak)
            pairs.append((bak, orig))
    return pairs


def _restore_artifact(pairs: list[tuple[str, str]]) -> None:
    """Restaure les fichiers sauvegardés puis supprime les .bak."""
    for bak, orig in pairs:
        try:
            shutil.copy2(bak, orig)
        finally:
            _safe_remove(bak)


def _cleanup_backup(pairs: list[tuple[str, str]]) -> None:
    for bak, _orig in pairs:
        _safe_remove(bak)


def _safe_remove(path: str) -> None:
    try:
        if os.path.exists(path):
            os.remove(path)
    except OSError:  # pragma: no cover
        pass


def _log_event(db: Session, **kwargs: Any) -> ModelRetrainingLog:
    entry = ModelRetrainingLog(**kwargs)
    db.add(entry)
    db.commit()
    db.refresh(entry)
    return entry


def retrain_with_rollback(db: Session, triggered_by: Optional[str] = None) -> dict[str, Any]:
    """Ré-entraîne le gap predictor avec protection rollback.

    Retourne un dict structuré (jamais d'exception pour les cas métier) :
        status ∈ {success, rollback, no_data}, accuracy_before/after,
        dataset_size, max_drop, log_id.
    """
    data = DataService(db)
    teachers    = data.get_teacher_profile()
    comp_levels = data.get_competency_levels()
    req_levels  = data.get_required_levels()

    version = datetime.now(timezone.utc).strftime("v%Y%m%d-%H%M%S")

    if not teachers or not comp_levels or not req_levels:
        log = _log_event(
            db, model_name="gap_predictor", model_version=version,
            dataset_size=0, statut="failed",
            raison="Données insuffisantes (table source vide)",
            triggered_by=triggered_by,
        )
        return {
            "status": "no_data",
            "message": "Données insuffisantes pour ré-entraîner le modèle.",
            "accuracy_before": read_current_accuracy(),
            "accuracy_after": None,
            "dataset_size": 0,
            "log_id": log.id,
        }

    accuracy_before = read_current_accuracy()
    backup = _backup_artifact()

    try:
        metrics = gap_predictor.train(teachers, comp_levels, req_levels)
    except InsufficientDataError as exc:
        # L'artefact courant n'a pas été écrasé par train() en cas d'erreur
        # précoce, mais on nettoie toute sauvegarde par prudence.
        _cleanup_backup(backup)
        log = _log_event(
            db, model_name="gap_predictor", model_version=version,
            accuracy_before=accuracy_before, dataset_size=0, statut="failed",
            raison=str(exc.detail) if hasattr(exc, "detail") else str(exc),
            triggered_by=triggered_by,
        )
        return {
            "status": "insufficient_data",
            "message": str(exc.detail) if hasattr(exc, "detail") else str(exc),
            "accuracy_before": accuracy_before,
            "accuracy_after": None,
            "dataset_size": 0,
            "log_id": log.id,
        }

    accuracy_after = float(metrics.get("test_r2", 0.0))
    dataset_size   = int(metrics.get("n_samples", 0))
    max_drop       = settings.retrain_max_accuracy_drop

    regressed = (
        accuracy_before is not None
        and accuracy_after < accuracy_before - max_drop
    )

    if regressed:
        _restore_artifact(backup)
        gap_predictor.reload()
        log = _log_event(
            db, model_name="gap_predictor", model_version=version,
            accuracy_before=round(accuracy_before, 4),
            accuracy_after=round(accuracy_after, 4),
            dataset_size=dataset_size, statut="rollback",
            raison=(
                f"Régression de l'accuracy : {accuracy_after:.4f} < "
                f"{accuracy_before:.4f} - {max_drop} → rollback vers le modèle précédent."
            ),
            triggered_by=triggered_by,
        )
        logger.warning(
            "Ré-entraînement annulé (rollback) : R² %.4f → %.4f", accuracy_before, accuracy_after
        )
        return {
            "status": "rollback",
            "message": "Nouveau modèle moins performant — rollback effectué.",
            "accuracy_before": round(accuracy_before, 4),
            "accuracy_after": round(accuracy_after, 4),
            "max_drop": max_drop,
            "dataset_size": dataset_size,
            "model_version": version,
            "log_id": log.id,
        }

    _cleanup_backup(backup)
    log = _log_event(
        db, model_name="gap_predictor", model_version=version,
        accuracy_before=round(accuracy_before, 4) if accuracy_before is not None else None,
        accuracy_after=round(accuracy_after, 4),
        dataset_size=dataset_size, statut="success",
        raison="Nouveau modèle conservé.",
        triggered_by=triggered_by,
    )
    logger.info(
        "Ré-entraînement réussi : R² %s → %.4f (n=%d)",
        f"{accuracy_before:.4f}" if accuracy_before is not None else "n/a",
        accuracy_after, dataset_size,
    )
    return {
        "status": "success",
        "message": "Modèle ré-entraîné et conservé.",
        "accuracy_before": round(accuracy_before, 4) if accuracy_before is not None else None,
        "accuracy_after": round(accuracy_after, 4),
        "max_drop": max_drop,
        "dataset_size": dataset_size,
        "model_version": version,
        "metrics": metrics,
        "log_id": log.id,
    }
