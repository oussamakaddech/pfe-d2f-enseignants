"""DashboardEngine — calcule les KPIs et les persiste dans dashboard_snapshots."""

import logging
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import Integer, func
from sqlalchemy.orm import Session

from app.core.db import db_session as _db_session, execute_query
from app.models.db_models import (
    AlertEvent, DashboardSnapshot, ModelRetrainingLog, Recommendation,
    SkillGap, TeacherRiskProfile, TrainingPathItem,
)
from app.services.data_service import ALL_ENSEIGNANTS_QUERY, DataService

logger = logging.getLogger(__name__)


class DashboardEngine:
    """Calcule les 6 KPIs du tableau de bord prédictif.

    Uses DashboardSnapshot table as cache to avoid recomputing
    KPIs on every request when data hasn't changed.
    """

    def __init__(self, db: Session):
        self.db = db

    def get_cached(self, max_age_hours: int = 6) -> dict[str, Any] | None:
        """Return cached dashboard if fresh enough, else None."""
        cutoff = datetime.now(timezone.utc) - timedelta(hours=max_age_hours)
        snap = (
            self.db.query(DashboardSnapshot)
            .filter(
                DashboardSnapshot.scope == "GLOBAL",
                DashboardSnapshot.snapshot_date >= cutoff.date(),
            )
            .order_by(DashboardSnapshot.snapshot_date.desc())
            .first()
        )
        if snap and snap.kpis_json:
            return {**snap.kpis_json, "_cached": True}
        return None

    def _safe(self, name: str, fn, default: Any) -> Any:
        """Exécute un calcul de KPI en isolant ses erreurs.

        Un KPI défaillant (ex. table source absente) ne doit pas faire échouer
        l'ensemble du tableau de bord : on journalise et on renvoie un défaut.
        """
        try:
            return fn()
        except Exception as exc:  # noqa: BLE001 — résilience volontaire par KPI
            logger.warning("KPI '%s' indisponible : %s", name, exc)
            return default

    def compute_all(self) -> dict[str, Any]:
        kpis = {
            "competences_en_declin":         self._safe("competences_en_declin", self.competences_en_declin, []),
            "competences_en_demande":        self._safe("competences_en_demande", self.competences_en_demande, []),
            "enseignants_a_risque":          self._safe("enseignants_a_risque", self.enseignants_a_risque, []),
            "taux_couverture_departements":  self._safe("taux_couverture_departements", self.taux_couverture_departements, []),
            "top_formations_recommandees":   self._safe("top_formations_recommandees", self.top_formations_recommandees, []),
            "alertes_recentes":              self._safe("alertes_recentes", self.alertes_recentes, []),
            "department_gap_heatmap":        self._safe("department_gap_heatmap", self.department_gap_heatmap, []),
            "training_effectiveness":        self._safe("training_effectiveness", self.training_effectiveness, []),
            "monthly_risk_evolution":        self._safe("monthly_risk_evolution", self.monthly_risk_evolution, []),
            "model_performance":             self._safe("model_performance", self.model_performance, {}),
            "generated_at":                  date.today().isoformat(),
        }
        # Persistance du snapshot en cache — best-effort : ne doit jamais faire
        # échouer le calcul du tableau de bord renvoyé à l'appelant.
        try:
            existing = (
                self.db.query(DashboardSnapshot)
                .filter_by(scope="GLOBAL", scope_id=None, snapshot_date=date.today())
                .first()
            )
            if existing:
                existing.kpis_json = kpis
            else:
                self.db.add(DashboardSnapshot(
                    scope         = "GLOBAL",
                    scope_id      = None,
                    snapshot_date = date.today(),
                    kpis_json     = kpis,
                ))
            self.db.flush()
        except Exception as exc:  # noqa: BLE001 — cache best-effort
            logger.warning("Persistance du snapshot dashboard échouée : %s", exc)
        return kpis

    # ── KPI 1 : Compétences en déclin ────────────────────────
    def competences_en_declin(self) -> list[dict]:
        """Compétences dont le niveau moyen a baissé sur 6 mois."""
        today      = date.today()
        six_months = today - timedelta(days=180)

        # Niveaux actuels (30 derniers jours)
        recent = (
            self.db.query(
                SkillGap.competence_id,
                SkillGap.competence_nom,
                SkillGap.domaine_nom,
                func.avg(SkillGap.niveau_actuel).label("niveau_moy_actuel"),
            )
            .filter(SkillGap.computed_at >= today - timedelta(days=30))
            .group_by(SkillGap.competence_id, SkillGap.competence_nom, SkillGap.domaine_nom)
            .all()
        )

        # Niveaux il y a 6 mois (±30 jours)
        old = (
            self.db.query(
                SkillGap.competence_id,
                func.avg(SkillGap.niveau_actuel).label("niveau_moy_ancien"),
            )
            .filter(
                SkillGap.computed_at >= six_months - timedelta(days=30),
                SkillGap.computed_at <  six_months + timedelta(days=30),
            )
            .group_by(SkillGap.competence_id)
            .all()
        )
        old_index = {r.competence_id: float(r.niveau_moy_ancien) for r in old}

        result = []
        for r in recent:
            cid = r.competence_id
            niv_act = float(r.niveau_moy_actuel)
            niv_anc = old_index.get(cid, niv_act)
            delta = niv_act - niv_anc
            if delta < -0.3:
                result.append({
                    "competence_id":  cid,
                    "competence_nom": r.competence_nom,
                    "domaine_nom":    r.domaine_nom,
                    "niveau_actuel":  round(niv_act, 2),
                    "niveau_ancien":  round(niv_anc, 2),
                    "delta":          round(delta, 2),
                })
        result.sort(key=lambda x: x["delta"])
        return result[:10]

    # ── KPI 2 : Compétences en forte demande ─────────────────
    def competences_en_demande(self) -> list[dict]:
        """Compétences avec le plus de gaps + besoins exprimés."""
        stats = (
            self.db.query(
                SkillGap.competence_id,
                SkillGap.competence_nom,
                SkillGap.domaine_nom,
                func.count(SkillGap.id).label("nb_gaps"),
                func.sum(
                    func.cast(SkillGap.niveau_urgence == "CRITIQUE", Integer)
                ).label("nb_critiques"),
                func.avg(SkillGap.nb_besoins_exprimes).label("nb_besoins_moy"),
            )
            .filter(SkillGap.computed_at >= date.today() - timedelta(days=30))
            .group_by(SkillGap.competence_id, SkillGap.competence_nom, SkillGap.domaine_nom)
            .all()
        )

        total_enseignants = max(
            self.db.query(func.count(func.distinct(SkillGap.enseignant_id))).scalar() or 1, 1
        )

        result = []
        for s in stats:
            nb_gaps     = int(s.nb_gaps or 0)
            nb_crit     = int(s.nb_critiques or 0)
            nb_besoins  = float(s.nb_besoins_moy or 0.0)
            score_dem   = round(
                (nb_gaps / total_enseignants) * 0.50
                + (nb_besoins / 5.0) * 0.30
                + (nb_crit / total_enseignants) * 0.20,
                4,
            )
            result.append({
                "competence_id":  s.competence_id,
                "competence_nom": s.competence_nom,
                "domaine_nom":    s.domaine_nom,
                "nb_gaps":        nb_gaps,
                "nb_critiques":   nb_crit,
                "score_demande":  score_dem,
            })

        result.sort(key=lambda x: x["score_demande"], reverse=True)
        return result[:10]

    # ── KPI 3 : Enseignants à risque ─────────────────────────
    def enseignants_a_risque(self, seuil: float = 0.50) -> list[dict]:
        rows = (
            self.db.query(TeacherRiskProfile)
            .filter(TeacherRiskProfile.score_risque >= seuil)
            .order_by(TeacherRiskProfile.score_risque.desc())
            .limit(20)
            .all()
        )
        return [
            {
                "enseignant_id":    r.enseignant_id,
                "score_risque":     float(r.score_risque),
                "niveau_risque":    r.niveau_risque,
                "tendance":         r.tendance,
                "nb_gaps_critiques": r.nb_gaps_critiques,
                "facteurs_risque":  r.facteurs_risque or [],
            }
            for r in rows
        ]

    # ── KPI 4 : Taux de couverture par département ───────────
    def taux_couverture_departements(self) -> list[dict]:
        """% d'enseignants par dept avec niveau_actuel >= niveau_requis."""
        rows = (
            self.db.query(
                SkillGap.enseignant_id,
                SkillGap.competence_id,
                SkillGap.niveau_actuel,
                SkillGap.niveau_requis,
            )
            .filter(SkillGap.computed_at >= date.today() - timedelta(days=30))
            .all()
        )

        # Build enseignant → departement mapping from the shared DB
        ens_dept_map: dict[str, str] = {}
        try:
            with _db_session() as s:
                all_ens = execute_query(s, ALL_ENSEIGNANTS_QUERY, {})
            for e in all_ens:
                ens_dept_map[str(e.get("enseignant_id", ""))] = str(
                    e.get("departement_id") or "non_affecte"
                )
        except Exception as exc:
            logger.warning("Failed to load enseignant→dept map: %s", exc)
            ens_dept_map = {}

        total     = defaultdict(int)
        couverts  = defaultdict(int)
        for r in rows:
            dept = ens_dept_map.get(str(r.enseignant_id), "non_affecte")
            total[dept]    += 1
            if r.niveau_actuel >= r.niveau_requis:
                couverts[dept] += 1

        return [
            {
                "departement": k,
                "taux_couverture": round(couverts[k] / max(total[k], 1) * 100, 1),
                "nb_evalues": total[k],
            }
            for k in sorted(total.keys())
        ]

    # ── KPI 5 : Top formations recommandées ──────────────────
    def top_formations_recommandees(self) -> list[dict]:
        rows = (
            self.db.query(
                Recommendation.formation_id,
                Recommendation.formation_titre,
                func.count(Recommendation.id).label("nb_recommandations"),
                func.avg(Recommendation.score_global).label("score_moy"),
                func.avg(Recommendation.probabilite_reussite).label("proba_moy"),
            )
            .filter(Recommendation.created_at >= date.today() - timedelta(days=30))
            .group_by(Recommendation.formation_id, Recommendation.formation_titre)
            .order_by(func.count(Recommendation.id).desc())
            .limit(10)
            .all()
        )
        return [
            {
                "formation_id":       r.formation_id,
                "formation_titre":    r.formation_titre,
                "nb_recommandations": int(r.nb_recommandations),
                "score_moyen":        round(float(r.score_moy or 0), 3),
                "proba_reussite_moy": round(float(r.proba_moy or 0), 3),
            }
            for r in rows
        ]

    # ── KPI 6 : Alertes récentes ─────────────────────────────
    def alertes_recentes(self, limit: int = 20) -> list[dict]:
        rows = (
            self.db.query(AlertEvent)
            .filter(
                AlertEvent.statut.in_(["NOUVELLE", "LUE"]),
                AlertEvent.severite.in_(["WARNING", "CRITICAL"]),
            )
            .order_by(AlertEvent.created_at.desc())
            .limit(limit)
            .all()
        )
        return [
            {
                "id":            r.id,
                "type_alerte":   r.type_alerte,
                "severite":      r.severite,
                "titre":         r.titre,
                "enseignant_id": r.enseignant_id,
                "created_at":    r.created_at.isoformat() if r.created_at else None,
            }
            for r in rows
        ]

    # ── Helper : mapping enseignant → département ─────────────
    def _ens_dept_map(self) -> dict[str, str]:
        ens_dept_map: dict[str, str] = {}
        try:
            with _db_session() as s:
                all_ens = execute_query(s, ALL_ENSEIGNANTS_QUERY, {})
            for e in all_ens:
                ens_dept_map[str(e.get("enseignant_id", ""))] = str(
                    e.get("departement_id") or "non_affecte"
                )
        except Exception as exc:
            logger.warning("Failed to load enseignant→dept map: %s", exc)
        return ens_dept_map

    # ── KPI 7 : Heatmap des gaps département × compétence ────
    def department_gap_heatmap(self) -> list[dict]:
        """Gap moyen par couple (département, compétence) — détecte les angles morts collectifs."""
        rows = (
            self.db.query(
                SkillGap.enseignant_id,
                SkillGap.competence_id,
                SkillGap.competence_nom,
                SkillGap.gap_score,
            )
            .filter(SkillGap.computed_at >= date.today() - timedelta(days=30))
            .all()
        )
        ens_dept_map = self._ens_dept_map()

        agg: dict[tuple[str, int], dict[str, Any]] = {}
        for r in rows:
            dept = ens_dept_map.get(str(r.enseignant_id), "non_affecte")
            key = (dept, r.competence_id)
            bucket = agg.setdefault(key, {
                "departement":    dept,
                "competence_id":  r.competence_id,
                "competence_nom": r.competence_nom,
                "_sum":           0.0,
                "_n":             0,
            })
            bucket["_sum"] += float(r.gap_score or 0.0)
            bucket["_n"]   += 1

        result = []
        for cell in agg.values():
            n = max(cell.pop("_n"), 1)
            avg_gap = cell.pop("_sum") / n
            result.append({
                **cell,
                "avg_gap":           round(avg_gap, 3),
                "enseignants_count": n,
            })
        result.sort(key=lambda x: x["avg_gap"], reverse=True)
        return result

    # ── KPI 8 : Efficacité des formations ────────────────────
    def training_effectiveness(self) -> list[dict]:
        """Efficacité par formation : gain de niveau planifié × taux de complétion réel."""
        # Gain de niveau planifié (analytics) par formation.
        gain_rows = (
            self.db.query(
                TrainingPathItem.formation_id,
                TrainingPathItem.formation_titre,
                func.avg(TrainingPathItem.niveau_apres - TrainingPathItem.niveau_avant).label("avg_gain"),
                func.count(TrainingPathItem.id).label("nb_items"),
            )
            .group_by(TrainingPathItem.formation_id, TrainingPathItem.formation_titre)
            .all()
        )
        gain_index = {
            int(g.formation_id): {
                "formation_titre": g.formation_titre,
                "avg_level_gain":  round(float(g.avg_gain or 0.0), 2),
                "nb_recommandee":  int(g.nb_items or 0),
            }
            for g in gain_rows
        }

        # Taux de complétion réel (base partagée).
        completion_index: dict[int, float] = {}
        try:
            with _db_session() as s:
                for c in DataService(s).get_formation_completion():
                    fid = int(c["formation_id"])
                    nb = int(c.get("nb_inscriptions") or 0)
                    completion_index[fid] = round(
                        int(c.get("nb_completed") or 0) / nb, 3
                    ) if nb else 0.0
        except Exception as exc:
            logger.warning("Failed to load formation completion: %s", exc)

        formation_ids = set(gain_index) | set(completion_index)
        result = []
        for fid in formation_ids:
            g = gain_index.get(fid, {})
            result.append({
                "formation_id":    fid,
                "formation_titre": g.get("formation_titre", f"Formation {fid}"),
                "avg_level_gain":  g.get("avg_level_gain", 0.0),
                "completion_rate": completion_index.get(fid, 0.0),
                "nb_recommandee":  g.get("nb_recommandee", 0),
            })
        result.sort(key=lambda x: (x["avg_level_gain"], x["completion_rate"]), reverse=True)
        return result[:20]

    # ── KPI 9 : Évolution mensuelle du risque ────────────────
    def monthly_risk_evolution(self, months: int = 6) -> list[dict]:
        """Nombre d'alertes critiques / élevées par mois (série temporelle)."""
        cutoff = date.today() - timedelta(days=months * 31)
        month_expr = func.to_char(AlertEvent.created_at, "YYYY-MM")
        rows = (
            self.db.query(
                month_expr.label("mois"),
                func.sum(func.cast(AlertEvent.severite == "CRITICAL", Integer)).label("critical"),
                func.sum(func.cast(AlertEvent.severite == "WARNING", Integer)).label("high"),
            )
            .filter(AlertEvent.created_at >= cutoff)
            .group_by(month_expr)
            .order_by(month_expr)
            .all()
        )
        return [
            {
                "month":    r.mois,
                "critical": int(r.critical or 0),
                "high":     int(r.high or 0),
            }
            for r in rows
        ]

    # ── KPI 10 : Performance du modèle ───────────────────────
    def model_performance(self) -> dict[str, Any]:
        """Accuracy du modèle de gap + dernier ré-entraînement (spec §4)."""
        from app.services.model_trainer import read_current_accuracy

        gap_accuracy = read_current_accuracy()

        # Indice de pertinence des recommandations : proba de réussite moyenne
        # des recommandations récentes (proxy faute de vérité terrain).
        reco_proba = (
            self.db.query(func.avg(Recommendation.probabilite_reussite))
            .filter(Recommendation.created_at >= date.today() - timedelta(days=30))
            .scalar()
        )

        last_log = (
            self.db.query(ModelRetrainingLog)
            .filter(ModelRetrainingLog.statut == "success")
            .order_by(ModelRetrainingLog.retrained_at.desc())
            .first()
        )

        return {
            "gap_model_accuracy":       round(float(gap_accuracy), 3) if gap_accuracy is not None else None,
            "recommendation_avg_proba": round(float(reco_proba), 3) if reco_proba is not None else None,
            "last_retrained":           last_log.retrained_at.isoformat() if last_log and last_log.retrained_at else None,
            "last_retrain_status":      last_log.statut if last_log else None,
        }
