"""DashboardEngine — calcule les KPIs et les persiste dans dashboard_snapshots."""

import logging
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import Integer, func, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.orm import Session

from app.core.db import db_session as _db_session, execute_query
from app.core.observability import safe_kpi
from app.models.db_models import (
    AlertEvent, DashboardSnapshot, ModelRetrainingLog, Recommendation,
    SkillGap, TeacherCompetenceCoverage, TeacherRiskProfile, TrainingPathItem,
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
        # Fenêtre temporelle courante (injectée par compute_all depuis les
        # query params periode_debut / periode_fin du endpoint /dashboard/global).
        self._fin = datetime.now(timezone.utc)
        self._cutoff = self._fin - timedelta(days=30)
        self._window_days = 30

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
        """Exécute un calcul de KPI en isolant ses erreurs."""
        return safe_kpi(name, fn, default, logger)

    def compute_all(self, periode_debut=None, periode_fin=None) -> dict[str, Any]:
        # Fenêtre temporelle (filtre 7j / 30j / trimestre / semestre).
        fin = periode_fin or datetime.now(timezone.utc)
        debut = periode_debut or (fin - timedelta(days=30))
        self._fin = fin
        self._cutoff = debut
        self._window_days = max((fin - debut).days, 1)

        kpis = self._safe("real_kpis", self.real_kpis, {
            "nb_enseignants_suivis": 0,
            "score_risque_moyen": 0,
            "nb_gaps_critiques": 0,
            "nb_alertes_nouvelles": 0,
            "taux_couverture_global": 0,
            "nb_regression": 0,
            "nb_stagnation": 0,
            "besoins_critiques_non_satisfaits": 0,
            "alertes_critiques_ouvertes": 0,
        })
        kpis = {
            **kpis,
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
    def competences_en_declin(
        self, departement_id: str | None = None, up_id: str | None = None,
    ) -> list[dict]:
        """Compétences dont le niveau moyen a baissé sur 6 mois.

        Filtrable par département / UP (F7) : on restreint aux enseignants du
        périmètre via une sous-requête sur la table ``enseignants``.
        """
        today      = date.today()
        six_months = today - timedelta(days=180)

        ens_filter: list[str] | None = None
        if departement_id or up_id:
            cond = ["deleted_at IS NULL"]
            params: dict[str, Any] = {}
            if departement_id:
                cond.append("dept_id = :dept")
                params["dept"] = departement_id
            if up_id:
                cond.append("up_id = :up")
                params["up"] = up_id
            rows = self.db.execute(
                text("SELECT id FROM enseignants WHERE " + " AND ".join(cond)),
                params,
            ).fetchall()
            ens_filter = [str(r[0]) for r in rows]

        # Niveaux actuels (30 derniers jours)
        q_recent = (
            self.db.query(
                SkillGap.competence_id,
                SkillGap.competence_nom,
                SkillGap.domaine_nom,
                func.avg(SkillGap.niveau_actuel).label("niveau_moy_actuel"),
            )
            .filter(SkillGap.computed_at >= today - timedelta(days=30))
        )
        # Niveaux il y a 6 mois (±30 jours)
        q_old = (
            self.db.query(
                SkillGap.competence_id,
                func.avg(SkillGap.niveau_actuel).label("niveau_moy_ancien"),
            )
            .filter(
                SkillGap.computed_at >= six_months - timedelta(days=30),
                SkillGap.computed_at <  six_months + timedelta(days=30),
            )
        )
        if ens_filter is not None:
            q_recent = q_recent.filter(SkillGap.enseignant_id.in_(ens_filter))
            q_old = q_old.filter(SkillGap.enseignant_id.in_(ens_filter))

        recent = q_recent.group_by(
            SkillGap.competence_id, SkillGap.competence_nom, SkillGap.domaine_nom
        ).all()
        old = q_old.group_by(SkillGap.competence_id).all()
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
            .filter(SkillGap.computed_at >= self._cutoff)
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
        if not rows:
            return []
        ids = [r.enseignant_id for r in rows]
        # Import tardif : évite un cycle d'import engine ↔ router au chargement.
        from app.routers.all import _build_signals_from_factors, _fetch_teacher_info
        info = _fetch_teacher_info(self.db, ids)

        result: list[dict] = []
        for r in rows:
            # ``facteurs_risque`` est persisté comme un dict
            # {"factors": {...}, "contributions": {...}, "weights": {...}} par le
            # pipeline (analytics._upsert_risk_profile). L'ancien test
            # ``isinstance(list)`` renvoyait donc toujours [] — bug corrigé ici en
            # dérivant les signaux depuis le dict, comme les autres dashboards.
            factors = r.facteurs_risque if isinstance(r.facteurs_risque, dict) else {}
            factor_details = factors.get("factors", {})
            signals = _build_signals_from_factors(
                factor_details.get("no_training", 0),
                factor_details.get("stagnation", 0),
                r.nb_gaps_critiques or 0,
                factor_details.get("unmet_needs", 0),
            )
            t_info = info.get(r.enseignant_id, {})
            teacher_name = t_info.get("teacher_name", r.enseignant_id)
            result.append({
                "enseignant_id":     r.enseignant_id,
                "teacher_name":      teacher_name,
                "nom":               teacher_name,
                "departement":       t_info.get("department"),
                "up":                t_info.get("up"),
                "score_risque":      float(r.score_risque),
                "niveau_risque":     r.niveau_risque,
                "tendance":          r.tendance,
                "nb_gaps_critiques": r.nb_gaps_critiques,
                "facteurs_risque":   signals,
            })
        return result

    # ── KPI 4 : Taux de couverture par département ───────────
    def taux_couverture_departements(self) -> list[dict]:
        """% de couples (enseignant, compétence) au niveau requis, par département.

        Calculé depuis ``teacher_competence_coverage`` (snapshot des niveaux réels),
        et NON depuis ``skill_gaps`` qui ne contient que les écarts.
        """
        rows = (
            self.db.query(
                TeacherCompetenceCoverage.departement_id,
                func.count(TeacherCompetenceCoverage.id).label("total"),
                func.sum(
                    func.cast(TeacherCompetenceCoverage.covered, Integer)
                ).label("couverts"),
            )
            .group_by(TeacherCompetenceCoverage.departement_id)
            .all()
        )

        result = []
        for r in rows:
            dept = r.departement_id or "non_affecte"
            total = int(r.total or 0)
            couverts = int(r.couverts or 0)
            if total == 0:
                continue
            result.append({
                "departement": dept,
                "taux_couverture": round(couverts / total * 100, 1),
                "nb_evalues": total,
            })
        return sorted(result, key=lambda x: x["departement"])

    # ── KPI 5 : Top formations recommandées (enrichies) ─────
    def top_formations_recommandees(self) -> list[dict]:
        rows = (
            self.db.query(
                Recommendation.formation_id,
                Recommendation.formation_titre,
                func.count(Recommendation.id).label("nb_recommandations"),
                func.count(func.distinct(Recommendation.enseignant_id)).label("nb_enseignants"),
                func.avg(Recommendation.score_global).label("score_moy"),
                func.avg(Recommendation.probabilite_reussite).label("proba_moy"),
            )
            .filter(Recommendation.created_at >= self._cutoff)
            .group_by(Recommendation.formation_id, Recommendation.formation_titre)
            .order_by(func.count(Recommendation.id).desc())
            .limit(10)
            .all()
        )
        fids = [r.formation_id for r in rows]
        if not fids:
            return []

        recs = (
            self.db.query(
                Recommendation.formation_id,
                Recommendation.enseignant_id,
                Recommendation.competence_id,
            )
            .filter(Recommendation.formation_id.in_(fids), Recommendation.created_at >= self._cutoff)
            .all()
        )

        # Mapping compétence_id → nom (depuis skill_gaps qui porte le libellé).
        cids = {int(r.competence_id) for r in recs}
        comp_noms: dict[int, str] = {}
        if cids:
            comp_rows = (
                self.db.query(SkillGap.competence_id, SkillGap.competence_nom)
                .filter(SkillGap.competence_id.in_(cids))
                .distinct()
                .all()
            )
            comp_noms = {int(c.competence_id): c.competence_nom for c in comp_rows}

        ens_ids = {str(r.enseignant_id) for r in recs}
        from app.routers.all import _fetch_teacher_info
        info = _fetch_teacher_info(self.db, list(ens_ids)) if ens_ids else {}

        agg: dict[Any, dict[str, set]] = {fid: {"ens": set(), "comp": set()} for fid in fids}
        for r in recs:
            a = agg[r.formation_id]
            a["ens"].add(str(r.enseignant_id))
            a["comp"].add(int(r.competence_id))

        result = []
        for r in rows:
            fid = r.formation_id
            a = agg[fid]
            depts = sorted(
                {info.get(e, {}).get("department") for e in a["ens"] if info.get(e, {}).get("department")}
            )
            comps = sorted({comp_noms.get(c, f"Compétence {c}") for c in a["comp"]})
            # Impact estimé = gap moyen (sévérité) des compétences ciblées chez les
            # enseignants ciblés → proxy de baisse de risque si la formation est suivie.
            impact = 0.0
            if a["ens"] and a["comp"]:
                impact_val = (
                    self.db.query(func.avg(SkillGap.gap_score))
                    .filter(
                        SkillGap.enseignant_id.in_(list(a["ens"])),
                        SkillGap.competence_id.in_(list(a["comp"])),
                        SkillGap.computed_at >= self._cutoff,
                    )
                    .scalar()
                )
                impact = float(impact_val or 0.0)
            result.append({
                "formation_id":       fid,
                "formation_titre":    r.formation_titre,
                "nb_recommandations": int(r.nb_recommandations),
                "enseignants_cibles": len(a["ens"]),
                "departements":       depts,
                "competences_couvertes": comps,
                "impact_estime":      round(impact, 3),
                "score_moyen":        round(float(r.score_moy or 0), 3),
                "proba_reussite_moy": round(float(r.proba_moy or 0), 3),
            })
        return result

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
    _ens_dept_cache: dict[str, str] | None = None

    def _ens_dept_map(self) -> dict[str, str]:
        if self._ens_dept_cache is not None:
            return self._ens_dept_cache
        ens_dept_map: dict[str, str] = {}
        try:
            all_ens = execute_query(self.db, ALL_ENSEIGNANTS_QUERY, {})
            for e in all_ens:
                ens_dept_map[str(e.get("enseignant_id", ""))] = str(
                    e.get("departement_id") or "non_affecte"
                )
        except Exception as exc:
            logger.warning("Failed to load enseignant→dept map: %s", exc)
        self._ens_dept_cache = ens_dept_map
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
            .filter(SkillGap.computed_at >= self._cutoff)
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

    # ── Drill-down : enseignants impactés par une cellule heatmap ──
    def teachers_by_cell(
        self, departement: str, competence_id: int, limit: int = 50
    ) -> list[dict]:
        """Enseignants ayant un gap sur (departement × competence), triés par gravité."""
        from app.routers.all import _fetch_teacher_info

        rows = (
            self.db.query(
                SkillGap.enseignant_id,
                func.avg(SkillGap.gap_score).label("avg_gap"),
                func.max(SkillGap.niveau_urgence).label("urgence"),
            )
            .filter(
                SkillGap.competence_id == competence_id,
                SkillGap.computed_at >= self._cutoff,
            )
            .group_by(SkillGap.enseignant_id)
            .all()
        )
        ens_dept_map = self._ens_dept_map()
        ids = [r.enseignant_id for r in rows]
        info = _fetch_teacher_info(self.db, ids) if ids else {}
        result = []
        for r in rows:
            dept = ens_dept_map.get(str(r.enseignant_id), "non_affecte")
            if departement and departement != "non_affecte" and dept != departement:
                continue
            t = info.get(r.enseignant_id, {})
            result.append({
                "enseignant_id": r.enseignant_id,
                "nom": t.get("teacher_name", r.enseignant_id),
                "departement": t.get("department"),
                "up": t.get("up"),
                "gap_moyen": round(float(r.avg_gap or 0), 3),
                "urgence": r.urgence,
            })
        result.sort(key=lambda x: x["gap_moyen"], reverse=True)
        return result[:limit]

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
            for c in DataService(self.db).get_formation_completion():
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
            .filter(Recommendation.created_at >= self._cutoff)
            .scalar()
        )

        # Le journal de ré-entraînement est une info auxiliaire : s'il est
        # indisponible (table absente sur une base pas encore migrée, etc.),
        # on dégrade proprement plutôt que de faire échouer tout l'endpoint.
        try:
            last_log = (
                self.db.query(ModelRetrainingLog)
                .filter(ModelRetrainingLog.statut == "success")
                .order_by(ModelRetrainingLog.retrained_at.desc())
                .first()
            )
        except SQLAlchemyError as exc:
            logger.warning("Journal de ré-entraînement indisponible : %s", exc)
            self.db.rollback()
            last_log = None

        # Fallback: if the metadata file is missing (ephemeral container),
        # read accuracy from the most recent successful retrain log in DB.
        if gap_accuracy is None and last_log and last_log.accuracy_after is not None:
            gap_accuracy = float(last_log.accuracy_after)

        return {
            "gap_model_accuracy":       round(float(gap_accuracy), 3) if gap_accuracy is not None else None,
            "recommendation_avg_proba": round(float(reco_proba), 3) if reco_proba is not None else None,
            "last_retrained":           last_log.retrained_at.isoformat() if last_log and last_log.retrained_at else None,
            "last_retrain_status":      last_log.statut if last_log else None,
        }

    # ── KPIs réels dérivés des données disponibles ──────────
    # Calculés même quand teacher_risk_profiles est vide (avant toute analyse),
    # à partir de skill_gaps, alertes et teacher_competence_coverage.
    def real_kpis(self) -> dict[str, Any]:
        # Enseignants réellement suivis = ceux présents dans la couverture.
        nb_suivis = (
            self.db.query(
                func.count(func.distinct(TeacherCompetenceCoverage.enseignant_id))
            ).scalar() or 0
        )
        if nb_suivis == 0:
            # Fallback : enseignants ayant au moins un gap calculé.
            nb_suivis = (
                self.db.query(func.count(func.distinct(SkillGap.enseignant_id)))
                .filter(SkillGap.computed_at >= self._cutoff)
                .scalar() or 0
            )

        # Gaps critiques (score >= 0.7) sur 30 jours.
        nb_gaps_critiques = (
            self.db.query(func.count(SkillGap.id))
            .filter(
                SkillGap.computed_at >= self._cutoff,
                SkillGap.gap_score >= 0.7,
            )
            .scalar() or 0
        )

        # Score de risque moyen proxy = gap moyen pondéré par les gaps critiques.
        avg_gap = (
            self.db.query(func.avg(SkillGap.gap_score))
            .filter(SkillGap.computed_at >= self._cutoff)
            .scalar()
        )
        score_risque_moyen = round(float(avg_gap or 0.0), 2)

        # Taux de couverture global (couples enseignant×compétence au niveau requis).
        cov = (
            self.db.query(
                func.count(TeacherCompetenceCoverage.id),
                func.sum(func.cast(TeacherCompetenceCoverage.covered, Integer)),
            ).first()
        )
        total_cov = int(cov[0] or 0)
        couverts = int(cov[1] or 0)
        taux_couverture = round(couverts / total_cov * 100, 1) if total_cov else 0.0

        # Alertes nouvelles (non traitées) sur la fenêtre.
        nb_alertes = (
            self.db.query(func.count(AlertEvent.id))
            .filter(
                AlertEvent.statut.in_(["NOUVELLE", "LUE"]),
                AlertEvent.created_at >= self._cutoff,
            )
            .scalar() or 0
        )

        # Enseignants en régression (gap en_regression = True) sur la fenêtre.
        nb_regression = (
            self.db.query(func.count(func.distinct(SkillGap.enseignant_id)))
            .filter(SkillGap.computed_at >= self._cutoff, SkillGap.en_regression.is_(True))
            .scalar() or 0
        )

        # Enseignants en stagnation (>= 3 mois sans progression).
        nb_stagnation = (
            self.db.query(func.count(func.distinct(SkillGap.enseignant_id)))
            .filter(SkillGap.computed_at >= self._cutoff, SkillGap.mois_stagnation >= 3)
            .scalar() or 0
        )

        # Besoins critiques non satisfaits (gaps urgence CRITIQUE sur la fenêtre).
        besoins_critiques = (
            self.db.query(func.count(SkillGap.id))
            .filter(
                SkillGap.computed_at >= self._cutoff,
                SkillGap.niveau_urgence == "CRITIQUE",
            )
            .scalar() or 0
        )

        # Alertes critiques ouvertes (CRITICAL, non traitées).
        alertes_critiques = (
            self.db.query(func.count(AlertEvent.id))
            .filter(
                AlertEvent.severite == "CRITICAL",
                AlertEvent.statut.in_(["NOUVELLE", "LUE"]),
            )
            .scalar() or 0
        )

        return {
            "nb_enseignants_suivis":              int(nb_suivis),
            "score_risque_moyen":                 score_risque_moyen,
            "nb_gaps_critiques":                  int(nb_gaps_critiques),
            "nb_alertes_nouvelles":               int(nb_alertes),
            "taux_couverture_global":             taux_couverture,
            "nb_regression":                      int(nb_regression),
            "nb_stagnation":                      int(nb_stagnation),
            "besoins_critiques_non_satisfaits":   int(besoins_critiques),
            "alertes_critiques_ouvertes":         int(alertes_critiques),
        }
