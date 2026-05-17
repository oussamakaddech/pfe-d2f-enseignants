"""DashboardEngine — calcule les KPIs et les persiste dans dashboard_snapshots."""

import logging
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import Integer, func
from sqlalchemy.orm import Session

from app.core.db import db_session as _db_session, execute_query
from app.models.db_models import (
    AlertEvent, DashboardSnapshot, Recommendation,
    SkillGap, TeacherRiskProfile,
)
from app.services.data_service import ALL_ENSEIGNANTS_QUERY

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

    def compute_all(self, formations: list[dict] | None = None) -> dict[str, Any]:
        kpis = {
            "competences_en_declin":         self.competences_en_declin(),
            "competences_en_demande":        self.competences_en_demande(),
            "enseignants_a_risque":          self.enseignants_a_risque(),
            "taux_couverture_departements":  self.taux_couverture_departements(),
            "top_formations_recommandees":   self.top_formations_recommandees(),
            "alertes_recentes":              self.alertes_recentes(),
            "generated_at":                  date.today().isoformat(),
        }
        snap = DashboardSnapshot(
            scope         = "GLOBAL",
            scope_id      = None,
            snapshot_date = date.today(),
            kpis_json     = kpis,
        )
        # Upsert
        existing = (
            self.db.query(DashboardSnapshot)
            .filter_by(scope="GLOBAL", scope_id=None, snapshot_date=date.today())
            .first()
        )
        if existing:
            existing.kpis_json = kpis
        else:
            self.db.add(snap)
        self.db.flush()
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
