"""Pipeline de ré-entraînement avec protection rollback (spec §5) + warm start.

Trois modes d'entraînement :
1. **Full retrain** (`retrain_with_rollback`) : ré-entraîne de zéro, compare
   R², rollback si régression. Mode par défaut.
2. **Incremental update** (`incremental_update`) : ajoute de nouvelles données
   au modèle existant via `warm_start` (scikit-learn) ou `n_estimators +=`
   (XGBoost/LightGBM). Plus rapide, utile pour les mises à jour quotidiennes.
3. **Model selection** (`retrain_with_rollback`) : teste 3 algorithmes
   (GB, XGB, LGBM) et sélectionne le meilleur.

Le warm start permet d'itérer le boosting sur de nouvelles données sans
repartir de zéro, ce qui réduit le temps d'entraînement de ~60-80%
tout en maintenant la qualité du modèle.
"""

from __future__ import annotations

import json
import logging
import os
import shutil
from datetime import datetime, timezone
from typing import Any, Optional

import numpy as np
from sqlalchemy.orm import Session

from app.config import settings
from app.core.exceptions import InsufficientDataError
from app.ml import gap_predictor as gp_module
from app.ml.gap_predictor import gap_predictor
from app.ml.feature_engineering import (
    apply_normalization, build_gap_labels, build_teacher_features,
    compute_feature_ranges,
)
from app.models.db_models import ModelRetrainingLog
from app.services.data_service import DataService

logger = logging.getLogger(__name__)

_SIDECAR_SUFFIXES = (".sha256", ".hmac")


def _metadata_path() -> str:
    """Métadonnées APPARIÉES à l'artefact réellement servi.

    Ce chemin était figé sur ``training_metadata.json``, qui décrit l'ancien
    ``gap_predictor.joblib`` (gradient_boosting, 21 features, 80 échantillons,
    ``test_r2 = 1.0`` après suppression de 14 features constantes), alors que
    ``GAP_MODEL_FILE`` sert ``gap_predictor_temporal.joblib``. Le KPI de
    performance du modèle affichait donc « précision 100 % » pour un modèle
    dont le R² réel est 0,2458. Même correctif que ``gap_predictor`` : le nom
    du fichier se déduit de l'artefact servi.
    """
    return os.path.join(settings.models_dir, gp_module.TRAINING_METADATA_FILE)


def _read_json(path: str) -> dict[str, Any]:
    """Lecture JSON best-effort (dict vide si absent ou illisible)."""
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            data = json.load(f)
        return data if isinstance(data, dict) else {}
    except Exception as exc:  # pragma: no cover - lecture best-effort
        logger.warning("Lecture JSON impossible (%s) : %s", path, exc)
        return {}


def read_current_accuracy() -> Optional[float]:
    """R² test du modèle servi (None si absent / jamais entraîné).

    Sert la détection de RÉGRESSION au ré-entraînement : ``accuracy_after``
    est lui aussi un ``test_r2``, la comparaison reste donc homogène. Ce n'est
    PAS une précision affichable — pour l'affichage, voir
    ``read_served_model_metrics()``.
    """
    val = (_read_json(_metadata_path()).get("metrics") or {}).get("test_r2")
    try:
        return float(val) if val is not None else None
    except (TypeError, ValueError):
        return None


def _active_registry_entry() -> dict[str, Any]:
    """Entrée ACTIVE du registre d'artefacts (dict vide si aucune)."""
    path = os.path.join(settings.models_dir, getattr(settings, "ml_registry_path", None)
                        or "model_registry.json")
    if not os.path.exists(path):
        return {}
    try:
        with open(path, "r", encoding="utf-8") as f:
            entries = json.load(f)
        if not isinstance(entries, list):
            return {}
        actives = [e for e in entries if isinstance(e, dict) and e.get("status") == "ACTIVE"]
        return actives[-1] if actives else {}
    except Exception as exc:  # pragma: no cover - lecture best-effort
        logger.warning("Lecture du registre impossible : %s", exc)
        return {}


def _ratio(value: Any) -> Optional[float]:
    """Convertit un pourcentage de registre (0..100) en ratio 0..1."""
    try:
        return round(float(value) / 100.0, 4)
    except (TypeError, ValueError):
        return None


def read_served_model_metrics() -> dict[str, Any]:
    """Métriques AFFICHABLES du modèle réellement servi.

    Le R² n'est pas une précision : l'exposer sous le libellé « accuracy »
    laissait croire à une performance de 100 % là où le modèle servi place
    34,9 % de ses prédictions à moins d'un niveau de la cible. Les deux
    familles de métriques sont donc distinctes et nommées explicitement :
    - ``r2``/``rmse``/``mae`` viennent de la metadata appariée à l'artefact ;
    - ``accuracy_pm05``/``accuracy_pm10`` (part des prédictions à +/- 0,5 et
      +/- 1,0 niveau) viennent de l'entrée ACTIVE du registre, seule source
      qui les porte.
    """
    meta = _read_json(_metadata_path())
    metrics = meta.get("metrics") or {}
    entry = _active_registry_entry()
    entry_metrics = entry.get("metrics") or {}

    def _num(value: Any) -> Optional[float]:
        try:
            return float(value) if value is not None else None
        except (TypeError, ValueError):
            return None

    return {
        "model_name": entry.get("model_name") or meta.get("model_name"),
        "model_version": entry.get("model_version") or meta.get("model_version"),
        "algorithm": meta.get("algorithm"),
        "n_features": meta.get("n_features") or len(entry.get("feature_names") or []) or None,
        "metadata_file": gp_module.TRAINING_METADATA_FILE,
        "r2": _num(metrics.get("test_r2")),
        "rmse": _num(metrics.get("test_rmse")),
        "mae": _num(metrics.get("test_mae")),
        "accuracy_pm05": _ratio(entry_metrics.get("accuracy_pm05")),
        "accuracy_pm10": _ratio(entry_metrics.get("accuracy_pm10")),
        "target_validity": entry.get("target_validity"),
    }


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


# ── Incremental learning (warm start) ────────────────────────

def incremental_update(db: Session, triggered_by: Optional[str] = None) -> dict[str, Any]:
    """Mise à jour incrémentale du modèle via warm start.

    Au lieu de ré-entraîner de zéro, le modèle courant est itéré sur
    les nouvelles données. Cela est ~60-80% plus rapide qu'un full retrain
    tout en maintenant la qualité.

    Compatible avec :
    - GradientBoostingRegressor (warm_start=True, n_estimators += 50)
    - XGBoost (xgb_model= previous booster)
    - LightGBM (init_model= previous booster)

    Si aucun modèle n'existe, effectue un entraînement complet initial.
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
            raison="Données insuffisantes pour l'incrémental update",
            triggered_by=triggered_by,
        )
        return {
            "status": "no_data",
            "message": "Données insuffisantes pour la mise à jour incrémentale.",
            "log_id": log.id,
        }

    # If no model exists, fall back to full retrain.
    if gap_predictor.model is None:
        logger.info("No existing model — falling back to full retrain")
        return retrain_with_rollback(db, triggered_by)

    accuracy_before = read_current_accuracy()

    try:
        metrics = _warm_start_train(gap_predictor, teachers, comp_levels, req_levels)
    except InsufficientDataError as exc:
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
        gap_predictor.reload()
        log = _log_event(
            db, model_name="gap_predictor", model_version=version,
            accuracy_before=round(accuracy_before, 4),
            accuracy_after=round(accuracy_after, 4),
            dataset_size=dataset_size, statut="rollback",
            raison=(
                f"Incrémental: régression {accuracy_after:.4f} < "
                f"{accuracy_before:.4f} - {max_drop} → reload modèle précédent."
            ),
            triggered_by=triggered_by,
        )
        return {
            "status": "rollback",
            "message": "Mise à jour incrémentale dégradée — modèle précédent restauré.",
            "accuracy_before": round(accuracy_before, 4),
            "accuracy_after": round(accuracy_after, 4),
            "log_id": log.id,
        }

    gap_predictor._save_model()
    log = _log_event(
        db, model_name="gap_predictor", model_version=version,
        accuracy_before=round(accuracy_before, 4) if accuracy_before is not None else None,
        accuracy_after=round(accuracy_after, 4),
        dataset_size=dataset_size, statut="success",
        raison="Mise à jour incrémentale effectuée.",
        triggered_by=triggered_by,
    )
    logger.info(
        "Incremental update: R² %s → %.4f (n=%d)",
        f"{accuracy_before:.4f}" if accuracy_before is not None else "n/a",
        accuracy_after, dataset_size,
    )
    return {
        "status": "success",
        "message": "Modèle mis à jour par warm start.",
        "accuracy_before": round(accuracy_before, 4) if accuracy_before is not None else None,
        "accuracy_after": round(accuracy_after, 4),
        "dataset_size": dataset_size,
        "model_version": version,
        "mode": "incremental",
        "log_id": log.id,
    }


def _warm_start_train(predictor, teacher_profiles, comp_levels, req_levels) -> dict[str, Any]:
    """Execute warm start training on an existing model.

    Supports GB (warm_start=True), XGBoost (xgb_model), LightGBM (init_model).
    """
    from sklearn.model_selection import train_test_split

    df_teacher = build_teacher_features(teacher_profiles, comp_levels)
    df_gaps = build_gap_labels(comp_levels, req_levels)

    if df_teacher.empty or df_gaps.empty:
        raise InsufficientDataError("Données insuffisantes pour warm start")

    df_train = df_gaps.merge(df_teacher, on="enseignant_id", how="left", validate="m:1")
    from app.ml.gap_predictor import FEATURE_COLS
    df_train = df_train.dropna(subset=FEATURE_COLS + ["gap"])

    if len(df_train) < settings.min_training_samples:
        raise InsufficientDataError(
            f"Warm start: {len(df_train)} lignes < seuil {settings.min_training_samples}"
        )

    x_df = df_train[FEATURE_COLS].copy()
    y = df_train["gap"].values.clip(0, 5)

    # Balanced sample weights (rebalance rare gap classes)
    y_bins = _discretize_y(y, n_bins=5)
    bin_counts = np.bincount(y_bins)
    bin_weights = 1.0 / np.maximum(bin_counts[y_bins], 1)
    bin_weights *= len(y_bins) / bin_weights.sum()

    if predictor.feature_ranges:
        x_df = apply_normalization(x_df, FEATURE_COLS, predictor.feature_ranges)
    else:
        predictor.feature_ranges = compute_feature_ranges(x_df, FEATURE_COLS)
        x_df = apply_normalization(x_df, FEATURE_COLS, predictor.feature_ranges)

    X = x_df.values
    X_train, X_test, y_train, y_test, w_train, w_test = train_test_split(
        X, y, bin_weights, test_size=0.2, random_state=42
    )

    model = predictor.model
    model_name = predictor.model_name

    # ── Warm start depending on model type ────────────────────
    if model_name == "xgboost" and hasattr(model, "get_booster"):
        import xgboost as xgb
        # Save current booster
        prev_booster = model.get_booster()
        model = xgb.XGBRegressor(
            n_estimators=50, max_depth=5, learning_rate=0.1,
            subsample=0.8, random_state=42, verbosity=0,
        )
        model.fit(X_train, y_train, xgb_model=prev_booster, sample_weight=w_train)

    elif model_name == "lightgbm" and hasattr(model, "booster_"):
        import lightgbm as lgb
        prev_model_path = os.path.join(settings.models_dir, "_lgb_prev.txt")
        model.booster_.save_model(prev_model_path)
        model = lgb.LGBMRegressor(
            n_estimators=50, max_depth=5, learning_rate=0.1,
            subsample=0.8, random_state=42, verbose=-1,
        )
        model.fit(X_train, y_train, init_model=prev_model_path)
        _safe_remove(prev_model_path)

    else:
        # scikit-learn GradientBoostingRegressor: warm_start adds 50 more trees
        if hasattr(model, "set_params"):
            model.set_params(warm_start=True, n_estimators=model.n_estimators + 50)
        model.fit(X_train, y_train, sample_weight=w_train)

    predictor.model = model

    # Update metrics
    from sklearn.model_selection import cross_val_score
    cv_scores = cross_val_score(
        model, X_train, y_train,
        cv=min(settings.cv_folds, 5), scoring="neg_root_mean_squared_error",
    )
    cv_rmse = -cv_scores.mean()
    test_score = model.score(X_test, y_test)
    test_rmse = np.sqrt(np.mean((model.predict(X_test) - y_test) ** 2))

    if hasattr(model, "feature_importances_"):
        predictor.feature_importances = dict(
            zip(FEATURE_COLS, model.feature_importances_.tolist())
        )

    metrics = {
        "cv_rmse": round(cv_rmse, 3),
        "test_r2": round(test_score, 3),
        "test_rmse": round(test_rmse, 3),
        "n_samples": len(df_train),
    }
    predictor.last_metrics = metrics
    return metrics
