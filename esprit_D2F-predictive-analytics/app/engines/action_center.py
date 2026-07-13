"""ActionCenter — alertes intelligentes et recommandations actionnables.

Transforme les données brutes (alertes, profils de risque, gaps, recommandations)
en vues décisionnelles :
- `alert_summary()`        — agrégats d'alertes + tendance 30 jours
- `bulk_update()`          — triage de masse des alertes
- `priority_actions()`     — file d'actions priorisée (qui contacter, quoi proposer)
- `batch_recommendations()`— recommandations agrégées sur une cohorte

Conçu pour être résilient sur une base vide : chaque méthode renvoie un défaut
neutre plutôt que de lever, conformément au reste du service.
"""

import logging
from collections import defaultdict
from datetime import date, timedelta
from typing import Any, Optional

from sqlalchemy import Integer, func
from sqlalchemy.orm import Session

from app.engines.dashboard_engine import DashboardEngine
from app.models.db_models import (
    AlertEvent, Recommendation, SkillGap, TeacherRiskProfile,
)

logger = logging.getLogger(__name__)

VALID_ALERT_STATUTS = {"NOUVELLE", "LUE", "TRAITEE", "IGNOREE", "ESCALADEE"}
_OPEN_ALERT_STATUTS = ("NOUVELLE", "LUE")
_OPEN_RECO_STATUTS = ("PROPOSEE", "ACCEPTEE")
_SEVERITY_WEIGHT = {"CRITICAL": 1.0, "WARNING": 0.6, "INFO": 0.3}


class ActionCenter:
    def __init__(self, db: Session):
        self.db = db
        self._dashboard = DashboardEngine(db)

    def _safe(self, name: str, fn, default: Any) -> Any:
        try:
            return fn()
        except Exception as exc:  # noqa: BLE001 — résilience volontaire
            logger.warning("Action '%s' indisponible : %s", name, exc)
            return default

    # ── Synthèse des alertes ─────────────────────────────────
    def alert_summary(self) -> dict[str, Any]:
        return {
            "by_type":      self._safe("by_type", lambda: self._count_by(AlertEvent.type_alerte), []),
            "by_severite":  self._safe("by_severite", lambda: self._count_by(AlertEvent.severite), []),
            "by_statut":    self._safe("by_statut", lambda: self._count_by(AlertEvent.statut), []),
            "total":        self._safe("total", self._total_alerts, 0),
            "nouvelles":    self._safe("nouvelles", self._nb_nouvelles, 0),
            "critiques_ouvertes": self._safe("critiques_ouvertes", self._nb_critiques_ouvertes, 0),
            "top_competences":    self._safe("top_competences", self._top_competences, []),
            "top_departements":   self._safe("top_departements", self._top_departements, []),
            "trend_30j":    self._safe("trend_30j", self._trend_30j, []),
        }

    def _count_by(self, column) -> list[dict[str, Any]]:
        rows = (
            self.db.query(column.label("k"), func.count(AlertEvent.id).label("n"))
            .group_by(column)
            .order_by(func.count(AlertEvent.id).desc())
            .all()
        )
        return [{"key": r.k, "count": int(r.n or 0)} for r in rows]

    def _total_alerts(self) -> int:
        return int(self.db.query(func.count(AlertEvent.id)).scalar() or 0)

    def _nb_nouvelles(self) -> int:
        return int(
            self.db.query(func.count(AlertEvent.id))
            .filter(AlertEvent.statut == "NOUVELLE").scalar() or 0
        )

    def _nb_critiques_ouvertes(self) -> int:
        return int(
            self.db.query(func.count(AlertEvent.id))
            .filter(
                AlertEvent.severite == "CRITICAL",
                AlertEvent.statut.in_(_OPEN_ALERT_STATUTS),
            ).scalar() or 0
        )

    def _top_competences(self, limit: int = 10) -> list[dict[str, Any]]:
        from sqlalchemy import text
        rows = self.db.execute(
            text("""
                SELECT ae.competence_id,
                       COALESCE(c.nom, 'Compétence ' || ae.competence_id) AS competence_nom,
                       COUNT(ae.id) AS n
                FROM alert_events ae
                LEFT JOIN competences c ON c.id = ae.competence_id
                WHERE ae.competence_id IS NOT NULL
                GROUP BY ae.competence_id, c.nom
                ORDER BY COUNT(ae.id) DESC
                LIMIT :lim
            """),
            {"lim": limit},
        ).fetchall()
        return [
            {"competence_id": r[0], "competence_nom": r[1], "count": int(r[2] or 0)}
            for r in rows
        ]

    def _top_departements(self, limit: int = 10) -> list[dict[str, Any]]:
        from sqlalchemy import text
        rows = self.db.execute(
            text("""
                SELECT ae.departement_id,
                       COALESCE(d.libelle, ae.departement_id) AS departement_nom,
                       COUNT(ae.id) AS n
                FROM alert_events ae
                LEFT JOIN departements d ON d.id = ae.departement_id
                WHERE ae.departement_id IS NOT NULL
                GROUP BY ae.departement_id, d.libelle
                ORDER BY COUNT(ae.id) DESC
                LIMIT :lim
            """),
            {"lim": limit},
        ).fetchall()
        return [
            {"departement_id": r[0], "departement_nom": r[1], "count": int(r[2] or 0)}
            for r in rows
        ]

    def _trend_30j(self) -> list[dict[str, Any]]:
        cutoff = date.today() - timedelta(days=30)
        day_expr = func.to_char(AlertEvent.created_at, "YYYY-MM-DD")
        rows = (
            self.db.query(
                day_expr.label("jour"),
                func.count(AlertEvent.id).label("total"),
                func.sum(func.cast(AlertEvent.severite == "CRITICAL", Integer)).label("critiques"),
            )
            .filter(AlertEvent.created_at >= cutoff)
            .group_by(day_expr)
            .order_by(day_expr)
            .all()
        )
        return [
            {"date": r.jour, "total": int(r.total or 0), "critiques": int(r.critiques or 0)}
            for r in rows
        ]

    # ── Triage de masse ──────────────────────────────────────
    def bulk_update(
        self,
        alert_ids: list[int],
        statut: str,
        traite_par: Optional[str] = None,
        commentaire: Optional[str] = None,
    ) -> dict[str, Any]:
        statut_norm = (statut or "").upper()
        if statut_norm not in VALID_ALERT_STATUTS:
            raise ValueError(f"Statut invalide: {statut}")
        if not alert_ids:
            return {"statut": statut_norm, "nb_demande": 0, "nb_modifie": 0, "introuvables": []}

        found = self.db.query(AlertEvent).filter(AlertEvent.id.in_(alert_ids)).all()
        found_ids = set()
        for alert in found:
            alert.statut = statut_norm
            if traite_par is not None:
                alert.traite_par = traite_par
            if commentaire is not None:
                alert.commentaire_traitement = commentaire
            found_ids.add(alert.id)
        self.db.commit()

        introuvables = [i for i in alert_ids if i not in found_ids]
        return {
            "statut":       statut_norm,
            "nb_demande":   len(alert_ids),
            "nb_modifie":   len(found_ids),
            "introuvables": introuvables,
        }

    # ── File d'actions priorisée ─────────────────────────────
    def priority_actions(
        self, limit: int = 20, departement_id: Optional[str] = None,
    ) -> list[dict[str, Any]]:
        ens_dept_map = self._dashboard._ens_dept_map() if departement_id else {}

        # On élargit la fenêtre quand un filtre département est posé pour ne pas
        # rater des enseignants après filtrage côté application.
        fetch = limit * 3 if departement_id else limit
        risk_rows = (
            self.db.query(TeacherRiskProfile)
            .order_by(TeacherRiskProfile.score_risque.desc())
            .limit(max(fetch, limit))
            .all()
        )

        # Résolution des noms enseignants en un seul appel (batch) pour éviter
        # N requêtes individuelles dans _build_action.
        from app.routers.all import _fetch_teacher_names
        names = _fetch_teacher_names(self.db, [r.enseignant_id for r in risk_rows])

        actions = []
        for r in risk_rows:
            if departement_id and ens_dept_map.get(str(r.enseignant_id)) != departement_id:
                continue
            actions.append(self._build_action(r, names.get(r.enseignant_id)))
            if len(actions) >= limit:
                break

        actions.sort(key=lambda a: a["score_action"], reverse=True)
        return actions

    def _build_action(self, risk: TeacherRiskProfile, teacher_name: str | None = None) -> dict[str, Any]:
        eid = risk.enseignant_id
        top_gap = (
            self.db.query(SkillGap)
            .filter(SkillGap.enseignant_id == eid)
            .order_by(SkillGap.priorite_score.desc())
            .first()
        )
        best_reco = (
            self.db.query(Recommendation)
            .filter(
                Recommendation.enseignant_id == eid,
                Recommendation.statut.in_(_OPEN_RECO_STATUTS),
            )
            .order_by(Recommendation.score_global.desc())
            .first()
        )
        nb_alertes = int(
            self.db.query(func.count(AlertEvent.id))
            .filter(
                AlertEvent.enseignant_id == eid,
                AlertEvent.statut.in_(_OPEN_ALERT_STATUTS),
            ).scalar() or 0
        )

        score_risque = float(risk.score_risque or 0.0)
        gap_priorite = float(top_gap.priorite_score) if top_gap else 0.0
        pression_alertes = min(nb_alertes / 5.0, 1.0)
        score_action = round(
            0.6 * score_risque + 0.3 * gap_priorite + 0.1 * pression_alertes, 4
        )

        meilleure_formation = None
        impact_estime = None
        if best_reco:
            meilleure_formation = {
                "formation_id":         best_reco.formation_id,
                "formation_titre":      best_reco.formation_titre,
                "probabilite_reussite": float(best_reco.probabilite_reussite or 0.0),
                "score_global":         float(best_reco.score_global or 0.0),
            }
            if best_reco.niveau_apres is not None and top_gap is not None:
                impact_estime = max(0, int(best_reco.niveau_apres) - int(top_gap.niveau_actuel))

        # Dernière formation recommandée (la plus récente par date de création).
        last_reco = (
            self.db.query(Recommendation)
            .filter(Recommendation.enseignant_id == eid)
            .order_by(Recommendation.created_at.desc())
            .first()
        )
        derniere_formation = None
        if last_reco:
            derniere_formation = {
                "formation_titre": last_reco.formation_titre,
                "date":            last_reco.created_at.isoformat() if last_reco.created_at else None,
                "statut":          last_reco.statut,
            }

        # Historique de risque (évolution + complétion + stagnation).
        historique = {
            "score_precedent":  float(risk.precedent_score_risque) if risk.precedent_score_risque is not None else None,
            "taux_completion":  float(risk.taux_completion_formations or 0.0),
            "nb_mois_stagnation": risk.nb_mois_stagnation_max or 0,
            "tendance":         risk.tendance,
            "analyse_le":       risk.computed_at.isoformat() if risk.computed_at else None,
        }

        return {
            "enseignant_id":       eid,
            "teacher_name":        teacher_name or eid,
            "score_action":        score_action,
            "score_risque":        round(score_risque, 4),
            "niveau_risque":       risk.niveau_risque,
            "tendance":            risk.tendance,
            "nb_gaps_critiques":   risk.nb_gaps_critiques,
            "nb_alertes_ouvertes": nb_alertes,
            "competence_prioritaire": {
                "competence_id":  top_gap.competence_id,
                "competence_nom": top_gap.competence_nom,
                "niveau_actuel":  top_gap.niveau_actuel,
                "niveau_requis":  top_gap.niveau_requis,
            } if top_gap else None,
            "action_recommandee":  self._action_text(risk.niveau_risque, best_reco is not None),
            "meilleure_formation": meilleure_formation,
            "impact_estime_niveaux": impact_estime,
            "historique":          historique,
            "derniere_formation":  derniere_formation,
        }

    @staticmethod
    def _action_text(niveau_risque: str | None, has_reco: bool) -> str:
        niveau = (niveau_risque or "FAIBLE").upper()
        if niveau == "CRITIQUE":
            base = "Planifier un entretien individuel sous 7 jours"
        elif niveau == "ELEVE":
            base = "Proposer une formation prioritaire"
        elif niveau == "MODERE":
            base = "Suivre la progression au prochain point"
        else:
            base = "Aucune action urgente"
        if has_reco and niveau in ("CRITIQUE", "ELEVE"):
            base += " — formation recommandée disponible"
        return base

    # ── Recommandations agrégées (cohorte) ───────────────────
    def batch_recommendations(
        self,
        teacher_ids: Optional[list[str]] = None,
        departement_id: Optional[str] = None,
        top_n: int = 20,
    ) -> dict[str, Any]:
        target_ids = self._resolve_cohort(teacher_ids, departement_id)

        q = self.db.query(Recommendation).filter(
            Recommendation.statut.in_(_OPEN_RECO_STATUTS)
        )
        if target_ids is not None:
            if not target_ids:
                return {"nb_enseignants": 0, "recommendations": []}
            q = q.filter(Recommendation.enseignant_id.in_(target_ids))
        else:
            q = q.filter(Recommendation.created_at >= date.today() - timedelta(days=90))

        rows = q.all()

        agg: dict[int, dict[str, Any]] = {}
        enseignants: set[str] = set()
        for rec in rows:
            enseignants.add(rec.enseignant_id)
            bucket = agg.setdefault(rec.formation_id, {
                "formation_id":    rec.formation_id,
                "formation_titre": rec.formation_titre,
                "formation_type":  rec.formation_type,
                "_proba_sum":      0.0,
                "_score_sum":      0.0,
                "_n":              0,
                "_competences":    set(),
                "_enseignants":    set(),
            })
            bucket["_proba_sum"] += float(rec.probabilite_reussite or 0.0)
            bucket["_score_sum"] += float(rec.score_global or 0.0)
            bucket["_n"] += 1
            if rec.competence_id:
                bucket["_competences"].add(int(rec.competence_id))
            bucket["_enseignants"].add(rec.enseignant_id)

        result = []
        for b in agg.values():
            n = max(b["_n"], 1)
            result.append({
                "formation_id":            b["formation_id"],
                "formation_titre":         b["formation_titre"],
                "formation_type":          b["formation_type"],
                "nb_enseignants_concernes": len(b["_enseignants"]),
                "probabilite_reussite_moyenne": round(b["_proba_sum"] / n, 4),
                "score_global_moyen":      round(b["_score_sum"] / n, 4),
                "competences_ciblees":     sorted(b["_competences"]),
            })
        result.sort(
            key=lambda x: (x["nb_enseignants_concernes"], x["probabilite_reussite_moyenne"]),
            reverse=True,
        )
        return {
            "nb_enseignants": len(enseignants),
            "recommendations": result[:top_n],
        }

    def _resolve_cohort(
        self, teacher_ids: Optional[list[str]], departement_id: Optional[str],
    ) -> Optional[list[str]]:
        """Retourne la liste d'IDs ciblée, ou None pour « tous (90 derniers jours) »."""
        if teacher_ids:
            return [str(t) for t in teacher_ids]
        if departement_id:
            ens_dept_map = self._dashboard._ens_dept_map()
            return [eid for eid, dept in ens_dept_map.items() if dept == departement_id]
        return None
