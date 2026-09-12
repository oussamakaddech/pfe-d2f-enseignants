"""Port ML : charge le modele gap_predictor_temporal et utilise ses predictions.

Modes d'execution :

1. ``PRODUCTION_ML`` : toutes les validations passent (integrite, provenance
   calculee depuis les lignes du dataset, features compatibles, registre approuve),
   l'API expose les predictions du modele.
2. ``DEMO_ML`` : le corpus est synthetique ou insuffisant, le modele est
   disponible mais presente comme demonstration, jamais comme production.
3. ``HEURISTIC_FALLBACK`` : echec d'integrite, de provenance, de schema ou de
   disponibilite — le moteur heuristique explicable reste la source de verite.

Anti-fuite : ``required_level`` et ``gap_next_3m`` ne sont jamais dans les features.
Integrite : SHA-256 / HMAC verifies avant chargement (fail-closed).
La part synthetique est TOUJOURS calculee depuis les lignes du dataset
(colonne ``is_synthetic``), jamais lue depuis une variable arbitraire.
"""
from __future__ import annotations

import json
from datetime import date, datetime
from pathlib import Path
from typing import Any, Optional

import numpy as np
from sqlalchemy import text

from app.core.logging import get_logger
from app.core.ml_status import DEMO_ML, HEURISTIC_FALLBACK, PRODUCTION_ML
from app.domain.entities.risk_profile import RiskFactor, RiskProfile
from app.domain.entities.skill_gap import SkillGap
from app.domain.value_objects.enums import RiskLevel, Severity, Trend
from app.infrastructure.ml.artifact_integrity import (
    ArtifactIntegrityError,
    load_with_integrity_check,
)
from app.infrastructure.ml.dataset_provenance import (
    DatasetProvenanceReport,
    compute_provenance,
)
from app.infrastructure.ml.feature_schema import (
    validate_feature_spec,
    validate_feature_vector,
)
from app.infrastructure.ml.ml_observability import ml_observability
from app.infrastructure.ml.skew_guard import SkewGuard
from app.infrastructure.ml.model_registry import (
    APPROVAL_APPROVED,
    STATUS_ACTIVE,
    TARGET_VALIDITY_EXTRAPOLATED,
    TARGET_VALIDITY_OBSERVED_SIMULATION,
    TARGET_VALIDITY_REAL,
    DATA_ORIGIN_SIMULATED,
    VALIDATION_SCOPE_REAL,
    VALIDATION_SCOPE_SIMULATION,
    ModelRegistry,
    RegistryEntry,
)
from app.infrastructure.ml.risk_features import (
    AGG_FEATURE_SOURCES,
    build_serving_features,
)


logger = get_logger("ml_predictor")

# Normalisation du score de risque (règle métier dérivée des gaps) :
# - Caps documentés : au-delà de ces bornes, le facteur normalisé reste 1.0.
# - Poids : somme = 1.02 (> 1.0) -> le score final est plafonné à 1.0 et le
#   dépassement éventuel est exposé via RiskProfile.is_capped/uncapped_score.
CRITICAL_GAP_CAP = 2.0
HIGH_GAP_CAP = 1.0
RISK_RULE_WEIGHTS = {"critical_gaps": 0.50, "high_gaps": 0.12, "avg_gap_score": 0.40}


def rule_risk_from_gaps(
    teacher_id: str,
    gaps: list[SkillGap],
    scope: str = "TEACHER",
    scope_type: str = "TEACHER",
    scope_id: str | None = None,
    scope_label: str | None = None,
) -> RiskProfile:
    """Score de risque par règle métier dérivée des gaps (normalisé).

    Facteurs normalisés dans [0, 1] avec caps documentés :
    - critical_gaps : cap ``CRITICAL_GAP_CAP`` (2) ;
    - high_gaps : cap ``HIGH_GAP_CAP`` (1) ;
    - avg_gap_score : déjà borné dans [0, 1] par construction.

    Contribution = facteur normalisé * poids (``RISK_RULE_WEIGHTS``) ;
    score = min(1, somme des contributions) ; le dépassement éventuel est
    exposé via ``is_capped`` / ``uncapped_score`` (poids total = 1.02 ->
    cap atteignable). Niveaux : CRITICAL >= 75, HIGH >= 50, MEDIUM >= 30.

    ``scope`` documente le périmètre des gaps comptés :
    - ``TEACHER`` : référentiel personnel de l'enseignant (pas de
      rattachement, ou périmètre global par défaut) ;
    - ``DEPARTMENT`` : gaps du périmètre départemental/UP de l'enseignant.

    ``scope_type`` / ``scope_id`` / ``scope_label`` décrivent le scope
    concret (ex : ``DEPARTMENT`` / ``DEP_RESEAUX`` / ``Département Réseaux``).
    Le libellé du facteur est TOUJOURS le même (« Gaps critiques ») — le
    scope est exposé séparément via ``scope_label`` (jamais concaténé dans
    le label, ce qui évite « périmètrepérimètre »).
    """
    if not gaps:
        return RiskProfile(teacher_id=teacher_id, risk_score=0.0, risk_level=RiskLevel.LOW, factors=())
    critical = sum(1 for g in gaps if g.severity == Severity.CRITICAL)
    high = sum(1 for g in gaps if g.severity == Severity.HIGH)
    avg_gap = float(np.mean([g.gap_score for g in gaps]))

    n_critical_norm = min(1.0, critical / CRITICAL_GAP_CAP)
    n_high_norm = min(1.0, high / HIGH_GAP_CAP)
    avg_norm = min(1.0, max(0.0, avg_gap))
    contrib_critical = n_critical_norm * RISK_RULE_WEIGHTS["critical_gaps"]
    contrib_high = n_high_norm * RISK_RULE_WEIGHTS["high_gaps"]
    contrib_avg = avg_norm * RISK_RULE_WEIGHTS["avg_gap_score"]
    uncapped = contrib_critical + contrib_high + contrib_avg
    score_01 = min(1.0, max(0.0, uncapped))
    risk_score = round(100.0 * score_01, 2)
    is_capped = uncapped > 1.0
    if risk_score >= 75:
        level = RiskLevel.CRITICAL
    elif risk_score >= 50:
        level = RiskLevel.HIGH
    elif risk_score >= 30:
        level = RiskLevel.MEDIUM
    else:
        level = RiskLevel.LOW
    factors = (
        RiskFactor(
            feature="critical_gaps",
            value=float(critical),
            normalized_value=round(n_critical_norm, 4),
            weight=RISK_RULE_WEIGHTS["critical_gaps"],
            contribution=round(contrib_critical, 4),
            label="Gaps critiques",
            scope=scope,
            scope_type=scope_type,
            scope_id=scope_id,
            scope_label=scope_label,
        ),
        RiskFactor(
            feature="high_gaps",
            value=float(high),
            normalized_value=round(n_high_norm, 4),
            weight=RISK_RULE_WEIGHTS["high_gaps"],
            contribution=round(contrib_high, 4),
            label="Gaps de haute urgence",
            scope=scope,
            scope_type=scope_type,
            scope_id=scope_id,
            scope_label=scope_label,
        ),
        RiskFactor(
            feature="avg_gap_score",
            value=round(avg_gap, 4),
            normalized_value=round(avg_norm, 4),
            weight=RISK_RULE_WEIGHTS["avg_gap_score"],
            contribution=round(contrib_avg, 4),
            label="Profondeur moyenne des gaps",
            scope=scope,
            scope_type=scope_type,
            scope_id=scope_id,
            scope_label=scope_label,
        ),
    )
    return RiskProfile(
        teacher_id=teacher_id,
        risk_score=risk_score,
        risk_level=level,
        factors=factors,
        is_capped=is_capped,
        uncapped_score=round(uncapped, 4),
    )


# Schema de features canonique — version 1.0
FEATURE_SCHEMA_VERSION = "1.0"

TEMPORAL_FEATURE_COLS = [
    "current_level_t3", "current_level_t2", "current_level_t1", "current_level_t",
    "lag_gap_t3_t2", "lag_gap_t2_t1", "lag_gap_t1_t", "rolling_tendance",
    "days_since_last_training", "training_frequency_per_month", "is_long_absent", "is_stagnant",
    "avg_level", "min_level", "max_level", "nb_level_5", "nb_level_1",
    "nb_savoirs", "nb_competences", "competency_coverage_rate",
    "nb_formations_completed", "nb_formations_in_progress", "taux_assiduite",
    "nb_besoins_exprimes", "nb_besoins_approuves", "avg_eval_score", "nb_evaluations",
    "months_since_last_training", "engagement_score",
]

NIVEAU_INT = {
    "N1_DEBUTANT": 1, "N2_ELEMENTAIRE": 2, "N3_INTERMEDIAIRE": 3,
    "N4_AVANCE": 4, "N5_EXPERT": 5,
    "DEBUTANT": 1, "INITIE": 2, "CONFIRME": 3, "AVANCE": 4, "EXPERT": 5,
    "NIVEAU_1": 1, "NIVEAU_2": 2, "NIVEAU_3": 3, "NIVEAU_4": 4, "NIVEAU_5": 5,
    "1": 1, "2": 2, "3": 3, "4": 4, "5": 5,
}


class ArtifactModelPort:
    """Port ML avec routage dynamique entre les trois modes.

    Le chargement est lazy et fail-closed : aucun artefact n'est charge tant que
    toutes les validations ne sont pas satisfaites. La decision de mode est
    recalculee a chaque appel pour refuser l'activation si les controles
    echouent (l'artefact peut etre altere entre deux appels).
    """

    def __init__(self, settings, database) -> None:
        self._settings = settings
        self._database = database

        models_dir = Path(settings.models_dir)
        self._artifact_path = Path(getattr(settings, "ml_artifact_path", "gap_predictor_temporal.joblib"))
        if not self._artifact_path.is_absolute():
            self._artifact_path = models_dir / self._artifact_path
        self._metadata_path = Path(getattr(settings, "ml_metadata_path", "temporal_training_metadata.json"))
        if not self._metadata_path.is_absolute():
            self._metadata_path = models_dir / self._metadata_path

        self._risk_artifact_path = models_dir / "risk_classifier.joblib"
        self._risk_metadata_path = models_dir / "risk_training_metadata.json"
        self.relevance_artifact_path = models_dir / "relevance_model.joblib"
        self.relevance_metadata_path = models_dir / "relevance_training_metadata.json"

        self._model: Any | None = None
        self._metadata: dict[str, Any] | None = None
        self._risk_model: Any | None = None
        self._risk_metadata: dict[str, Any] | None = None
        self._relevance_model: Any | None = None
        self._relevance_metadata: dict[str, Any] | None = None
        self._load_attempted = False
        self._risk_load_attempted = False
        self._relevance_load_attempted = False

        # Kill-switch global (audit DSI 3.3) : ML_ENABLED=false -> AUCUN artefact
        self._ml_enabled: bool = bool(getattr(settings, "ml_enabled", True))

        # Moteur réellement utilisé par le dernier predict_risk ("ml" | "rules").
        self._risk_engine: str = "unknown"

        # Port ML de risque dedie (calibre, fail-closed vers l'heuristique).
        from app.infrastructure.ml.risk_predictor import RiskMLPredictor
        self._risk_ml = RiskMLPredictor(models_dir)
        self._risk_ml_reason: str | None = None

        # Registre d'artefacts
        registry_path = Path(getattr(settings, "ml_registry_path", "model_registry.json"))
        if not registry_path.is_absolute():
            registry_path = models_dir / registry_path
        self._registry = ModelRegistry(registry_path, models_dir)

        # Provenance calculee depuis les lignes du corpus reel a l'entrainement.
        self._provenance_report: DatasetProvenanceReport | None = None
        self._corpus_path: Path | None = None
        self._load_provenance()

        # Skew guard actif (test KS, p < seuil) : derive de distribution entre
        # les features servies (fenetre glissante) et le corpus d'entrainement.
        # p < seuil sur au moins une feature => repli heuristique fail-closed.
        self._skew_guard = SkewGuard(
            feature_names=TEMPORAL_FEATURE_COLS,
            p_threshold=float(getattr(settings, "ml_skew_p_threshold", 0.01)),
            window_size=int(getattr(settings, "ml_skew_window", 30)),
            min_window=int(getattr(settings, "ml_skew_min_window", 10)),
            enabled=bool(getattr(settings, "ml_skew_guard_enabled", True)),
        )

        # Mode effectif : determine par les controles, jamais force par config.
        self._mode: str = HEURISTIC_FALLBACK
        self._fallback_reason: str | None = None

    # ------------------------------------------------------------------
    # Modes et controles
    # ------------------------------------------------------------------
    def _load_provenance(self) -> None:
        """Calcule la provenance depuis le corpus d'entrainement reel.

        Le pourcentage synthetique est calcule depuis les lignes du dataset
        (colonne is_synthetic). Si le corpus est absent, provenance vide -> la
        production est refuse.
        """
        base_dir = self._artifact_path.parent.parent / "clean"
        candidates = [
            base_dir / "training_corpus_provenanced.csv",
            base_dir / "training_corpus_from_db.csv",
            base_dir / "training_corpus.csv",
        ]
        for path in candidates:
            if path.exists():
                df = _read_csv_safe(path)
                # La version du dataset est TOUJOURS lue depuis les lignes du
                # corpus, jamais depuis une variable arbitraire.
                csv_version = None
                if df is not None and "dataset_version" in df.columns and not df["dataset_version"].isna().all():
                    csv_version = str(df["dataset_version"].dropna().iloc[0])
                self._provenance_report = compute_provenance(
                    df,
                    dataset_version=csv_version or "",
                )
                if self._provenance_report.errors:
                    logger.warning(
                        "provenance corpus incomplet",
                        path=str(path),
                        errors=self._provenance_report.errors,
                    )
                # Memoire du corpus resolu : sert de reference au skew guard KS.
                self._corpus_path = path
                return
        self._provenance_report = DatasetProvenanceReport()
        self._provenance_report.errors.append("aucun corpus d'entrainement trouve")

    def _feature_spec_error(self, meta: dict[str, Any]) -> str | None:
        """Erreur de compatibilite du schéma de features (None si valide)."""
        expected = list(TEMPORAL_FEATURE_COLS)
        meta_feats = meta.get("feature_cols") or expected
        spec_result = validate_feature_spec(
            meta_feats,
            meta.get("feature_schema_version") or FEATURE_SCHEMA_VERSION,
            expected,
            FEATURE_SCHEMA_VERSION,
        )
        if not spec_result.valid:
            return "; ".join(spec_result.errors)
        return None

    def _provenance_error(self) -> str | None:
        """Erreur de provenance du corpus (part synthétique / données réelles)."""
        prov = self._provenance_report
        if prov is None or prov.errors:
            return "provenance indisponible (corpus absent ou colonnes manquantes)"
        tolerance = float(getattr(self._settings, "ml_synthetic_tolerance_pct", 50.0))
        require_real = bool(getattr(self._settings, "ml_require_real_data", True))
        min_real = int(getattr(self._settings, "ml_min_real_rows", 50))
        if prov.synthetic_share_pct > tolerance:
            return (
                f"corpus {prov.synthetic_share_pct:.1f}% synthetique "
                f"(tolerance {tolerance:.0f}%)"
            )
        if require_real and prov.real_rows < min_real:
            return (
                f"donnees reelles insuffisantes : {prov.real_rows} lignes "
                f"< minimum {min_real}"
            )
        return None

    def _registry_rejection_reason(self, meta: dict[str, Any]) -> str | None:
        """Raison d'non-approuvabilité production selon le registre (None si OK)."""
        entry = self._registry.active()
        if entry is None or entry.approval_status != APPROVAL_APPROVED:
            return "modele non approuve pour la production (registre)"
        model_name = meta.get("model_name")
        if model_name and entry.model_name != model_name:
            return "modele non approuve pour la production (registre)"
        return None

    def _metrics_error(self, meta: dict[str, Any]) -> str | None:
        """Erreur de metriques minimales dans la metadata (None si satisfaites)."""
        metrics = meta.get("metrics") or {}
        min_r2 = float(getattr(self._settings, "ml_min_r2", 0.0))
        max_rmse = float(getattr(self._settings, "ml_max_rmse", 2.0))
        max_mae = float(getattr(self._settings, "ml_max_mae", 1.5))
        test_r2 = metrics.get("test_r2")
        test_rmse = metrics.get("test_rmse")
        test_mae = metrics.get("test_mae")
        if test_r2 is None or test_rmse is None or test_mae is None:
            return "metriques du modele absentes dans la metadata"
        if test_r2 < min_r2:
            return f"R2={test_r2:.3f} < minimum requis {min_r2:.3f}"
        if test_rmse > max_rmse:
            return f"RMSE={test_rmse:.3f} > maximum autorise {max_rmse:.3f}"
        if test_mae > max_mae:
            return f"MAE={test_mae:.3f} > maximum autorise {max_mae:.3f}"
        return None

    def _operator_mode_decision(self) -> tuple[str | None, str | None]:
        """Volonté de l'opérateur quant au mode de service.

        Retourne (mode_a_servir, raison_d_ecart) ; (None, None) signifie que
        l'opérateur demande bien PRODUCTION_ML — aucun écart.
        """
        requested = str(getattr(self._settings, "ml_serving_mode", PRODUCTION_ML)).upper()
        if requested == PRODUCTION_ML:
            return None, None
        if requested == DEMO_ML:
            return DEMO_ML, "demande explicite du mode DEMO_ML par l'operateur"
        return HEURISTIC_FALLBACK, f"mode demande non reconnu : {requested}"

    def _decide_mode(self) -> str:
        """Routage dynamique entre PRODUCTION_ML / DEMO_ML / HEURISTIC_FALLBACK.

        Ne retourne PRODUCTION_ML que si TOUTES les conditions sont satisfaites :
        - kill-switch actif ;
        - artefact charge avec integrite validee ;
        - metadata presente et features compatibles ;
        - provenance calculee et dans la tolerance ;
        - registre : entree ACTIVE et APPROVED, hash coherent ;
        - metriques minimales satisfaites.
        """
        if not self._ml_enabled:
            self._fallback_reason = "kill-switch global ML desactive"
            return HEURISTIC_FALLBACK

        if not self._load_attempted:
            self._load()
        if self._model is None:
            self._fallback_reason = self._fallback_reason or "artefact absent ou integrite invalide"
            return HEURISTIC_FALLBACK

        meta = self._metadata or {}

        spec_error = self._feature_spec_error(meta)
        if spec_error:
            self._fallback_reason = spec_error
            return HEURISTIC_FALLBACK

        provenance_error = self._provenance_error()
        if provenance_error:
            self._fallback_reason = provenance_error
            return HEURISTIC_FALLBACK

        registry_error = self._registry_rejection_reason(meta)
        if registry_error:
            # Modele disponible et valide mais non approuve pour la production.
            self._fallback_reason = registry_error
            return DEMO_ML

        metrics_error = self._metrics_error(meta)
        if metrics_error:
            self._fallback_reason = metrics_error
            return DEMO_ML

        operator_mode, operator_reason = self._operator_mode_decision()
        if operator_mode is not None:
            # L'operateur demande explicitement un autre mode.
            self._fallback_reason = operator_reason
            return operator_mode

        self._fallback_reason = None
        return PRODUCTION_ML

    def _effective_mode(self) -> str:
        """Retourne le mode courant en recalculant la decision (fail-live)."""
        self._mode = self._decide_mode()
        return self._mode

    # ------------------------------------------------------------------ API
    def predict_gaps(self, teacher_id: str) -> list[SkillGap] | None:
        """Retourne les gaps ML si le mode est PRODUCTION_ML ou DEMO_ML.

        En heuristique, retourne None pour que l'appelant bascule sur la
        methode metier. En DEMO_ML, le modele est utilise mais la reponse API
        doit exposer DEMO_ML (jamais PRODUCTION_ML).

        GOUVERNANCE 7.6 (limite 4) : chaque appel est journalisé via
        ml_observability.record_serving_call (teacher_id, mode effectif,
        raison de repli, features hors plage).
        """
        mode = self._effective_mode()
        ml_observability.record_mode(mode)
        if mode == HEURISTIC_FALLBACK:
            ml_observability.record_fallback(self._fallback_reason)
            ml_observability.record_serving_call(
                teacher_id, mode, self._fallback_reason, None,
            )
            return None
        try:
            result = self._predict_gaps(teacher_id, mode=mode)
            if result is None:
                ml_observability.record_fallback(self._fallback_reason)
                ml_observability.record_serving_call(
                    teacher_id, "HEURISTIC_FALLBACK", self._fallback_reason, None,
                )
            else:
                entry = self._registry.active()
                ml_observability.record_prediction(
                    model_version=entry.model_version if entry else None,
                    latency_ms=0.0,
                    values=[g.gap_score for g in result],
                )
                # Journalisation du appel ML effectif + alerte de proximité
                # des bornes (gouvernance 7.6, limite 4.2) — warning non bloquant.
                near_boundary = self._near_boundary_features(teacher_id)
                ml_observability.record_serving_call(
                    teacher_id, mode, None, near_boundary,
                )
            return result
        except Exception as exc:  # pragma: no cover - log + fallback
            logger.error("predict_gaps ML echoue, fallback heuristique", error=str(exc))
            self._fallback_reason = f"erreur d'inference : {exc}"
            ml_observability.record_fallback(self._fallback_reason)
            ml_observability.record_serving_call(
                teacher_id, "HEURISTIC_FALLBACK", self._fallback_reason, None,
            )
            return None

    # ------------------------------------------------------- Alerte proximité bornes
    def _near_boundary_features(self, teacher_id: str) -> list[str]:
        """Features servies à moins de 5 % des bornes d'entraînement (limite 4.2).

        Retourne la liste des features proches des limites du domaine
        d'entraînement (warning non bloquant, exposé via ml_observability).
        Recalcule le vecteur de features du dernier appel sans prédiction.
        """
        try:
            bundle = self._teacher_feature_bundle(teacher_id)
            X, _, _ = self._build_feature_matrix(bundle)
            if X.shape[0] == 0:
                return []
            return self._near_boundary_columns(X)
        except Exception:  # pragma: no cover - analyse consultative
            return []

    def _near_boundary_columns(self, X: np.ndarray, threshold_pct: float = 0.05) -> list[str]:
        """Colonnes dont au moins une valeur est à moins de ``threshold_pct``
        de la largeur de plage de sa borne min/max d'entraînement."""
        ranges = (self._metadata or {}).get("feature_ranges", {})
        near: list[str] = []
        for i, col in enumerate(TEMPORAL_FEATURE_COLS):
            bounds = ranges.get(col)
            if not bounds:
                continue
            col_min = float(bounds.get("min", -np.inf))
            col_max = float(bounds.get("max", np.inf))
            width = col_max - col_min
            if width <= 0:
                continue
            tol = width * threshold_pct
            lo_val = float(X[:, i].min())
            hi_val = float(X[:, i].max())
            if lo_val < col_min + tol or hi_val > col_max - tol:
                near.append(col)
        return near

    def near_boundary_warning(self, teacher_id: str) -> dict[str, Any] | None:
        """Avertissement « proche des limites du domaine d'entraînement » (4.2).

        Exposé dans la réponse API (warning non bloquant) quand une feature
        servie en ML est à moins de 5 % de sa borne min/max du feature_schema.
        """
        mode = self._effective_mode()
        if mode not in (PRODUCTION_ML, DEMO_ML):
            return None
        try:
            bundle = self._teacher_feature_bundle(teacher_id)
            X, _, _ = self._build_feature_matrix(bundle)
            if X.shape[0] == 0:
                return None
            near = self._near_boundary_columns(X)
        except Exception:  # pragma: no cover - consultatif
            return None
        if not near:
            return None
        return {
            "code": "NEAR_TRAINING_BOUNDARY",
            "message": (
                "Proche des limites du domaine d'entraînement : "
                f"{len(near)} feature(s) à moins de 5 % de leur borne."
            ),
            "features": near,
        }

    def predict_risk(self, teacher_id: str) -> RiskProfile | None:
        if not self.available():
            return None
        try:
            return self._predict_risk(teacher_id)
        except Exception as exc:  # pragma: no cover
            logger.error("predict_risk ML echoue, fallback heuristique", error=str(exc))
            return None

    # --------------------------------------------------- Risk ML calibre (v2)
    def _resolved_gaps(self, teacher_id: str) -> list[SkillGap]:
        """Gaps prédits, sinon gaps persistés."""
        gaps = self._predict_gaps(teacher_id)
        if gaps is None:
            gaps = self._persisted_gaps(teacher_id)
        return gaps or []

    def _scoped_gaps(self, teacher_id: str, gaps: list[SkillGap]) -> tuple[list[SkillGap], set[int] | None]:
        """Filtre les gaps au périmètre de l'enseignant, si applicable."""
        scoped_ids = self._scoped_competence_ids(teacher_id)
        if scoped_ids is not None and gaps:
            gaps = self._filter_gaps_to_scope(teacher_id, gaps, scoped_ids)
        return gaps, scoped_ids

    def predict_risk_serving(self, teacher_id: str) -> tuple[RiskProfile, dict | None, str | None]:
        """Risque servi : ML calibre si disponible, sinon heuristique FAIL-CLOSED.

        Retourne (profil, payload_ml|None, fallback_reason|None). Le payload ML
        expose risk_class, probability_calibrated, contributions (top-3 SHAP),
        data_origin, validation_scope. En repli, ``fallback_reason`` documente
        honnetement la cause (modele absent / decision=reject / hors plage /
        erreur) et le moteur heuristique 0.50/0.12/0.40 sert le score.
        """
        ml_payload: dict | None = None
        fallback_reason: str | None = None
        served_by_ml = False
        profile: RiskProfile | None = None
        try:
            bundle = dict(self._teacher_feature_bundle(teacher_id))
            bundle["stagnation_months"] = self._stagnation_months(bundle)
            gaps, scoped_ids = self._scoped_gaps(teacher_id, self._resolved_gaps(teacher_id))
            X, _comp_ids, _required = self._build_feature_matrix(bundle)
            agg: dict[str, float] = self._serving_aggregates(X)
            features = build_serving_features(gaps, bundle, agg)
            result, reason = self._risk_ml.predict(features)
            if result is not None:
                served_by_ml = True
                ml_payload = result.to_payload()
                profile = self._profile_from_risk_ml(teacher_id, result, scoped_ids)
            else:
                fallback_reason = reason
        except Exception as exc:  # pragma: no cover - fail-closed
            logger.error("risk ML serving echoue, repli heuristique", error=str(exc))
            fallback_reason = f"echec du serving ML : {exc}"

        if not served_by_ml or profile is None:
            self._risk_engine = "rules"
            gaps = self._resolved_gaps(teacher_id)
            profile = self._rule_risk_scoped(teacher_id, gaps)
        self._risk_ml_reason = fallback_reason
        return profile, ml_payload, fallback_reason

    def _serving_aggregates(self, X) -> dict[str, float]:
        """Moyennes des features temporelles pour le serving risque."""
        agg: dict[str, float] = {}
        if X.shape[0] > 0:
            for risk_feat, col in AGG_FEATURE_SOURCES.items():
                if col in TEMPORAL_FEATURE_COLS:
                    agg[risk_feat] = float(np.mean(X[:, TEMPORAL_FEATURE_COLS.index(col)]))
        return agg

    def _profile_from_risk_ml(
        self, teacher_id: str, result, scoped_ids: set[int] | None
    ) -> RiskProfile:
        """RiskProfile servie par le ML : score = esperance ponderee des milieux
        de classes avec les probabilites CALIBREES ; facteurs = top contributions."""
        scope = "DEPARTMENT" if scoped_ids is not None else "TEACHER"
        scope_type, scope_id, scope_label = self._teacher_scope_info(teacher_id, scope)
        midpoints = {"LOW": 10.0, "MEDIUM": 37.5, "HIGH": 62.5, "CRITICAL": 87.5}
        expected = sum(p * midpoints.get(c, 40.0) for c, p in result.probabilities.items())
        risk_score = round(min(100.0, max(0.0, expected)), 2)
        level = {"LOW": RiskLevel.LOW, "MEDIUM": RiskLevel.MEDIUM,
                 "HIGH": RiskLevel.HIGH, "CRITICAL": RiskLevel.CRITICAL}.get(
            result.risk_class, RiskLevel.MEDIUM)
        factors = tuple(
            RiskFactor(
                feature=c["feature"],
                value=float(c.get("value", 0.0)),
                normalized_value=round(float(c.get("impact", 0.0)), 4),
                weight=round(float(c.get("impact", 0.0)), 4),
                contribution=round(float(c.get("impact", 0.0)), 4),
                label=f"Contribution {c['feature']} ({c.get('method', 'model')})",
                scope=scope,
                scope_type=scope_type,
                scope_id=scope_id,
                scope_label=scope_label,
            )
            for c in result.contributions
        )
        return RiskProfile(
            teacher_id=teacher_id,
            risk_score=risk_score,
            risk_level=level,
            factors=factors,
            is_capped=False,
            uncapped_score=round(expected / 100.0, 4),
        )

    def risk_ml_status(self) -> dict[str, Any]:
        """Statut du port ML de risque (mode, version, counts, repli)."""
        return self._risk_ml.status()

    def heuristic_risk_reference(self, teacher_id: str) -> RiskProfile:
        """Décomposition heuristique de référence (0.50/0.12/0.40) sur les mêmes
        gaps — exposée comme vue secondaire quand le ML sert le score."""
        gaps = self._predict_gaps(teacher_id)
        if gaps is None:
            gaps = self._persisted_gaps(teacher_id)
        return self._rule_risk_scoped(teacher_id, gaps or [])


    def _target_validity_label(self, target_validity: str) -> str:
        """Étiquette lisible de la validité de la cible prédictive."""
        if target_validity == TARGET_VALIDITY_EXTRAPOLATED:
            return "Cible extrapolée — validation démonstration"
        if target_validity == TARGET_VALIDITY_OBSERVED_SIMULATION:
            return "Cible observée en simulation — validation simulation"
        return "Cible validée par re-mesures réelles"

    def status(self) -> dict[str, Any]:
        mode = self._effective_mode()
        meta = self._metadata or {}
        prov = self._provenance_report
        entry = self._registry.active()
        target_validity = self._target_validity()
        # Etape 4 : exposition data_origin et validation_scope (gouvernance simulation)
        data_origin, validation_scope = self._resolve_data_origin(entry, meta, prov)
        # Etape 4.5 : si un corpus de simulation documente existe (seed 42, re-mesures M+3),
        # le serving PRODUCTION_ML reste fonctionnel mais son etiquette devient
        # "production technique — demonstration sur donnees simulees".
        # On expose donc en plus les metadonnees de simulation (sidecar), tout en
        # conservant le registry actif reel pour la non-regression.
        simulation_info = self._load_simulation_info(data_origin)
        if simulation_info is not None and data_origin == "DEMO_SEED":
            data_origin = DATA_ORIGIN_SIMULATED
            validation_scope = VALIDATION_SCOPE_SIMULATION
        return {
            "name": "gap_predictor_temporal",
            "available": mode in (PRODUCTION_ML, DEMO_ML),
            "kill_switch": not self._ml_enabled,
            "mode": mode,
            "model_mode": mode,
            "model_version": entry.model_version if entry else None,
            "artifact_name": entry.model_name if entry else None,
            "fallback_reason": self._fallback_reason,
            "version": meta.get("trained_at") or "unknown",
            "model_name": meta.get("model_name", "gradient_boosting"),
            "n_features": meta.get("n_features", len(TEMPORAL_FEATURE_COLS)),
            "feature_schema_version": FEATURE_SCHEMA_VERSION,
            "drift_check": self._artifact_drift_check(self._metadata),
            "provenance": prov.to_dict() if prov else {},
            "registry_entry": entry.to_dict() if entry else None,
            "prediction_horizon": "3m",
            "target_validity": target_validity,
            "target_validity_label": self._target_validity_label(target_validity),
            "data_origin": data_origin,
            "validation_scope": validation_scope,
            "simulation": simulation_info,
            "risk_engine": self._risk_engine,
            "risk_model": self.risk_status(),
            "risk_ml": self.risk_ml_status(),
            "skew_guard": self._skew_guard.status(),

            "relevance_model": {
                "name": "relevance_model",
                "available": self.relevance_available(),
                "version": (self._relevance_metadata or {}).get("trained_at") or "unknown",
                "drift_check": self._artifact_drift_check(self._relevance_metadata),
            },
        }

    def _resolve_data_origin(self, entry, meta: dict, prov) -> tuple[str, str]:
        """Résout l'étiquetage honnête data_origin / validation_scope."""
        data_origin = getattr(entry, "data_origin", None) if entry else meta.get("data_origin")
        validation_scope = getattr(entry, "validation_scope", None) if entry else meta.get("validation_scope")
        if entry:
            data_origin, validation_scope = self._apply_registry_labels(
                entry, data_origin, validation_scope
            )
        if data_origin is None:
            data_origin, validation_scope = self._legacy_synthetic_labels(entry, prov)
        return data_origin, validation_scope

    @staticmethod
    def _apply_registry_labels(entry, data_origin, validation_scope) -> tuple[str, str]:
        """Fallback : si registre SIMULATED, on expose SIMULATED meme si metadata ancienne."""
        if getattr(entry, "data_origin", None) == DATA_ORIGIN_SIMULATED:
            data_origin = DATA_ORIGIN_SIMULATED
            validation_scope = validation_scope or VALIDATION_SCOPE_SIMULATION
        elif getattr(entry, "validation_scope", None) == VALIDATION_SCOPE_SIMULATION:
            validation_scope = VALIDATION_SCOPE_SIMULATION
            data_origin = data_origin or DATA_ORIGIN_SIMULATED
        return data_origin, validation_scope

    @staticmethod
    def _legacy_synthetic_labels(entry, prov) -> tuple[str, str]:
        """Derive from synthetic_share_pct legacy (registre sinon provenance calculée)."""
        registry_share = entry.synthetic_share_pct if entry else 0
        provenance_share = prov.synthetic_share_pct if prov else 0
        synthetic_share = registry_share or provenance_share
        if synthetic_share > 0:
            return DATA_ORIGIN_SIMULATED, VALIDATION_SCOPE_SIMULATION
        return "DEMO_SEED", "DEMO_VALIDATED"

    @staticmethod
    def _simulation_manifest_data(settings) -> dict | None:
        """Charge le manifeste de simulation (fichier repo, data/simulation ou Docker)."""
        import json as _json

        root = Path(__file__).parent.parent.parent.parent
        sim_manifest = root / "reports" / "simulation_manifest.json"
        # aussi verifier data/simulation et data/models/simulation_training_metadata.json (present dans Docker)
        if not sim_manifest.exists():
            sim_manifest = root / "data" / "simulation" / "simulation_manifest.json"
        if not sim_manifest.exists():
            # Fallback Docker : simulation_training_metadata.json dans MODELS_DIR
            models_dir = Path(getattr(settings, "models_dir", "data/models"))
            sim_meta = models_dir / "simulation_training_metadata.json"
            if sim_meta.exists():
                return _json.loads(sim_meta.read_text(encoding="utf-8"))
            return None
        return _json.loads(sim_manifest.read_text(encoding="utf-8"))

    def _load_simulation_info(self, data_origin: str | None) -> dict | None:
        """Metadonnees de simulation (sidecar), si un corpus documente existe."""
        try:
            sim_manifest_data = self._simulation_manifest_data(self._settings)
            if sim_manifest_data is None:
                return None
            return {
                "data_origin": sim_manifest_data.get("data_origin", DATA_ORIGIN_SIMULATED),
                "validation_scope": sim_manifest_data.get("validation_scope", VALIDATION_SCOPE_SIMULATION),
                "target_validity": sim_manifest_data.get("target_validity", TARGET_VALIDITY_OBSERVED_SIMULATION),
                "dataset_hash": sim_manifest_data.get("dataset_hash", sim_manifest_data.get("data_sources", {}).get("dataset_hash")),
                "generator_version": sim_manifest_data.get("generator_version"),
                "seed": sim_manifest_data.get("seed"),
            }
        except Exception:
            return None

    def _target_validity(self) -> str:
        """Validité de la cible prédictive (registre > metadata, défaut extrapolée).

        Exposée à chaque réponse API pour un étiquetage honnête : tant qu'aucune
        re-mesure future réelle n'existe, la cible est EXTRAPOLATED_TARGET.
        En simulation, OBSERVED_IN_SIMULATION.
        """
        entry = self._registry.active()
        if entry is not None and entry.target_validity:
            return entry.target_validity
        meta_validity = (self._metadata or {}).get("target_validity")
        if meta_validity in (TARGET_VALIDITY_EXTRAPOLATED, TARGET_VALIDITY_REAL, TARGET_VALIDITY_OBSERVED_SIMULATION):
            return str(meta_validity)
        return TARGET_VALIDITY_EXTRAPOLATED

    # -------------------------------------------------------- Drift (passif)
    def _artifact_drift_check(self, meta: dict[str, Any] | None) -> dict[str, Any]:
        """Controle de derive PASSIF base sur les metadonnees d'entrainement."""
        if not meta:
            return {"checked": True, "drift_detected": True, "reasons": ["metadata absente — artefact non tracable"]}
        reasons: list[str] = []
        data_src = meta.get("data_sources") or {}
        synth_share = float(data_src.get("synthetic_share_pct", 0.0) or 0.0)
        if synth_share > float(getattr(self._settings, "ml_synthetic_tolerance_pct", 50.0)):
            reasons.append(
                f"corpus {synth_share:.1f}% synthetique "
                f"(tolerance {getattr(self._settings, 'ml_synthetic_tolerance_pct', 50.0):.0f}%)"
            )
        trained_at = meta.get("trained_at")
        if trained_at:
            try:
                days = (datetime.now() - datetime.fromisoformat(trained_at)).days
                if days > 90:
                    reasons.append(f"modele age de {days} jours — re-entrainement requis")
            except (TypeError, ValueError):
                reasons.append("trained_at illisible — fraicheur indeterminee")
        return {
            "checked": True,
            "drift_detected": bool(reasons),
            "reasons": reasons,
        }

    # ------------------------------------------------------------ Interne
    def available(self) -> bool:
        mode = self._effective_mode()
        return mode in (PRODUCTION_ML, DEMO_ML)

    def _load(self) -> None:
        """Charge le gap predictor temporel avec verification d'integrite."""
        self._load_attempted = True
        if not self._artifact_path.exists():
            self._fallback_reason = f"artefact ML introuvable : {self._artifact_path}"
            logger.warning("artefact ML introuvable", path=str(self._artifact_path))
            return
        try:
            # Integrite d'abord — refuse de charger un artefact non signe.
            self._model = load_with_integrity_check(self._artifact_path)
            if self._metadata_path.exists():
                self._metadata = json.loads(self._metadata_path.read_text(encoding="utf-8"))
            else:
                self._metadata = {}
            # Verification des features du modele charge (spec + ordre)
            n_features_model = int(getattr(self._model, "n_features_in_", 0))
            if n_features_model and n_features_model != len(TEMPORAL_FEATURE_COLS):
                self._fallback_reason = (
                    f"modele avec {n_features_model} features != code {len(TEMPORAL_FEATURE_COLS)}"
                )
                self._model = None
                return
            # GOUVERNANCE 7.6 (limite 4.3) : interdiction d'élargir les plages
            # de features sans réentraînement — un artefact dont les bornes
            # s'étendent au-delà de la version ACTIVE du registre sans
            # changement de version est REJETÉ (fail-closed).
            range_error = self._widened_ranges_error()
            if range_error:
                logger.error(
                    "artefact ML refuse : plages élargies sans réentraînement",
                    error=range_error,
                )
                self._fallback_reason = range_error
                self._model = None
                return
            logger.info(
                "modele ML charge",
                path=str(self._artifact_path),
                n_features=n_features_model,
            )
            # Skew guard : capture de la reference d'entrainement (test KS).
            self._load_skew_reference()
        except ArtifactIntegrityError as exc:
            logger.error("artefact ML refuse pour integrite non validee", error=str(exc))
            self._fallback_reason = f"integrite invalide : {exc}"
            self._model = None
        except Exception as exc:  # pragma: no cover
            logger.error("chargement modele ML impossible", error=str(exc))
            self._fallback_reason = f"chargement impossible : {exc}"
            self._model = None

    def _load_skew_reference(self) -> None:
        """Capture l'échantillon de référence du skew guard depuis le corpus.

        Ordre de résolution : corpus résolu par la provenance, puis corpus de
        simulation documenté (registre SIMULATED). Consultatif : un échec de
        capture n'interdit PAS le serving, le statut honnête est exposé.
        """
        try:
            import pandas as pd
        except ImportError:  # pragma: no cover - pandas requis par le pipeline
            logger.warning("skew guard : pandas indisponible — contrôle KS consultatif")
            return
        try:
            candidates: list[Path] = []
            if self._corpus_path is not None:
                candidates.append(self._corpus_path)
            base_dir = self._artifact_path.parent.parent
            candidates.append(base_dir / "clean" / "simulation_dataset.csv")
            sim_dir = base_dir / "simulation"
            if sim_dir.exists():
                candidates.extend(sorted(sim_dir.glob("simulation_dataset*.csv")))
            path = next((p for p in candidates if p is not None and p.exists()), None)
            if path is None:
                logger.warning("skew guard : corpus de référence introuvable — contrôle KS consultatif")
                return
            df = _read_csv_safe(path)
            if df is None or df.empty:
                logger.warning("skew guard : corpus illisible — contrôle KS consultatif", path=str(path))
                return
            missing = [c for c in TEMPORAL_FEATURE_COLS if c not in df.columns]
            if missing:
                logger.warning(
                    "skew guard : features absentes du corpus — contrôle KS consultatif",
                    missing=missing,
                    path=str(path),
                )
                return
            M = (
                df[TEMPORAL_FEATURE_COLS]
                .apply(lambda s: pd.to_numeric(s, errors="coerce"))
                .dropna()
                .to_numpy(dtype=float)
            )
            rows = self._skew_guard.set_reference_from_matrix(M)
            logger.info(
                "skew guard : référence d'entraînement capturée (test KS armé)",
                rows=rows,
                corpus=str(path),
            )
        except Exception as exc:  # pragma: no cover - consultatif
            logger.warning("skew guard : capture de référence impossible", error=str(exc))

    def model_health(self) -> dict[str, Any]:
        """Santé du modèle servi : métriques test (r2, mae, rmse) + skew guard KS.

        Exposé via ``GET /api/v1/analytics/model-health`` pour le suivi de
        dérive documenté (gouvernance MLOps, observabilité des modèles).
        """
        mode = self._effective_mode()
        meta = self._metadata or {}
        metrics = meta.get("metrics") or {}
        entry = self._registry.active()
        skew = self._skew_guard.last_verdict
        return {
            "mode": mode,
            "model_name": meta.get("model_name") or (entry.model_name if entry else None),
            "model_version": entry.model_version if entry else None,
            "r2": metrics.get("test_r2"),
            "mae": metrics.get("test_mae"),
            "rmse": metrics.get("test_rmse"),
            "skew_detected": bool(skew.skew_detected),
            "skew_features": list(skew.features),
            "skew_checked": bool(skew.checked),
            "skew_p_threshold": self._skew_guard.p_threshold,
            "skew_window_rows": skew.window_rows,
            "skew_reason": skew.reason,
            "fallback_reason": self._fallback_reason,
            "skew_guard": self._skew_guard.status(),
        }

    def _widened_ranges_error(self) -> str | None:
        """Erreur si les plages de l'artefact chargé dépassent celles de la
        version ACTIVE du registre SANS changement de version (4.3).

        La politique : élargir les plages exige un réentraînement complet,
        donc une nouvelle version enregistrée. Le registre ne portant pas les
        plages historiques, la référence est le schéma de features versionné
        (feature_schema.json) : si le hash des plages de l'artefact diffère
        de celui du schéma pour la même feature_schema_version, l'artefact
        est rejeté.
        """
        import hashlib

        meta = self._metadata or {}
        ranges = meta.get("feature_ranges") or {}
        if not ranges:
            return None  # pas de plages déclarées : contrôlé au serving

        def _canon(r: dict) -> str:
            return hashlib.sha256(json.dumps(r, sort_keys=True).encode()).hexdigest()

        reference_ranges = self._reference_feature_ranges(meta)
        if reference_ranges and _canon(ranges) != _canon(reference_ranges):
            return (
                "plages de features élargies sans réentraînement : l'artefact "
                "porte des bornes différentes du feature_schema de la même "
                "version — réentraînement et nouvelle version requis"
            )
        return None

    def _reference_feature_ranges(self, meta: dict) -> dict | None:
        """Référence canonique : le feature_schema VERSIONNÉ du modèle servi
        (feature_schema_{version}.json) s'il existe — c'est la référence de la
        version ACTIVE ; sinon le feature_schema du dépôt. Sans fichier de
        référence, on compare au registre."""
        model_version = str(meta.get("model_version") or "")
        suffix = f"_{model_version.replace('.', '')}" if model_version else ""
        candidate_paths = [
            self._artifact_path.parent / f"feature_schema{suffix}.json",
            self._artifact_path.parent / "feature_schema.json",
        ]
        for path in candidate_paths:
            if not path.exists():
                continue
            try:
                reference = json.loads(path.read_text(encoding="utf-8"))
                if isinstance(reference, dict) and "feature_ranges" in reference:
                    reference = reference["feature_ranges"]
                if isinstance(reference, dict) and "ranges" in reference:
                    reference = reference["ranges"]
                if reference:
                    return reference
            except Exception:
                continue
        return None

    # ------------------------------------------------------- Extraction features
    def _teacher_feature_bundle(self, teacher_id: str) -> dict[str, Any]:
        """Extrait depuis la base toutes les donnees brutes d'un enseignant."""
        with self._database.read_connection() as conn:
            savs = conn.execute(
                text("""
                    SELECT ec.savoir_id, ec.niveau, ec.date_acquisition,
                           COALESCE(sc.competence_id, s.competence_id) AS competence_id,
                           (SELECT MAX(CASE nsr.niveau
                                WHEN 'N1_DEBUTANT' THEN 1 WHEN 'N2_ELEMENTAIRE' THEN 2
                                WHEN 'N3_INTERMEDIAIRE' THEN 3 WHEN 'N4_AVANCE' THEN 4
                                WHEN 'N5_EXPERT' THEN 5 ELSE 0 END)
                            FROM competence.niveau_savoir_requis nsr
                            WHERE nsr.savoir_id = ec.savoir_id) AS required_level
                    FROM competence.enseignant_competences ec
                    LEFT JOIN competence.savoirs s ON s.id = ec.savoir_id
                    LEFT JOIN competence.sous_competences sc ON sc.id = s.sous_competence_id
                    WHERE ec.enseignant_id = :tid
                    ORDER BY ec.date_acquisition
                """),
                {"tid": teacher_id},
            ).mappings().all()

            formations = conn.execute(
                text("""
                    SELECT i.formation_id, i.etat, i.date_demande,
                           f.date_fin, COALESCE(array_agg(fc.savoir_id) FILTER (WHERE fc.savoir_id IS NOT NULL), '{}') AS savoir_ids
                    FROM formation.inscriptions i
                    JOIN formation.formations f ON f.id_formation = i.formation_id
                    LEFT JOIN formation.formation_competences fc ON fc.formation_id = f.id_formation
                    WHERE i.enseignant_id = :tid
                    GROUP BY i.formation_id, i.etat, i.date_demande, f.date_fin
                """),
                {"tid": teacher_id},
            ).mappings().all()

            eval_row = conn.execute(
                text("""
                    SELECT AVG(note) AS avg_score, COUNT(*) AS nb
                    FROM evaluation.evaluation_formateur
                    WHERE enseignant_id = :tid
                """),
                {"tid": teacher_id},
            ).mappings().first()

            needs_row = conn.execute(
                text("""
                    SELECT COUNT(*) AS nb,
                           COUNT(*) FILTER (WHERE approuve_admin = true) AS nb_approuves
                    FROM besoin.besoin_formation
                    WHERE (username = :tid OR username = :tid) AND deleted_at IS NULL
                """),
                {"tid": teacher_id},
            ).mappings().first()

            pres_row = conn.execute(
                text("""
                    SELECT COUNT(*) FILTER (WHERE p.presence)::float / NULLIF(COUNT(*),0) AS rate
                    FROM formation.presences p
                    JOIN formation.seances s ON s.id_seance = p.seance_id
                    WHERE p.enseignant_id = :tid
                """),
                {"tid": teacher_id},
            ).mappings().first()

        today = date.today()
        dates_acq = [r["date_acquisition"] for r in savs if r["date_acquisition"]]
        last_acq = max(dates_acq) if dates_acq else None
        days_since_last = (today - last_acq).days if last_acq else 365
        months_since = days_since_last / 30.44

        completed = [f for f in formations if f["etat"] == "APPROVED" and f["date_fin"] and f["date_fin"] < today]
        in_progress = [f for f in formations if f["etat"] in ("APPROVED", "EN_COURS")]

        avg_days_between = 0.0
        if len(completed) >= 2:
            deltas = [
                (completed[i + 1]["date_fin"] - completed[i]["date_fin"]).days
                for i in range(len(completed) - 1)
                if completed[i + 1]["date_fin"] and completed[i]["date_fin"]
            ]
            avg_days_between = float(np.mean(deltas)) if deltas else 0.0

        return {
            "savoirs": savs,
            "formations": formations,
            "completed": completed,
            "in_progress": in_progress,
            "eval": eval_row,
            "needs": needs_row,
            "attendance": float(pres_row["rate"]) if pres_row and pres_row["rate"] is not None else 0.0,
            "days_since_last": days_since_last,
            "months_since_last": months_since,
            "avg_days_between": avg_days_between,
        }

    @staticmethod
    def _safe_level_int(val: Any) -> int:
        if val is None:
            return 0
        if isinstance(val, (int, float)):
            return int(val)
        return NIVEAU_INT.get(str(val).upper(), 0)

    def _build_feature_matrix(self, bundle: dict[str, Any]) -> tuple[np.ndarray, list[int], np.ndarray]:
        """Construit X (n_competences, n_features), les ids de competences et le requis brut."""
        savs_by_comp = self._group_savoirs(bundle)
        if not savs_by_comp:
            return np.empty((0, len(TEMPORAL_FEATURE_COLS))), [], np.array([])
        comp_ids = sorted(savs_by_comp.keys())
        max_savoirs = max(len(v) for v in savs_by_comp.values())
        globals_f = self._global_features(bundle)
        rows = [
            self._competence_feature_row(savs_by_comp[cid], max_savoirs, len(comp_ids), globals_f)
            for cid in comp_ids
        ]
        X = np.array(rows, dtype=float)
        required_by_comp = np.array([
            max((int(s["required_level"]) if s["required_level"] else 0) for s in savs_by_comp[cid]) or 3
            for cid in comp_ids
        ], dtype=float)
        return X, comp_ids, required_by_comp

    @staticmethod
    def _group_savoirs(bundle: dict[str, Any]) -> dict[int, list[dict[str, Any]]]:
        savs_by_comp: dict[int, list[dict[str, Any]]] = {}
        for s in bundle["savoirs"]:
            cid = s["competence_id"]
            if cid is None:
                continue
            savs_by_comp.setdefault(int(cid), []).append(s)
        return savs_by_comp

    @staticmethod
    def _global_features(bundle: dict[str, Any]) -> dict[str, float]:
        """Features invariantes par competence (communes a toutes les lignes)."""
        nb_completed = len(bundle["completed"])
        nb_in_prog = len(bundle["in_progress"])
        taux = float(bundle["attendance"])
        avg_eval = float(bundle["eval"]["avg_score"]) if bundle["eval"] and bundle["eval"]["avg_score"] is not None else 0.0
        nb_eval = int(bundle["eval"]["nb"]) if bundle["eval"] and bundle["eval"]["nb"] else 0
        nb_needs = int(bundle["needs"]["nb"]) if bundle["needs"] and bundle["needs"]["nb"] else 0
        nb_needs_ok = int(bundle["needs"]["nb_approuves"]) if bundle["needs"] and bundle["needs"]["nb_approuves"] else 0
        days_since = float(bundle["days_since_last"])
        months_since = float(bundle["months_since_last"])
        freq_month = (nb_completed / max(1.0, bundle["avg_days_between"] / 30.0)) if bundle["avg_days_between"] else 0.0
        engagement = nb_completed * 2 + nb_eval * 1.5 + nb_needs * 1 + taux * 5 + avg_eval * 2
        return {
            "nb_completed": float(nb_completed),
            "nb_in_prog": float(nb_in_prog),
            "taux": taux,
            "avg_eval": avg_eval,
            "nb_eval": float(nb_eval),
            "nb_needs": float(nb_needs),
            "nb_needs_ok": float(nb_needs_ok),
            "days_since": days_since,
            "months_since": months_since,
            "freq_month": freq_month,
            "engagement": engagement,
            "is_long_absent": 1.0 if days_since > 180 else 0.0,
            "is_stagnant": 1.0 if days_since > 365 else 0.0,
        }

    def _competence_feature_row(
        self,
        savs: list[dict[str, Any]],
        max_savoirs: int,
        nb_competences: int,
        globals_f: dict[str, float],
    ) -> list[float]:
        """Une ligne de features par competence (historique temporel + globaux)."""
        ordered = sorted(savs, key=lambda r: r["date_acquisition"] or date.min)
        levels_hist = [float(self._safe_level_int(s["niveau"])) for s in ordered]
        hist = levels_hist[-4:] if len(levels_hist) >= 4 else ([levels_hist[0]] * (4 - len(levels_hist)) + levels_hist)
        cur_t3, cur_t2, cur_t1, cur_t = hist
        lag32 = cur_t2 - cur_t3
        lag21 = cur_t1 - cur_t2
        lag1t = cur_t - cur_t1
        rolling = (cur_t - cur_t3) / 3.0

        avg_level = float(np.mean(levels_hist))
        min_level = float(min(levels_hist))
        max_level = float(max(levels_hist))
        nb_l5 = float(sum(1 for lv in levels_hist if lv == 5))
        nb_l1 = float(sum(1 for lv in levels_hist if lv == 1))
        nb_savoirs = float(len(levels_hist))
        coverage = nb_savoirs / max_savoirs if max_savoirs else 0.0

        return [
            cur_t3, cur_t2, cur_t1, cur_t,
            lag32, lag21, lag1t, rolling,
            globals_f["days_since"], globals_f["freq_month"],
            globals_f["is_long_absent"], globals_f["is_stagnant"],
            avg_level, min_level, max_level, nb_l5, nb_l1,
            nb_savoirs, float(nb_competences), coverage,
            globals_f["nb_completed"], globals_f["nb_in_prog"], globals_f["taux"],
            globals_f["nb_needs"], globals_f["nb_needs_ok"], globals_f["avg_eval"], globals_f["nb_eval"],
            globals_f["months_since"], globals_f["engagement"],
        ]

    @staticmethod
    def _normalize(X: np.ndarray, ranges: dict[str, dict[str, float]]) -> np.ndarray:
        xn = X.copy()
        for i, col in enumerate(TEMPORAL_FEATURE_COLS):
            b = ranges.get(col)
            if not b or b["max"] <= b["min"]:
                xn[:, i] = 0.0
            else:
                xn[:, i] = np.clip((xn[:, i] - b["min"]) / (b["max"] - b["min"]), 0.0, 1.0)
        return xn

    # ------------------------------------------------------------ Predictions
    def _serving_vector_error(self, X: np.ndarray, teacher_id: str) -> str | None:
        """Validation stricte du vecteur de features au serving (None si valide)."""
        ranges = (self._metadata or {}).get("feature_ranges", {})
        validation = validate_feature_vector(X, TEMPORAL_FEATURE_COLS, ranges)
        if not validation.valid:
            logger.error(
                "features invalides au serving — fallback",
                errors=validation.errors,
                teacher_id=teacher_id,
            )
            return "features invalides au serving : " + "; ".join(validation.errors)
        return None

    def _declared_synthetic_share_error(self) -> str | None:
        """Defense en profondeur : la metadata doit declarer une part synthetique
        dans la tolerance — meme en cas de contournement du routage principal."""
        meta = self._metadata or {}
        data_sources = meta.get("data_sources") or {}
        declared_synth = float(data_sources.get("synthetic_share_pct", 100.0))
        tolerance = float(getattr(self._settings, "ml_synthetic_tolerance_pct", 50.0))
        if declared_synth <= tolerance:
            return None
        logger.warning(
            "gap_predictor ml refuse au serving : proportion synthetique declaree trop elevee",
            declared_synthetic_share_pct=declared_synth,
            tolerance=tolerance,
        )
        return (
            f"metadata declare {declared_synth:.1f}% de données synthétiques "
            f"(tolérance {tolerance:.0f}%)"
        )

    @staticmethod
    def _severity_from_score(score: float, seuils: Any) -> Severity:
        if score >= seuils.seuil_gap_critique:
            return Severity.CRITICAL
        if score >= seuils.seuil_gap_haute:
            return Severity.HIGH
        if score >= seuils.seuil_gap_moyenne:
            return Severity.MEDIUM
        return Severity.LOW

    @staticmethod
    def _trend_from_gaps(structural_gap: float, predicted_future_gap: float) -> Trend:
        if predicted_future_gap > structural_gap + 0.5:
            return Trend.WORSENING
        if predicted_future_gap < structural_gap - 0.5:
            return Trend.IMPROVING
        return Trend.DECLARED_ML

    def _predict_gaps(self, teacher_id: str, mode: str | None = None) -> Optional[list[SkillGap]]:
        """Prediction ML avec validation du vecteur de features avant inference.

        - Valide le schema (spec + plages) a chaque appel ;
        - En cas d'echec de validation, retourne None -> fallback heuristique ;
        - Le mode (PRODUCTION_ML ou DEMO_ML) est injecte par l'appelant.
        """
        bundle = self._teacher_feature_bundle(teacher_id)
        X, comp_ids, required_by_comp = self._build_feature_matrix(bundle)
        if X.shape[0] == 0:
            return []
        if self._model is None:
            return None

        vector_error = self._serving_vector_error(X, teacher_id)
        if vector_error:
            self._fallback_reason = vector_error
            return None
        # Skew guard actif (test KS, p < seuil) : accumulation des features
        # servies puis contrôle de dérive contre la référence d'entraînement.
        # Dérive détectée => repli heuristique fail-closed avec raison tracée.
        self._skew_guard.record_serving(X)
        skew = self._skew_guard.evaluate()
        if skew.skew_detected:
            self._fallback_reason = skew.reason
            logger.warning(
                "skew guard KS : dérive de distribution — fallback heuristique",
                features=skew.features,
                min_p_value=skew.min_p_value,
                teacher_id=teacher_id,
            )
            return None
        synthetic_error = self._declared_synthetic_share_error()
        if synthetic_error:
            self._fallback_reason = synthetic_error
            return None

        ranges = (self._metadata or {}).get("feature_ranges", {})
        xn = self._normalize(X, ranges)
        ml_pred = np.clip(self._model.predict(xn), 0.0, 5.0)

        with self._database.read_connection() as conn:
            names = conn.execute(
                text("SELECT id, code, nom FROM competence.competences WHERE id = ANY(:ids)"),
                {"ids": comp_ids},
            ).mappings().all()
        by_id = {int(r["id"]): (r["code"], r["nom"]) for r in names}

        seuils = self._settings
        today = date.today()
        gaps: list[SkillGap] = []
        for i, cid in enumerate(comp_ids):
            current_t = float(X[i, 3])
            required = float(required_by_comp[i])
            structural_gap = max(0.0, required - current_t)

            predicted_future_gap = float(ml_pred[i])
            effective_gap = float(max(structural_gap, predicted_future_gap))
            score = min(1.0, effective_gap / 4.0)
            sev = self._severity_from_score(score, seuils)
            code, nom = by_id.get(cid, (f"C{cid}", f"Competence {cid}"))
            trend = self._trend_from_gaps(structural_gap, predicted_future_gap)
            gaps.append(
                SkillGap(
                    teacher_id=teacher_id,
                    competence_id=cid,
                    competence_code=str(code),
                    competence_nom=str(nom),
                    observed_result=current_t,
                    knowledge_difficulty_level=required,
                    gap_score=round(score, 4),
                    severity=sev,
                    trend=trend,
                    as_of=today,
                )
            )
        return gaps

    def _predict_risk(self, teacher_id: str) -> RiskProfile:
        """Calcule le risque en priorité par le ML dédié si disponible, sinon règles métier.

        Les règles métier de sécurité restent prioritaires : si >=3 gaps critiques,
        le niveau est CRITICAL quel que soit le modèle statistique.
        Le moteur effectivement utilisé est tracé dans ``self._risk_engine``
        ("ml" | "rules") et exposé via status() pour un étiquetage honnête.
        """
        # 1) Modele ML dedie si disponible
        if self.risk_available():
            try:
                profile = self._predict_risk_ml(teacher_id)
                self._risk_engine = "ml"
                return profile
            except Exception as exc:  # pragma: no cover
                logger.error("predict_risk ML echoue, fallback regle", error=str(exc))
        # 2) Fallback : regle arbitraire derivee des gaps (comportement historique)
        self._risk_engine = "rules"
        gaps = self._predict_gaps(teacher_id)
        if gaps is None:
            # Le modele est indisponible ou la validation des features a echoue :
            # on s'appuie sur le dernier snapshot de gaps persiste (meme source
            # que l'onglet Gaps) pour ne pas afficher un risque faux-zero.
            gaps = self._persisted_gaps(teacher_id)
        return self._rule_risk_scoped(teacher_id, gaps or [])

    def _filter_gaps_to_scope(
        self,
        teacher_id: str,
        gaps: list[SkillGap],
        scoped_ids: set[int],
    ) -> list[SkillGap]:
        """Gaps restreints au périmètre de l'enseignant.

        Si aucune prédiction ne tombe dans le périmètre, retombe sur le
        snapshot persisté (déjà scopé par compute_gaps).
        """
        filtered = [g for g in gaps if g.competence_id in scoped_ids]
        if not filtered:
            persisted = self._persisted_gaps(teacher_id) or []
            filtered = [g for g in persisted if g.competence_id in scoped_ids]
        return filtered

    def _rule_risk_scoped(self, teacher_id: str, gaps: list[SkillGap]) -> RiskProfile:
        """Règle de risque sur les gaps DU PÉRIMÈTRE de l'enseignant.

        Les prédictions ML couvrent toutes les compétences où l'enseignant a
        des niveaux déclarés, y compris hors de son périmètre (ex : un
        enseignant Génie Civil avec des savoirs GL/Réseaux hérités). Les gaps
        hors périmètre sont retirés pour que les facteurs du score restent
        cohérents avec les gaps affichés (onglet Gaps / scope-analysis). Si
        aucune prédiction ne tombe dans le périmètre, on retombe sur le
        snapshot persisté (déjà scopé par compute_gaps). Périmètre global si
        aucun domaine ne correspond (même convention que compute_gaps).
        """
        scoped_ids = self._scoped_competence_ids(teacher_id)
        scope = "DEPARTMENT" if scoped_ids is not None else "TEACHER"
        scope_type, scope_id, scope_label = self._teacher_scope_info(teacher_id, scope)
        if scoped_ids is not None and gaps:
            gaps = self._filter_gaps_to_scope(teacher_id, gaps, scoped_ids)
        return rule_risk_from_gaps(
            teacher_id,
            gaps,
            scope=scope,
            scope_type=scope_type,
            scope_id=scope_id,
            scope_label=scope_label,
        )

    def _teacher_scope_info(
        self, teacher_id: str, scope: str
    ) -> tuple[str, str | None, str | None]:
        """Retourne (scope_type, scope_id, scope_label) pour l'enseignant.

        - ``DEPARTMENT`` : scope_type="DEPARTMENT", scope_id=dept_id,
          scope_label="Département <libellé>".
        - ``UP`` : scope_type="UP", scope_id=up_id,
          scope_label="Unité pédagogique <libellé>".
        - ``TEACHER`` (périmètre global) : scope_type="TEACHER",
          scope_id=teacher_id, scope_label=nom complet.
        """
        try:
            with self._database.read_connection() as conn:
                row = conn.execute(
                    text("""
                        SELECT t.up_id, t.dept_id, t.specialite,
                               u.libelle AS up_libelle,
                               d.libelle AS dept_libelle,
                               t.prenom, t.nom
                        FROM formation.enseignants t
                        LEFT JOIN formation.ups u ON u.id = t.up_id
                        LEFT JOIN formation.departements d ON d.id = t.dept_id
                        WHERE t.id = :tid AND t.deleted_at IS NULL
                    """),
                    {"tid": teacher_id},
                ).mappings().first()
        except Exception as exc:  # pragma: no cover - log + repli TEACHER
            logger.error("scope enseignant illisible", teacher_id=teacher_id, error=str(exc))
            return "TEACHER", teacher_id, None
        if row is None:
            return "TEACHER", teacher_id, None
        if scope == "DEPARTMENT" and row["dept_id"]:
            label = row["dept_libelle"] or row["dept_id"]
            if not str(label).lower().startswith("département"):
                label = f"Département {label}"
            return "DEPARTMENT", str(row["dept_id"]), str(label)
        if row["up_id"]:
            label = row["up_libelle"] or row["up_id"]
            if not str(label).lower().startswith(("up ", "unité")):
                label = f"Unité pédagogique {label}"
            return "UP", str(row["up_id"]), str(label)
        full_name = f"{row['prenom'] or ''} {row['nom'] or ''}".strip()
        return "TEACHER", teacher_id, full_name or None

    def _scoped_competence_ids(self, teacher_id: str) -> Optional[set[int]]:
        """Ids des compétences du périmètre (département/UP/spécialité).

        Retourne None si l'enseignant n'a pas de rattachement ou si aucun
        domaine ne correspond (périmètre global — même convention que
        ``compute_gaps``).
        """
        try:
            with self._database.read_connection() as conn:
                teacher = conn.execute(
                    text("""
                        SELECT up_id, dept_id, specialite
                        FROM formation.enseignants
                        WHERE id = :tid AND deleted_at IS NULL
                    """),
                    {"tid": teacher_id},
                ).mappings().first()
                if not teacher or not (teacher["up_id"] or teacher["dept_id"] or teacher["specialite"]):
                    return None
                rows = conn.execute(
                    text("""
                        SELECT c.id
                        FROM competence.competences c
                        LEFT JOIN competence.domaines d ON d.id = c.domaine_id
                        WHERE (:dept_id IS NOT NULL AND CAST(d.departement_id AS TEXT) = :dept_id)
                           OR (:up_id IS NOT NULL AND CAST(d.up_id AS TEXT) = :up_id)
                           OR (:specialite IS NOT NULL AND (
                               d.nom ILIKE '%' || :specialite || '%'
                               OR c.nom ILIKE '%' || :specialite || '%'
                           ))
                    """),
                    {"dept_id": teacher["dept_id"], "up_id": teacher["up_id"], "specialite": teacher["specialite"]},
                ).mappings().all()
        except Exception as exc:  # pragma: no cover - log + périmètre global
            logger.error("perimetre enseignant illisible, risque global", teacher_id=teacher_id, error=str(exc))
            return None
        ids = {int(r["id"]) for r in rows}
        return ids or None

    def _persisted_gaps(self, teacher_id: str) -> Optional[list[SkillGap]]:
        """Lit le dernier snapshot de gaps persiste (analyse.skill_gaps).

        Utilisé comme source de secours du calcul de risque quand le modele ML
        est indisponible ou que la validation des features echoue au serving.
        Retourne les gaps du snapshot le plus recent, ou None si aucun.
        """
        try:
            with self._database.read_connection() as conn:
                latest = conn.execute(
                    text("""
                        SELECT MAX(computed_at) AS ts
                        FROM "analyse".skill_gaps
                        WHERE enseignant_id = :tid
                    """),
                    {"tid": teacher_id},
                ).scalar_one_or_none()
                if latest is None:
                    return None
                rows = conn.execute(
                    text("""
                        SELECT competence_id, gap_score, niveau_urgence
                        FROM "analyse".skill_gaps
                        WHERE enseignant_id = :tid AND computed_at = :ts
                    """),
                    {"tid": teacher_id, "ts": latest},
                ).mappings().all()
        except Exception as exc:  # pragma: no cover - log + absence de fallback
            logger.error("lecture snapshot gaps impossible pour le risque", teacher_id=teacher_id, error=str(exc))
            return None
        if not rows:
            return None
        today = date.today()
        gaps: list[SkillGap] = []
        for row in rows:
            urgence = str(row["niveau_urgence"] or "").upper()
            sev = {
                "CRITIQUE": Severity.CRITICAL,
                "HAUTE": Severity.HIGH,
                "MOYENNE": Severity.MEDIUM,
                "FAIBLE": Severity.LOW,
            }.get(urgence, Severity.LOW)
            gaps.append(
                SkillGap(
                    teacher_id=teacher_id,
                    competence_id=int(row["competence_id"]),
                    competence_code=f"C{row['competence_id']}",
                    competence_nom=f"Competence {row['competence_id']}",
                    observed_result=0.0,
                    knowledge_difficulty_level=0.0,
                    gap_score=round(float(row["gap_score"] or 0.0), 4),
                    severity=sev,
                    trend=Trend.STABLE,
                    as_of=today,
                )
            )
        return gaps

    def _stagnation_months(self, bundle: dict[str, Any]) -> float:
        savs = bundle.get("savoirs", [])
        dates: list[date] = []
        for s in savs:
            d = s.get("date_acquisition")
            if d is None:
                continue
            if hasattr(d, "date"):
                d = d.date()
            if isinstance(d, date):
                dates.append(d)
        if not dates:
            return 18.0
        return float((date.today() - max(dates)).days / 30.44)

    @staticmethod
    def _risk_class_bonus(classes: list, proba: np.ndarray, n_crit: int) -> float:
        """Bonus au score quand les classes risquées sont probablement."""
        bonus = 0.0
        if "CRITICAL" in classes and proba[classes.index("CRITICAL")] >= 0.2:
            bonus += 15.0
        elif "HIGH" in classes and proba[classes.index("HIGH")] >= 0.4:
            bonus += 8.0
        return bonus + min(30.0, n_crit * 7.0)

    def _apply_critical_gaps_rule(
        self,
        n_crit: int,
        level: RiskLevel,
        risk_score: float,
        scope: str,
        scope_type: str,
        scope_id: str | None,
        scope_label: str | None,
    ) -> tuple[RiskLevel, float, tuple[RiskFactor, ...]]:
        """REGLE METIER DE SECURITE : >=3 gaps critiques => CRITICAL.

        Quel que soit le ML : relève le niveau, plancher le score à 75 et
        ajoute le facteur explicatif dédié.
        """
        if n_crit >= 3 and level in {RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH}:
            factor = RiskFactor(
                feature="critical_gaps_rule",
                value=float(n_crit),
                normalized_value=1.0,
                weight=0.3,
                contribution=0.3,
                label="Règle métier (≥ 3 gaps critiques)",
                scope=scope,
                scope_type=scope_type,
                scope_id=scope_id,
                scope_label=scope_label,
            )
            return RiskLevel.CRITICAL, max(risk_score, 75.0), (factor,)
        return level, risk_score, ()

    def _predict_risk_ml(self, teacher_id: str) -> RiskProfile:
        """Classifier dedie : RandomForest entraine sur risk_training_metadata."""
        bundle = self._teacher_feature_bundle(teacher_id)
        gaps = self._predict_gaps(teacher_id) or []
        scoped_ids = self._scoped_competence_ids(teacher_id)
        scope = "DEPARTMENT" if scoped_ids is not None else "TEACHER"
        scope_type, scope_id, scope_label = self._teacher_scope_info(teacher_id, scope)
        if scoped_ids is not None and gaps:
            gaps = self._filter_gaps_to_scope(teacher_id, gaps, scoped_ids)
        streak = self._stagnation_months(bundle)
        n_crit = sum(1 for g in gaps if g.severity == Severity.CRITICAL)
        n_high = sum(1 for g in gaps if g.severity == Severity.HIGH)
        n_tot = len(gaps)
        avg_gap = float(np.mean([g.gap_score for g in gaps])) if gaps else 0.0
        max_gap = float(max((g.gap_score for g in gaps), default=0.0))
        avg_eval, nb_eval = _safe_eval(bundle["eval"])
        nb_need, nb_need_ok = _safe_needs(bundle["needs"])

        features = np.array([[
            float(n_tot), float(n_crit), float(n_high),
            avg_gap, max_gap,
            streak, avg_eval, float(nb_eval),
            float(bundle["attendance"]), float(len(bundle["completed"])),
            float(nb_need), float(nb_need_ok),
            n_crit / max(1.0, float(n_tot)),
            1.0 if n_crit > 0 else 0.0,
            1.0 if bundle["attendance"] < 0.5 else 0.0,
            1.0 if streak > 6 else 0.0,
        ]], dtype=float)

        proba = self._risk_model.predict_proba(features)[0]
        classes = list(self._risk_model.classes_)
        midpoints = {"LOW": 10.0, "MEDIUM": 37.5, "HIGH": 62.5, "CRITICAL": 87.5}

        expected = float(np.dot(proba, [midpoints.get(c, 40.0) for c in classes]))
        bonus = self._risk_class_bonus(classes, proba, n_crit)
        risk_score = round(min(100.0, expected + bonus), 2)

        pred_label = classes[int(np.argmax(proba))]
        level = {"LOW": RiskLevel.LOW, "MEDIUM": RiskLevel.MEDIUM,
                 "HIGH": RiskLevel.HIGH, "CRITICAL": RiskLevel.CRITICAL}.get(pred_label, RiskLevel.MEDIUM)

        level, risk_score, factors_extra = self._apply_critical_gaps_rule(
            n_crit, level, risk_score, scope, scope_type, scope_id, scope_label,
        )

        # Facteurs normalisés : probabilité de classe (0..1) * poids (milieu de
        # classe / 100) -> contribution toujours bornée dans [0, 1].
        factors = [
            RiskFactor(
                feature=f"{lab}_proba",
                value=round(float(p), 4),
                normalized_value=round(float(p), 4),
                weight=round(midpoints.get(lab, 0) / 100.0, 4),
                contribution=round(float(p) * midpoints.get(lab, 0) / 100.0, 4),
                label=f"Probabilité classe {lab}",
                scope=scope,
                scope_type=scope_type,
                scope_id=scope_id,
                scope_label=scope_label,
            )
            for lab, p in zip(classes, proba)
            if float(p) > 0.05
        ]
        if "CRITICAL" in classes:
            factors.append(RiskFactor(
                feature="n_critical_gaps",
                value=float(n_crit),
                normalized_value=round(min(1.0, n_crit / CRITICAL_GAP_CAP), 4),
                weight=0.50,
                contribution=round(min(1.0, n_crit / CRITICAL_GAP_CAP) * 0.50, 4),
                label="Gaps critiques",
                scope=scope,
                scope_type=scope_type,
                scope_id=scope_id,
                scope_label=scope_label,
            ))
        factors.append(RiskFactor(
            feature="stagnation_months",
            value=round(streak, 2),
            normalized_value=round(min(1.0, streak / 24.0), 4),
            weight=0.10,
            contribution=round(min(1.0, streak / 24.0) * 0.10, 4),
            label="Mois de stagnation",
            scope=scope,
            scope_type=scope_type,
            scope_id=scope_id,
            scope_label=scope_label,
        ))
        factors.extend(factors_extra)
        uncapped = sum(f.contribution for f in factors)
        return RiskProfile(
            teacher_id=teacher_id,
            risk_score=risk_score,
            risk_level=level,
            factors=tuple(factors),
            is_capped=uncapped > 1.0,
            uncapped_score=round(uncapped, 4),
        )

    # ------------------------------------------------------- Risk ML dedie
    def risk_available(self) -> bool:
        if not self._ml_enabled:
            return False
        if not self._risk_load_attempted:
            self._load_risk_model()
        return self._risk_model is not None

    def _load_risk_model(self) -> None:
        self._risk_load_attempted = True
        if not self._risk_artifact_path.exists():
            logger.info("artefact risk classifier absent, fallback regle", path=str(self._risk_artifact_path))
            return
        try:
            self._risk_model = load_with_integrity_check(self._risk_artifact_path)
            if self._risk_metadata_path.exists():
                self._risk_metadata = json.loads(self._risk_metadata_path.read_text(encoding="utf-8"))
            else:
                self._risk_metadata = {}
        except ArtifactIntegrityError as exc:
            logger.error("risk classifier refuse pour integrite non validee", error=str(exc))
            self._risk_model = None
        except Exception as exc:  # pragma: no cover
            logger.error("chargement modele risque impossible", error=str(exc))
            self._risk_model = None

    def risk_status(self) -> dict[str, Any]:
        available = self.risk_available()
        meta = self._risk_metadata or {}
        f1_per_class = (meta.get("metrics") or {}).get("f1_per_class") or {}
        return {
            "name": "risk_classifier",
            "available": available,
            "mode": "ML" if available else "RULE_BASED",
            "version": meta.get("trained_at") or "unknown",
            "n_teachers_trained": meta.get("n_teachers"),
            "macro_f1_cv": (meta.get("metrics") or {}).get("macro_f1"),
            "f1_per_class": f1_per_class,
        }

    # ------------------------------------------------------- Pertinence recommandations
    def relevance_available(self) -> bool:
        if not self._ml_enabled:
            return False
        if not self._relevance_load_attempted:
            self._load_relevance_model()
        return self._relevance_model is not None

    def _load_relevance_model(self) -> None:
        self._relevance_load_attempted = True
        if not self.relevance_artifact_path.exists():
            logger.info("artefact pertinence absent, ranking heuristique conserve",
                        path=str(self.relevance_artifact_path))
            return
        try:
            self._relevance_model = load_with_integrity_check(self.relevance_artifact_path)
            if self.relevance_metadata_path.exists():
                self._relevance_metadata = json.loads(self.relevance_metadata_path.read_text(encoding="utf-8"))
        except ArtifactIntegrityError as exc:
            logger.error("relevance model refuse pour integrite non validee", error=str(exc))
            self._relevance_model = None
        except Exception as exc:  # pragma: no cover
            logger.error("chargement modele pertinence impossible", error=str(exc))
            self._relevance_model = None

    def score_relevance(
        self,
        teacher_id: str,
        formation_id: int,
        content_match_heuristic: float,
    ) -> float | None:
        """Retourne le score de pertinence ML [0..1] ou None si artefact absent."""
        if not self.relevance_available():
            return None
        try:
            X = self._relevance_features(teacher_id, formation_id, content_match_heuristic)
            score = float(self._relevance_model.predict(X)[0])
            return float(np.clip(score, 0.0, 1.0))
        except Exception as exc:  # pragma: no cover
            logger.error("score_relevance ML echoue", error=str(exc))
            return None

    def _relevance_features(
        self,
        teacher_id: str,
        formation_id: int,
        content_match_heuristic: float,
    ) -> np.ndarray:
        """Reconstruit le vecteur de features pertinence du couple (teacher, formation)."""
        with self._database.read_connection() as conn:
            fcomps = conn.execute(
                text("""
                    SELECT fc.savoir_id, nsr.niveau
                    FROM formation.formation_competences fc
                    LEFT JOIN competence.niveau_savoir_requis nsr ON nsr.savoir_id = fc.savoir_id
                    WHERE fc.formation_id = :fid AND fc.savoir_id IS NOT NULL
                """), {"fid": formation_id}).mappings().all()
            tl = conn.execute(
                text("SELECT savoir_id, niveau FROM competence.enseignant_competences WHERE enseignant_id = :tid"),
                {"tid": teacher_id}).mappings().all()
            fev = conn.execute(
                text("SELECT AVG(note) AS n, COUNT(*) AS nb FROM evaluation.evaluation_formateur WHERE formation_id = :fid"),
                {"fid": formation_id}).mappings().first()
            finfo = conn.execute(
                text("SELECT date_fin FROM formation.formations WHERE id_formation = :fid"),
                {"fid": formation_id}).mappings().first()

        tmap = {int(r["savoir_id"]): NIVEAU_INT.get(str(r["niveau"]).upper(), 0) for r in tl}

        nb_cibles = len(fcomps)
        nb_couverts = 0
        c_vals = []
        for r in fcomps:
            s = int(r["savoir_id"])
            c = NIVEAU_INT.get(str(r["niveau"]).upper(), 3) if r["niveau"] else 3
            c_vals.append(c)
            if tmap.get(s, 0) >= c:
                nb_couverts += 1
        coverage = nb_couverts / max(1, nb_cibles)
        avg_t = float(np.mean(c_vals)) if c_vals else 3.0
        t_levels = [v for v in tmap.values() if v > 0]
        avg_teacher = float(np.mean(t_levels)) if t_levels else 0.0
        diff = avg_t - avg_teacher

        with self._database.read_connection() as conn:
            last = conn.execute(
                text("""
                    SELECT MAX(date_acquisition) FROM competence.enseignant_competences
                    WHERE enseignant_id = :tid AND date_acquisition IS NOT NULL
                """), {"tid": teacher_id}).scalar()
        days_since = float((date.today() - last).days) if last else 365.0

        f_age = self._formation_age(finfo)

        return np.array([[
            float(content_match_heuristic), float(nb_couverts), float(nb_cibles), float(coverage),
            float(len(t_levels)), 0.0, 0.0,
            avg_teacher, float(diff), days_since,
            float(fev["n"]) if fev and fev["n"] is not None else 0.0,
            f_age, 1.0,
        ]], dtype=float)

    @staticmethod
    def _formation_age(finfo) -> float:
        f_age = 365.0
        if finfo and finfo["date_fin"]:
            d = finfo["date_fin"]
            if hasattr(d, "date"):
                d = d.date()
            f_age = float((date.today() - d).days)
        return f_age


def _read_csv_safe(path: Path):
    """Charge un CSV en DataFrame sans faire planter le port ML."""
    import pandas as pd
    try:
        return pd.read_csv(path)
    except Exception as exc:
        logger.error("lecture CSV impossible", path=str(path), error=str(exc))
        return None


def _safe_eval(row) -> tuple[float, int]:
    if not row:
        return 0.0, 0
    avg = float(row["avg_score"]) if row["avg_score"] is not None else 0.0
    return avg, int(row["nb"] or 0)


def _safe_needs(row) -> tuple[int, int]:
    if not row:
        return 0, 0
    return int(row["nb"] or 0), int(row["nb_approuves"] or 0)
