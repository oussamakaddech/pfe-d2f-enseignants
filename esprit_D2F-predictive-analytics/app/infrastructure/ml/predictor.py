"""Port ML : charge le modele gap_predictor_temporal et UTILISE réellement ses prédictions.

Mode actif : runtime check : si l'artefact est disponible ET que la metadata
declare `data_sources.synthetic_share_pct <= ML_SYNTHETIC_TOLERANCE_PCT`,
le modèle est utilisé (prédiction bornée puis agrégée en SkillGap).
Sinon, on retourne None -> l'appelant bascule sur l'heuristique métier.

Anti-fuite : `required_level` ne fait jamais partie des features (pour le
serving, il est lu depuis la base APRES la prediction ML pour évaluer
le gap courant, distinct de la prédiction future gap_next_3m).

Anti train/serve skew : les feature_ranges du training sont persistes
dans `temporal_training_metadata.json` et ré-appliquées telles quelles
au serving (_normalize).

Intégrité : l'artefact n'est chargé que si son sidecar SHA-256/HMAC matche.
"""
from __future__ import annotations

import json
from datetime import date, datetime
from pathlib import Path
from typing import Any, Optional

import numpy as np
from sqlalchemy import text

from app.core.logging import get_logger
from app.domain.entities.risk_profile import RiskFactor, RiskProfile
from app.domain.entities.skill_gap import SkillGap
from app.domain.value_objects.enums import RiskLevel, Severity, Trend
from app.infrastructure.ml.artifact_integrity import (
    ArtifactIntegrityError,
    load_with_integrity_check,
)

# Tolerance maximale à la part synthétique du corpus avant d'activer le ML en prod.
# Documenté par Phase 0 de l'audit : si le corpus est majoritairement synthétique,
# la prediction ML ne vaut pas mieux que l'heuristique métier.
ML_SYNTHETIC_TOLERANCE_PCT: float = 50.0

logger = get_logger("ml_predictor")

# Ordre canonique des features temporelles ; doit matcher temporal_training_metadata.json
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
    """Charge l'artefact temporel entraine et fait l'inference reelle.

    Ne depend que de SQLAlchemy (deja present) : aucun import joblib au
    chargement du module pour eviter de casser les tests qui n'ont pas
    l'artefact. Le chargement est lazy, cache en memoire.
    """

    def __init__(self, settings, database) -> None:
        self._settings = settings
        self._database = database
        self._artifact_path = Path(settings.models_dir) / "gap_predictor_temporal.joblib"
        self._metadata_path = Path(settings.models_dir) / "temporal_training_metadata.json"
        self._risk_artifact_path = Path(settings.models_dir) / "risk_classifier.joblib"
        self._risk_metadata_path = Path(settings.models_dir) / "risk_training_metadata.json"
        self.relevance_artifact_path = Path(settings.models_dir) / "relevance_model.joblib"
        self.relevance_metadata_path = Path(settings.models_dir) / "relevance_training_metadata.json"
        # gap_predictor_temporal : désactivé volontairement (audit DSI, corpus 98% synthétique).
        # Le modèle n'est PAS chargé ; _predict_gaps retourne None => fallback métier documenté.
        self._model: Any | None = None
        self._gap_model_enabled: bool = False  # audit : gap predictor retiré (voir docstring module)
        self._metadata: dict[str, Any] | None = None
        self._risk_model: Any | None = None
        self._risk_metadata: dict[str, Any] | None = None
        self._relevance_model: Any | None = None
        self._relevance_metadata: dict[str, Any] | None = None
        self._load_attempted = False
        self._risk_load_attempted = False
        self._relevance_load_attempted = False
        # Kill-switch global (audit DSI 3.3) : ML_ENABLED=false -> AUCUN artefact
        # chargé, fallback règles métier sur toute la surface d'appel.
        self._ml_enabled: bool = bool(getattr(settings, "ml_enabled", True))

    # ------------------------------------------------------------------ API
    def predict_gaps(self, teacher_id: str) -> list[SkillGap] | None:
        if not self.available():
            return None
        try:
            return self._predict_gaps(teacher_id)
        except Exception as exc:  # pragma: no cover - log + fallback
            logger.error("predict_gaps ML echoue, fallback heuristique", error=str(exc))
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
        available = self.available()
        meta = self._metadata or {}
        return {
            "name": "gap_predictor_temporal",
            "available": available,
            "kill_switch": not self._ml_enabled,
            "mode": "ML" if available else "HEURISTIC_FALLBACK",
            "version": meta.get("trained_at") or "unknown",
            "model_name": meta.get("model_name", "gradient_boosting"),
            "n_features": meta.get("n_features", len(TEMPORAL_FEATURE_COLS)),
            "drift_check": self._artifact_drift_check(self._metadata),
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
        """Contrôle de dérive PASSIF basé sur les métadonnées d'entraînement.

        Sans flux de données fraîches (la base analyse est actuellement
        inatteignable), un contrôle statistique complet est impossible. Ce
        check alerte sur les indicateurs documentés dans les métadonnées :
        - part synthétique du corpus > tolérance -> le modèle est disqualifié ;
        - âge du modèle > 90 jours -> recommandation de ré-entraînement ;
        - absence de métadonnées -> artefact non traçable.
        """
        if not meta:
            return {"checked": True, "drift_detected": True, "reasons": ["metadata absente — artefact non traçable"]}
        reasons: list[str] = []
        data_src = meta.get("data_sources") or {}
        synth_share = float(data_src.get("synthetic_share_pct", 0.0) or 0.0)
        if synth_share > ML_SYNTHETIC_TOLERANCE_PCT:
            reasons.append(
                f"corpus {synth_share:.1f}% synthétique (tolérance {ML_SYNTHETIC_TOLERANCE_PCT:.0f}%) "
                "— prédiction disqualifiée, fallback règle métier"
            )
        trained_at = meta.get("trained_at")
        if trained_at:
            try:
                days = (datetime.now() - datetime.fromisoformat(trained_at)).days
                if days > 90:
                    reasons.append(f"modèle âgé de {days} jours — ré-entraînement requis")
            except (TypeError, ValueError):
                reasons.append("trained_at illisible — fraîcheur indéterminée")
        return {
            "checked": True,
            "drift_detected": bool(reasons),
            "reasons": reasons,
        }

    # ------------------------------------------------------------ Interne
    def available(self) -> bool:
        if not self._ml_enabled:
            return False
        if not self._load_attempted:
            self._load()
        return self._model is not None

    def _load(self) -> None:
        """Charge le gap predictor temporel — DÉSACTIVÉ par audit (corpus 98% synthétique).

        Conformément à la décision d'audit DSI (point 1.1), le gap predictor
        n'est plus chargé en production. Pour le ré-activer après constitution
        d'un historique temporel réel suffisant :
            1. peupler competence.enseignant_competences avec snapshots datés
               (actuellement ~105 lignes pour 36 enseignants — insuffisant),
            2. ré-entraîner le modèle,
            3. basculer `self._gap_model_enabled = True` dans __init__.
        """
        self._load_attempted = True
        if not self._gap_model_enabled:
            logger.info(
                "gap predictor temporel DESACTIVE par audit — fallback métier automatique",
                path=str(self._artifact_path),
            )
            return
        if not self._artifact_path.exists():
            logger.warning("artefact ML introuvable", path=str(self._artifact_path))
            return
        try:
            # Intégrité d'abord — refuse de charger un artefact non signé.
            self._model = load_with_integrity_check(self._artifact_path)
            if self._metadata_path.exists():
                self._metadata = json.loads(self._metadata_path.read_text(encoding="utf-8"))
            else:
                self._metadata = {}
            logger.info(
                "modele ML charge",
                path=str(self._artifact_path),
                n_features=getattr(self._model, "n_features_in_", None),
            )
        except ArtifactIntegrityError as exc:
            logger.error("artefact ML refuse pour integrite non validee", error=str(exc))
            self._model = None
        except Exception as exc:  # pragma: no cover
            logger.error("chargement modele ML impossible", error=str(exc))
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
        """Construit X (n_competences, n_features), les ids de competences et le target brut.

        Retourne aussi le niveau requis brut par competence pour recalculer le gap.
        """
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
        # Target brut = niveau requis max par competence (pour recalcul du gap)
        required_by_comp = np.array([
            max(
                (int(s["required_level"]) if s["required_level"] else 0)
                for s in savs_by_comp[cid]
            ) or 3
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
        # 4 points temporels (t-3..t) ; a defaut de 4 points, propagation
        # arriere de la valeur la plus ancienne.
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
    def _predict_gaps(self, teacher_id: str) -> Optional[list[SkillGap]]:
        """Calcule SkillGap par compétence. Deux chemins, jamais mélangés :

        1) ML actif : la metadata du modèle déclare une part synthétique
           supportable (<= ML_SYNTHETIC_TOLERANCE_PCT) — on utilise la
           prédiction du modèle comme estimation de `gap_next_3m`, puis on la
           borne selon le niveau requis *courant* lu depuis la base.
           L'incertitude ML est propagée via `trend=Trend.DECLARED_ML`.
        2) Fallback : si le modèle est indisponible ou son corpus trop
           synthétique, on retourne None au caller et l'heuristique métier
           (GapEngine) reste la source de vérité.
        """
        bundle = self._teacher_feature_bundle(teacher_id)
        X, comp_ids, required_by_comp = self._build_feature_matrix(bundle)
        if X.shape[0] == 0:
            return []
        ranges = (self._metadata or {}).get("feature_ranges", {})
        xn = self._normalize(X, ranges)

        meta = self._metadata or {}
        data_sources = meta.get("data_sources") or {}
        synth_share = float(data_sources.get("synthetic_share_pct", 100.0))
        if synth_share > ML_SYNTHETIC_TOLERANCE_PCT:
            logger.warning(
                "gap_predictor ml désactivé : corpus trop synthétique",
                synthetic_share_pct=synth_share,
                tolerance=ML_SYNTHETIC_TOLERANCE_PCT,
            )
            return None  # déclenche le fallback chez l'appelant

        ml_pred = np.clip(self._model.predict(xn), 0.0, 5.0)

        # Récupère code/nom des compétences
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
            # Gap_structural = ce que l'heuristique affiche déjà (référence métier).
            structural_gap = max(0.0, required - current_t)

            # Le modèle prédit gap_next_3m ; on l'aggrège avec le structural
            # du jour pour donner une vue prospective, sans dépasser les
            # bornes métier [0..5].
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
            trend = Trend.DECLARED_ML
            if predicted_future_gap > structural_gap + 0.5:
                trend = Trend.WORSENING
            elif predicted_future_gap < structural_gap - 0.5:
                trend = Trend.IMPROVING
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

    # ------------------------------------------------------- Risk ML dédié
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
            logger.info(
                "modele risque ML charge",
                path=str(self._risk_artifact_path),
                n_teachers=(self._risk_metadata or {}).get("n_teachers"),
            )
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
            # Limite documentée : classe CRITICAL sous-représentée (1 exemple,
            # F1=0.0). Un warning est exposé pour le dashboard / l'observabilité.
            "warning_critical_class": (
                "La classe CRITICAL du risk_classifier n'est PAS fiable "
                "(1 seul échantillon d'entraînement, F1=0.0). "
                "Une règle métier déterministe (>=3 gaps critiques) reste appliquée."
                if available else None
            ),
            "f1_per_class": f1_per_class,
        }

    def _predict_risk_ml(self, teacher_id: str) -> RiskProfile:
        """Classifier dedie : RandomForest entraine sur risk_training_metadata."""
        bundle = self._teacher_feature_bundle(teacher_id)
        gaps = self._predict_gaps(teacher_id)

        # Features du classifier (doivent matcher RISK_FEATURES du pipeline)
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
            # Features derivees
            n_crit / max(1.0, float(n_tot)),
            1.0 if n_crit > 0 else 0.0,
            1.0 if bundle["attendance"] < 0.5 else 0.0,
            1.0 if streak > 6 else 0.0,
        ]], dtype=float)

        proba = self._risk_model.predict_proba(features)[0]
        classes = list(self._risk_model.classes_)
        midpoints = {"LOW": 10.0, "MEDIUM": 37.5, "HIGH": 62.5, "CRITICAL": 87.5}

        # Score = esperance des midpoints + bonus si une classe severe a une
        # proba significative + bonus business : presence de gaps CRITIQUES.
        # Le lissage RF sur 36 echantillons sous-estime ; on le compense via
        # le signal non-ambigu des gaps.
        expected = float(np.dot(proba, [midpoints.get(c, 40.0) for c in classes]))
        bonus = 0.0
        if "CRITICAL" in classes and proba[classes.index("CRITICAL")] >= 0.2:
            bonus += 15.0
        elif "HIGH" in classes and proba[classes.index("HIGH")] >= 0.4:
            bonus += 8.0
        bonus += min(30.0, n_crit * 7.0)  # chaque gap critique pousse le score
        risk_score = round(min(100.0, expected + bonus), 2)

        # Mapping classe prédite du modèle
        pred_label = classes[int(np.argmax(proba))]
        level = {"LOW": RiskLevel.LOW, "MEDIUM": RiskLevel.MEDIUM,
                 "HIGH": RiskLevel.HIGH, "CRITICAL": RiskLevel.CRITICAL}.get(pred_label, RiskLevel.MEDIUM)

        # RÈGLE MÉTIER DE SÉCURITÉ (documentée — cf. docs/THRESHOLDS_AND_RISK_POLICY.md) :
        # le RandomForest a été entraîné sur 36 échantillons dont 1 seul CRITICAL
        # (F1=0.0 sur cette classe, cf. risk_training_metadata.json). La classe
        # CRITICAL n'est donc pas fiable statistiquement. En compensation, une
        # règle déterministe indépendante du ML : ≥3 gaps critiques observés
        # => niveau CRITICAL, quelque soit la prédiction ML.
        # Cette règle est EXPOSÉE dans les facteurs (feature="critical_gaps_rule")
        # afin qu'elle reste traçable et non silencieuse.
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
        # Facteurs lisibles par les humains (en plus des probas)
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

    @staticmethod
    def _stagnation_months(bundle: dict[str, Any]) -> float:
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
            logger.info("modele pertinence ML charge", path=str(self.relevance_artifact_path))
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
        """Retourne le score de pertinence ML [0..1] ou None si artefact absent.

        Features reconstruites a la volee pour le couple (teacher, formation).
        En cas d'echec, retourne None pour que ranking_service conserve son
        score heuristique (rank_score classique).
        """
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

        # Jours depuis derniere acquisition
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


def _safe_eval(row) -> tuple[float, int]:
    if not row:
        return 0.0, 0
    avg = float(row["avg_score"]) if row["avg_score"] is not None else 0.0
    return avg, int(row["nb"] or 0)


def _safe_needs(row) -> tuple[int, int]:
    if not row:
        return 0, 0
    return int(row["nb"] or 0), int(row["nb_approuves"] or 0)
