"""Port ML de risque — serving calibre avec repli heuristique FAIL-CLOSED.

Architecture (chapitre moteur de risque — etape 3) :
- Charge ``risk_predictor_simulation.joblib`` (decision=accept UNIQUEMENT) +
  sidecar sha256 + metadonnees ``risk_training_metadata.json``.
- Predait la classe de risque + probabilités calibrées (isotonique sur CRITICAL).
- Retourne le top-3 des contributions par enseignant (SHAP TreeExplainer si
  disponible, sinon contributions natives du booster — méthode étiquetée).
- FAIL-CLOSED : modele absent, decision != accept, integrite invalide, feature
  hors plage, erreur de prediction, probabilités incoherentes => repli sur le
  moteur heuristique (0.50/0.12/0.40) avec ``fallback_reason`` explicite.
  Le score n'est JAMAIS force hors plage.

Le moteur heuristique n'est PAS supprime : c'est le repli documenté et testé
(safety net) de l'architecture de production réelle.
"""
from __future__ import annotations

import json
from pathlib import Path
from typing import Any

import numpy as np

from app.core.logging import get_logger
from app.infrastructure.ml.artifact_integrity import ArtifactIntegrityError, load_with_integrity_check
from app.infrastructure.ml.risk_features import RISK_FEATURES, features_to_vector

logger = get_logger("risk_ml_predictor")

HEURISTIC_WEIGHTS = {"critical_gaps": 0.50, "high_gaps": 0.12, "avg_gap_score": 0.40}


class RiskMLResult:
    """Résultat d'une prédiction de risque ML servie."""

    # Construit le résultat ML : classe de risque prédite, probabilités
    # calibrées, contributions top-3 et métadonnées (version, origine, scope).
    def __init__(
        self,
        risk_class: str,
        probabilities: dict[str, float],
        contributions: list[dict],
        explanation_method: str,
        model_version: str,
        candidate: str,
        validation_scope: str,
        data_origin: str,
    ) -> None:
        self.risk_class = risk_class
        self.probabilities = probabilities
        self.probability_calibrated = probabilities.get(risk_class, 0.0)
        self.contributions = contributions
        self.explanation_method = explanation_method
        self.model_version = model_version
        self.candidate = candidate
        self.validation_scope = validation_scope
        self.data_origin = data_origin

    # Sérialise le résultat ML en payload JSON pour la réponse API
    # (mode="ML", aucune fallback_reason car le ML a bien servi).
    def to_payload(self) -> dict[str, Any]:
        return {
            "mode": "ML",
            "risk_class": self.risk_class,
            "probability_calibrated": round(self.probability_calibrated, 4),
            "probabilities": {k: round(v, 4) for k, v in self.probabilities.items()},
            "contributions": self.contributions,
            "explanation_method": self.explanation_method,
            "model_version": self.model_version,
            "model_candidate": self.candidate,
            "data_origin": self.data_origin,
            "validation_scope": self.validation_scope,
            "fallback_reason": None,
        }


class RiskMLPredictor:
    """Port de serving du modele de risque (fail-closed vers l'heuristique)."""

    # Initialise le port ML : chemin des modèles, artefact non chargé,
    # compteurs de serving et des replis heuristiques (exposés dans /health).
    def __init__(self, models_dir: Path) -> None:
        self._models_dir = Path(models_dir)
        self._artifact: dict | None = None
        self._metadata: dict | None = None
        self._load_attempted = False
        self._load_error: str | None = None
        # Compteurs de serving (exposes dans /health)
        self.ml_serving_count = 0
        self.heuristic_fallback_count = 0
        self.fallback_reasons: list[str] = []

    # Chemin de l'artefact du modèle de risque (joblib).
    @property
    def artifact_path(self) -> Path:
        return self._models_dir / "risk_predictor_simulation.joblib"

    # Chemin des métadonnées d'entraînement du modèle de risque (JSON).
    @property
    def metadata_path(self) -> Path:
        return self._models_dir / "risk_training_metadata.json"

    # Chargement fail-closed de l'artefact : refuse si fichier absent,
    # intégrité non validée (SHA-256/HMAC) ou decision != "accept".
    # En cas de refus, _load_error contient la raison du repli heuristique.
    def _load(self) -> None:
        self._load_attempted = True
        if not self.artifact_path.exists():
            self._load_error = "artefact du modele de risque absent"
            logger.info("risk ML indisponible : artefact absent", path=str(self.artifact_path))
            return
        try:
            artifact = load_with_integrity_check(self.artifact_path)
        except ArtifactIntegrityError as exc:
            self._load_error = f"integrite de l'artefact non validee : {exc}"
            logger.error("risk ML refuse pour integrite non validee", error=str(exc))
            return
        except Exception as exc:  # pragma: no cover
            self._load_error = f"chargement impossible : {exc}"
            logger.error("chargement du modele de risque impossible", error=str(exc))
            return
        metadata: dict = {}
        if self.metadata_path.exists():
            try:
                metadata = json.loads(self.metadata_path.read_text(encoding="utf-8"))
            except Exception:  # pragma: no cover
                metadata = {}
        decision = str(artifact.get("decision") or metadata.get("decision") or "reject")
        if decision != "accept":
            self._load_error = (
                f"modele de risque non deploye : decision={decision} "
                f"(seuils d'acceptation non atteints — repli heuristique)"
            )
            logger.info("risk ML refuse : decision != accept", decision=decision)
            return
        self._artifact = artifact
        self._metadata = metadata
        self._load_error = None

    # État de serving du modèle de risque pour /health : actif ou non,
    # version, décision, métriques (Brier, macro-F1) et compteurs fallback.
    def status(self) -> dict[str, Any]:
        if not self._load_attempted:
            self._load()
        available = self._artifact is not None
        meta = self._metadata or {}
        return {
            "risk_ml_active": available,
            "risk_model_version": (self._artifact or {}).get("model_version") or meta.get("model_version"),
            "risk_candidate": (self._artifact or {}).get("candidate") or meta.get("selected_candidate"),
            "risk_decision": meta.get("decision") or (self._artifact or {}).get("decision"),
            "risk_validation_scope": meta.get("validation_scope"),
            "risk_data_origin": meta.get("data_origin"),
            "risk_brier": (meta.get("calibration") or {}).get("brier_critical"),
            "risk_macro_f1": (meta.get("metrics") or {}).get("macro_f1"),
            "risk_explanation_method": (meta.get("explainability") or {}).get("method"),
            "risk_monotone": (meta.get("monotonicity") or {}).get("all_monotone"),
            "risk_ml_serving_count": self.ml_serving_count,
            "risk_heuristic_fallback_count": self.heuristic_fallback_count,
            "risk_fallback_reason": self._load_error,
        }

    # --------------------------------------------------------------- predict
    def predict(self, features: dict[str, float]) -> tuple[RiskMLResult | None, str | None]:
        """Prédiction calibrée. Retourne (resultat, None) ou (None, fallback_reason).

        Fail-closed : toute condition dégradée => (None, raison) et le moteur
        heuristique (0.50/0.12/0.40) reste la source de vérité.
        """
        if not self._load_attempted:
            self._load()
        if self._artifact is None:
            self.heuristic_fallback_count += 1
            reason = self._load_error or "modele de risque indisponible"
            self._record_fallback(reason)
            return None, reason
        try:
            artifact = self._artifact
            ranges = artifact.get("feature_ranges") or {}
            out_of_range = [
                c for c in RISK_FEATURES
                if c in ranges and not (ranges[c]["min"] <= float(features.get(c, 0.0)) <= ranges[c]["max"])
            ]
            if out_of_range:
                self.heuristic_fallback_count += 1
                reason = "features hors plage du modele : " + ", ".join(sorted(out_of_range))
                self._record_fallback(reason)
                return None, reason

            vector = np.array([features_to_vector(features)], dtype=float)
            model = artifact["model"]
            proba = np.asarray(model.predict_proba(vector), dtype=float)[0]
            classes = [str(c) for c in (artifact.get("classes") or getattr(model, "classes_", []))]
            calibrator = artifact.get("calibrator")
            if calibrator is not None and "CRITICAL" in classes:
                i_crit = classes.index("CRITICAL")
                p_crit = float(np.clip(calibrator.predict(np.array([proba[i_crit]]))[0], 0.0, 1.0))
                others = [i for i in range(len(classes)) if i != i_crit]
                other_sum = float(proba[others].sum())
                proba = proba.copy()
                if other_sum > 0:
                    for i in others:
                        proba[i] = proba[i] * (1.0 - p_crit) / other_sum
                else:
                    for i in others:
                        proba[i] = 0.0
                proba[i_crit] = p_crit
            total = float(proba.sum())
            if not np.isfinite(proba).all() or total <= 0.0 or abs(total - 1.0) > 0.05:
                raise ValueError(f"probabilites incoherentes (somme={total})")
            proba = proba / total
            probabilities = {c: float(p) for c, p in zip(classes, proba)}
            risk_class = max(probabilities, key=probabilities.get)

            contributions = self._contributions(artifact, model, vector, features)
            self.ml_serving_count += 1
            result = RiskMLResult(
                risk_class=risk_class,
                probabilities=probabilities,
                contributions=contributions,
                explanation_method=str((self._metadata or {}).get("explainability", {}).get("method") or "model"),
                model_version=str(artifact.get("model_version")),
                candidate=str(artifact.get("candidate")),
                validation_scope=str((self._metadata or {}).get("validation_scope") or "SIMULATION_VALIDATED"),
                data_origin=str((self._metadata or {}).get("data_origin") or "SIMULATED"),
            )
            return result, None
        except Exception as exc:
            self.heuristic_fallback_count += 1
            reason = f"echec de prediction ML : {exc}"
            self._record_fallback(reason)
            return None, reason

    # Journalise un repli heuristique : garde les 50 dernières raisons en
    # mémoire (diagnostic) et incrémente le compteur de fallback.
    def _record_fallback(self, reason: str) -> None:
        self.fallback_reasons.append(reason)
        if len(self.fallback_reasons) > 50:
            self.fallback_reasons = self.fallback_reasons[-50:]
        logger.info("risk ML repli heuristique (fail-closed)", reason=reason)

    def _contributions(self, artifact: dict, model: Any, vector: np.ndarray, features: dict[str, float]) -> list[dict]:
        """Top-3 contributions par enseignant (SHAP si dispo, sinon proxy étiqueté)."""
        method = "model"
        values: np.ndarray | None = None
        model_core = model[-1] if not hasattr(model, "classes_") else model
        try:
            import shap  # type: ignore
            explainer = shap.TreeExplainer(model_core)
            sv = explainer.shap_values(vector)
            if isinstance(sv, list):
                values = np.sum([np.abs(a)[0] for a in sv], axis=0)
            else:
                arr = np.asarray(sv)
                values = np.abs(arr[0]).sum(axis=-1) if arr.ndim == 3 else np.abs(arr[0])
            method = "shap.TreeExplainer"
        except Exception:
            try:
                if hasattr(model_core, "get_booster"):
                    import xgboost  # type: ignore
                    dm = xgboost.DMatrix(vector, feature_names=RISK_FEATURES)
                    contribs = np.asarray(model_core.get_booster().predict(dm, pred_contribs=True))
                    values = np.abs(contribs[0][:, :-1]).sum(axis=-1) if contribs.ndim == 3 else np.abs(contribs[0][:-1])
                    method = "xgboost.pred_contribs"
                elif hasattr(model_core, "coef_"):
                    values = np.abs(model_core.coef_).sum(axis=0)
                    method = "logistic_coefficients"
                elif hasattr(model_core, "feature_importances_"):
                    values = np.asarray(model_core.feature_importances_, dtype=float)
                    method = "feature_importances_proxy"
            except Exception:
                values = None
        if values is None or len(values) != len(RISK_FEATURES):
            return []
        order = sorted(range(len(RISK_FEATURES)), key=lambda i: -float(values[i]))[:3]
        total = float(np.sum(np.abs(values))) or 1.0
        return [
            {
                "feature": RISK_FEATURES[i],
                "value": round(float(features.get(RISK_FEATURES[i], 0.0)), 4),
                "impact": round(float(values[i]) / total, 4),
                "method": method,
            }
            for i in order
        ]



