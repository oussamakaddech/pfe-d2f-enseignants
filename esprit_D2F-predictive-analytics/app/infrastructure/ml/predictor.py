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
from app.infrastructure.ml.model_registry import (
    APPROVAL_APPROVED,
    STATUS_ACTIVE,
    ModelRegistry,
    RegistryEntry,
)

logger = get_logger("ml_predictor")

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

        # Registre d'artefacts
        registry_path = Path(getattr(settings, "ml_registry_path", "model_registry.json"))
        if not registry_path.is_absolute():
            registry_path = models_dir / registry_path
        self._registry = ModelRegistry(registry_path, models_dir)

        # Provenance calculee depuis les lignes du corpus reel a l'entrainement.
        self._provenance_report: DatasetProvenanceReport | None = None
        self._load_provenance()

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
                return
        self._provenance_report = DatasetProvenanceReport()
        self._provenance_report.errors.append("aucun corpus d'entrainement trouve")

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

        # 1. Verification des features (spec + ordre)
        expected = list(TEMPORAL_FEATURE_COLS)
        meta_feats = meta.get("feature_cols") or expected
        spec_result = validate_feature_spec(
            meta_feats,
            meta.get("feature_schema_version") or FEATURE_SCHEMA_VERSION,
            expected,
            FEATURE_SCHEMA_VERSION,
        )
        if not spec_result.valid:
            self._fallback_reason = "; ".join(spec_result.errors)
            return HEURISTIC_FALLBACK

        # 2. Provenance calculee depuis les lignes
        prov = self._provenance_report
        if prov is None or prov.errors:
            self._fallback_reason = (
                "provenance indisponible (corpus absent ou colonnes manquantes)"
            )
            return HEURISTIC_FALLBACK
        tolerance = float(getattr(self._settings, "ml_synthetic_tolerance_pct", 50.0))
        require_real = bool(getattr(self._settings, "ml_require_real_data", True))
        min_real = int(getattr(self._settings, "ml_min_real_rows", 50))
        if prov.synthetic_share_pct > tolerance:
            self._fallback_reason = (
                f"corpus {prov.synthetic_share_pct:.1f}% synthetique "
                f"(tolerance {tolerance:.0f}%)"
            )
            return HEURISTIC_FALLBACK
        if require_real and prov.real_rows < min_real:
            self._fallback_reason = (
                f"donnees reelles insuffisantes : {prov.real_rows} lignes "
                f"< minimum {min_real}"
            )
            return HEURISTIC_FALLBACK

        # 3. Registre : entree ACTIVE et APPROVED
        entry = self._registry.active()
        if entry is None or entry.approval_status != APPROVAL_APPROVED:
            # Modele disponible et valide mais non approuve pour la production.
            self._fallback_reason = "modele non approuve pour la production (registre)"
            return DEMO_ML
        if meta.get("model_name") and entry.model_name != meta.get("model_name"):
            self._fallback_reason = "modele non approuve pour la production (registre)"
            return DEMO_ML

        # 4. Metriques minimales
        metrics = meta.get("metrics") or {}
        min_r2 = float(getattr(self._settings, "ml_min_r2", 0.0))
        max_rmse = float(getattr(self._settings, "ml_max_rmse", 2.0))
        max_mae = float(getattr(self._settings, "ml_max_mae", 1.5))
        test_r2 = metrics.get("test_r2")
        test_rmse = metrics.get("test_rmse")
        test_mae = metrics.get("test_mae")
        if test_r2 is None or test_rmse is None or test_mae is None:
            self._fallback_reason = "metriques du modele absentes dans la metadata"
            return DEMO_ML
        if test_r2 < min_r2:
            self._fallback_reason = f"R2={test_r2:.3f} < minimum requis {min_r2:.3f}"
            return DEMO_ML
        if test_rmse > max_rmse:
            self._fallback_reason = f"RMSE={test_rmse:.3f} > maximum autorise {max_rmse:.3f}"
            return DEMO_ML
        if test_mae > max_mae:
            self._fallback_reason = f"MAE={test_mae:.3f} > maximum autorise {max_mae:.3f}"
            return DEMO_ML

        # 5. Volonte de l'operateur : demande PRODUCTION_ML ?
        requested = str(getattr(self._settings, "ml_serving_mode", PRODUCTION_ML)).upper()
        if requested != PRODUCTION_ML:
            # L'operateur demande explicitement un autre mode.
            if requested == DEMO_ML:
                self._fallback_reason = "demande explicite du mode DEMO_ML par l'operateur"
                return DEMO_ML
            self._fallback_reason = f"mode demande non reconnu : {requested}"
            return HEURISTIC_FALLBACK

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
        """
        mode = self._effective_mode()
        ml_observability.record_mode(mode)
        if mode == HEURISTIC_FALLBACK:
            ml_observability.record_fallback(self._fallback_reason)
            return None
        try:
            result = self._predict_gaps(teacher_id, mode=mode)
            if result is None:
                ml_observability.record_fallback(self._fallback_reason)
            else:
                entry = self._registry.active()
                ml_observability.record_prediction(
                    model_version=entry.model_version if entry else None,
                    latency_ms=0.0,
                    values=[g.gap_score for g in result],
                )
            return result
        except Exception as exc:  # pragma: no cover - log + fallback
            logger.error("predict_gaps ML echoue, fallback heuristique", error=str(exc))
            self._fallback_reason = f"erreur d'inference : {exc}"
            ml_observability.record_fallback(self._fallback_reason)
            return None

    def predict_risk(self, teacher_id: str) -> RiskProfile | None:
        if not self.available():
            return None
        try:
            return self._predict_risk(teacher_id)
        except Exception as exc:  # pragma: no cover
            logger.error("predict_risk ML echoue, fallback heuristique", error=str(exc))
            return None

    def status(self) -> dict[str, Any]:
        mode = self._effective_mode()
        meta = self._metadata or {}
        prov = self._provenance_report
        entry = self._registry.active()
        return {
            "name": "gap_predictor_temporal",
            "available": mode in (PRODUCTION_ML, DEMO_ML),
            "kill_switch": not self._ml_enabled,
            "mode": mode,
            "model_mode": mode,
            "model_version": entry.model_version if entry else None,
            "fallback_reason": self._fallback_reason,
            "version": meta.get("trained_at") or "unknown",
            "model_name": meta.get("model_name", "gradient_boosting"),
            "n_features": meta.get("n_features", len(TEMPORAL_FEATURE_COLS)),
            "feature_schema_version": FEATURE_SCHEMA_VERSION,
            "drift_check": self._artifact_drift_check(self._metadata),
            "provenance": prov.to_dict() if prov else {},
            "registry_entry": entry.to_dict() if entry else None,
            "prediction_horizon": "3m",
            "risk_model": self.risk_status(),
            "relevance_model": {
                "name": "relevance_model",
                "available": self.relevance_available(),
                "version": (self._relevance_metadata or {}).get("trained_at") or "unknown",
                "drift_check": self._artifact_drift_check(self._relevance_metadata),
            },
        }

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
            logger.info(
                "modele ML charge",
                path=str(self._artifact_path),
                n_features=n_features_model,
            )
        except ArtifactIntegrityError as exc:
            logger.error("artefact ML refuse pour integrite non validee", error=str(exc))
            self._fallback_reason = f"integrite invalide : {exc}"
            self._model = None
        except Exception as exc:  # pragma: no cover
            logger.error("chargement modele ML impossible", error=str(exc))
            self._fallback_reason = f"chargement impossible : {exc}"
            self._model = None

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
        ranges = (self._metadata or {}).get("feature_ranges", {})

        # Validation stricte du vecteur de features au serving.
        validation = validate_feature_vector(X, TEMPORAL_FEATURE_COLS, ranges)
        if not validation.valid:
            logger.error(
                "features invalides au serving — fallback",
                errors=validation.errors,
                teacher_id=teacher_id,
            )
            self._fallback_reason = "features invalides au serving : " + "; ".join(validation.errors)
            return None

        # Defense en profondeur : la metadata doit declarer une part synthetique
        # dans la tolerance — meme en cas de contournement du routage principal.
        meta = self._metadata or {}
        data_sources = meta.get("data_sources") or {}
        declared_synth = float(data_sources.get("synthetic_share_pct", 100.0))
        tolerance = float(getattr(self._settings, "ml_synthetic_tolerance_pct", 50.0))
        if declared_synth > tolerance:
            logger.warning(
                "gap_predictor ml refuse au serving : proportion synthetique declaree trop elevee",
                declared_synthetic_share_pct=declared_synth,
                tolerance=tolerance,
            )
            self._fallback_reason = (
                f"metadata declare {declared_synth:.1f}% de données synthétiques "
                f"(tolérance {tolerance:.0f}%)"
            )
            return None

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
            if score >= seuils.seuil_gap_critique:
                sev = Severity.CRITICAL
            elif score >= seuils.seuil_gap_haute:
                sev = Severity.HIGH
            elif score >= seuils.seuil_gap_moyenne:
                sev = Severity.MEDIUM
            else:
                sev = Severity.LOW
            code, nom = by_id.get(cid, (f"C{cid}", f"Competence {cid}"))
            if predicted_future_gap > structural_gap + 0.5:
                trend = Trend.WORSENING
            elif predicted_future_gap < structural_gap - 0.5:
                trend = Trend.IMPROVING
            else:
                trend = Trend.DECLARED_ML
            gaps.append(
                SkillGap(
                    teacher_id=teacher_id,
                    competence_id=cid,
                    competence_code=str(code),
                    competence_nom=str(nom),
                    current_level=current_t,
                    target_level=required,
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
        """
        # 1) Modele ML dedie si disponible
        if self.risk_available():
            try:
                return self._predict_risk_ml(teacher_id)
            except Exception as exc:  # pragma: no cover
                logger.error("predict_risk ML echoue, fallback regle", error=str(exc))
        # 2) Fallback : regle arbitraire derivee des gaps (comportement historique)
        gaps = self._predict_gaps(teacher_id)
        if not gaps:
            return RiskProfile(teacher_id=teacher_id, risk_score=0.0, risk_level=RiskLevel.LOW, factors=())
        critical = sum(1 for g in gaps if g.severity == Severity.CRITICAL)
        high = sum(1 for g in gaps if g.severity == Severity.HIGH)
        avg_gap = float(np.mean([g.gap_score for g in gaps]))
        risk_score = min(100.0, critical * 25.0 + high * 12.0 + avg_gap * 40.0)
        if risk_score >= 75:
            level = RiskLevel.CRITICAL
        elif risk_score >= 50:
            level = RiskLevel.HIGH
        elif risk_score >= 30:
            level = RiskLevel.MEDIUM
        else:
            level = RiskLevel.LOW
        factors = (
            RiskFactor(feature="critical_gaps", value=float(critical), contribution=critical * 0.25),
            RiskFactor(feature="high_gaps", value=float(high), contribution=high * 0.12),
            RiskFactor(feature="avg_gap_score", value=round(avg_gap, 4), contribution=avg_gap * 0.40),
        )
        return RiskProfile(teacher_id=teacher_id, risk_score=round(risk_score, 2), risk_level=level, factors=factors)

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

    def _predict_risk_ml(self, teacher_id: str) -> RiskProfile:
        """Classifier dedie : RandomForest entraine sur risk_training_metadata."""
        bundle = self._teacher_feature_bundle(teacher_id)
        gaps = self._predict_gaps(teacher_id) or []
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
        bonus = 0.0
        if "CRITICAL" in classes and proba[classes.index("CRITICAL")] >= 0.2:
            bonus += 15.0
        elif "HIGH" in classes and proba[classes.index("HIGH")] >= 0.4:
            bonus += 8.0
        bonus += min(30.0, n_crit * 7.0)
        risk_score = round(min(100.0, expected + bonus), 2)

        pred_label = classes[int(np.argmax(proba))]
        level = {"LOW": RiskLevel.LOW, "MEDIUM": RiskLevel.MEDIUM,
                 "HIGH": RiskLevel.HIGH, "CRITICAL": RiskLevel.CRITICAL}.get(pred_label, RiskLevel.MEDIUM)

        # REGLE METIER DE SECURITE : >=3 gaps critiques => CRITICAL, quel que soit le ML.
        if n_crit >= 3 and level in {RiskLevel.LOW, RiskLevel.MEDIUM, RiskLevel.HIGH}:
            level = RiskLevel.CRITICAL
            risk_score = max(risk_score, 75.0)
            factors_extra = (RiskFactor(
                feature="critical_gaps_rule",
                value=float(n_crit),
                contribution=0.3,
            ),)
        else:
            factors_extra = ()

        factors = [
            RiskFactor(
                feature=f"{lab}_proba",
                value=round(float(p), 4),
                contribution=round(float(p) * midpoints.get(lab, 0) / 100.0, 4),
            )
            for lab, p in zip(classes, proba)
            if float(p) > 0.05
        ]
        if "CRITICAL" in classes:
            crit_idx = list(classes).index("CRITICAL")
            factors.append(RiskFactor(feature="n_critical_gaps", value=float(n_crit),
                                      contribution=round(float(proba[crit_idx]), 4)))
        factors.append(RiskFactor(feature="stagnation_months", value=round(streak, 2), contribution=0.1))
        factors.extend(factors_extra)
        return RiskProfile(
            teacher_id=teacher_id,
            risk_score=risk_score,
            risk_level=level,
            factors=tuple(factors),
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
