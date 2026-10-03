"""Contrat d'exposition des métadonnées de modèle — un seul helper, partout.

Audit d'autorité 2026-09-22 (§3.6) : `model_mode` / `model_version` /
`fallback_reason` étaient présents sur `/model-health` et la famille
`/teachers/{id}/*` (sauf recommandations), mais ABSENTS des recommandations, des
chemins legacy (`/gaps/{id}`, `/risk/{id}`, `/recommendations/{id}`) et de tous
les tableaux de bord. Une réponse analytics qui ne dit pas quel moteur l'a
produite n'est pas auditable : ce module centralise le bloc `meta`, dans
l'esprit du pattern déjà utilisé par `gaps.py`.

Règle : le bloc ne ment jamais. En repli, `model_version` vaut `null` (aucun
modèle n'a produit la réponse) et `fallback_reason` porte la raison.
"""
from __future__ import annotations

from typing import Any

from app.core.logging import get_logger

logger = get_logger("model_meta")

# Champs du contrat, présents sur TOUS les endpoints analytics.
CONTRACT_KEYS = (
    "model_mode",
    "model_version",
    "model_name",
    "fallback_reason",
    "dataset_version",
    "prediction_horizon",
    "prediction_kind",
    "target_validity",
    "target_validity_label",
    "data_origin",
    "validation_scope",
    "provenance",
    # Moteur de RISQUE : moteur distinct des écarts — jamais confondu avec lui.
    "risk_model_mode",
    "risk_model_version",
    "risk_model_name",
    "risk_fallback_reason",
)


def model_meta_from_status(
    status: dict[str, Any] | None,
    risk_status: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Bloc `meta` contractuel construit depuis `ArtifactModelPort.status()`.

    Attention : on ne retombe JAMAIS sur `status["version"]` (date
    d'entraînement) pour `model_version` — un repli qui afficherait une date
    comme version de modèle serait un mensonge de plus (audit §3.4, point 2).
    """
    status = status or {}
    risk_status = risk_status or {}
    provenance = status.get("provenance") if isinstance(status.get("provenance"), dict) else {}
    risk_ml_active = bool(risk_status.get("risk_ml_active"))
    return {
        "model_mode": status.get("model_mode") or status.get("mode"),
        "model_version": status.get("model_version"),
        "model_name": status.get("artifact_name") or status.get("model_name"),
        "fallback_reason": status.get("fallback_reason"),
        "dataset_version": provenance.get("dataset_version"),
        "prediction_horizon": status.get("prediction_horizon"),
        "prediction_kind": status.get("prediction_kind"),
        "target_validity": status.get("target_validity"),
        "target_validity_label": status.get("target_validity_label"),
        "data_origin": status.get("data_origin"),
        "validation_scope": status.get("validation_scope"),
        "provenance": provenance,
        "risk_model_mode": "ML" if risk_ml_active else "HEURISTIC",
        "risk_model_version": risk_status.get("risk_model_version") if risk_ml_active else None,
        "risk_model_name": "risk_predictor" if risk_ml_active else "weighted_heuristic_index",
        "risk_fallback_reason": risk_status.get("risk_fallback_reason"),
    }


def build_model_meta(container) -> dict[str, Any]:
    """Bloc meta pour les routes de l'application DDD (container injecté)."""
    status: dict[str, Any] = {}
    risk_status: dict[str, Any] = {}
    try:
        status = container.model_port.status() or {}
    except Exception as exc:  # pragma: no cover - défense en profondeur
        logger.warning("status du port ML indisponible", error=str(exc))
    try:
        risk_status = container.model_port.risk_ml_status() or {}
    except Exception as exc:  # pragma: no cover
        logger.warning("statut du risque ML indisponible", error=str(exc))
    return model_meta_from_status(status, risk_status)


_LEGACY_PORT: Any | None = None


def legacy_model_port():
    """Port ML partagé pour les routes legacy (`app_legacy/routers/*`).

    Les routes legacy n'ont pas de `Container` : elles ne reçoivent qu'une
    session SQLAlchemy. Le port est construit paresseusement depuis les
    settings (aucune connexion DB n'est ouverte par `status()`), et mis en
    cache — le chargement de l'artefact est ainsi fait une seule fois.
    """
    global _LEGACY_PORT
    if _LEGACY_PORT is None:
        from app.core.config import get_settings
        from app.infrastructure.db.database import Database
        from app.infrastructure.ml.predictor import ArtifactModelPort

        settings = get_settings()
        _LEGACY_PORT = ArtifactModelPort(settings, Database(settings))
    return _LEGACY_PORT


def legacy_model_meta() -> dict[str, Any]:
    """Bloc meta contractuel pour les endpoints legacy (jamais bloquant)."""
    try:
        port = legacy_model_port()
        return model_meta_from_status(port.status(), port.risk_ml_status())
    except Exception as exc:  # pragma: no cover - le legacy reste servi
        logger.warning("metadonnees de modele indisponibles (legacy)", error=str(exc))
        return {}
