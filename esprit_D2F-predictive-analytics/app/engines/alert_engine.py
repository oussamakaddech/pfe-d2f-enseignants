"""AlertEngine — détection automatique des besoins selon 6 règles (Section 2C)."""

import logging
from datetime import date, datetime, timezone
from typing import Any

from sqlalchemy.orm import Session

from app.models.db_models import AlertEvent, SkillGap

logger = logging.getLogger(__name__)

# Seuils configurables
SEUIL_STAGNATION_WARNING   = 6    # mois
SEUIL_STAGNATION_CRITIQUE  = 12   # mois
SEUIL_COMPLETION_FAIBLE    = 40.0 # %
SEUIL_NB_FORMATIONS_MIN    = 3    # pour déclencher alerte completion
SEUIL_BESOIN_JOURS         = 30   # jours sans suite
SEUIL_DEPT_NB_ENSEIGNANTS  = 3    # min pour alerte collective
SEUIL_DEPT_PCT             = 0.30 # 30% du dept


class AlertEngine:
    """Évalue les 6 règles de détection et persiste les AlertEvent."""

    def __init__(self, db: Session):
        self.db = db

    def detect_and_save(
        self,
        enseignant_id: str,
        gaps: list[SkillGap],
        teacher_profile: dict,
        besoins: list[dict],
        departement_id: str | None,
        dept_stats: dict | None = None,
    ) -> list[AlertEvent]:
        """
        dept_stats : {'competence_id': {'nb_critique': int, 'nb_total': int}}
        """
        alerts: list[AlertEvent] = []

        for gap in gaps:
            alerts += self._r1_gap_critique(enseignant_id, gap)
            alerts += self._r2_stagnation(enseignant_id, gap)
            alerts += self._r3_regression(enseignant_id, gap)

        alerts += self._r4_completion_faible(enseignant_id, teacher_profile)
        alerts += self._r6_besoin_non_couvert(enseignant_id, besoins)

        if dept_stats and departement_id:
            alerts += self._r5_tendance_dept(departement_id, dept_stats)

        # Déduplique : ne pas recréer une alerte NOUVELLE déjà active
        saved: list[AlertEvent] = []
        for alert in alerts:
            duplicate = self._find_active_duplicate(alert)
            if not duplicate:
                self.db.add(alert)
                saved.append(alert)

        self.db.flush()
        logger.info("AlertEngine: %d alertes sauvegardées pour %s", len(saved), enseignant_id)
        return saved

    # ── Règle R1 : Gap critique ──────────────────────────────
    def _r1_gap_critique(self, enseignant_id: str, gap: SkillGap) -> list[AlertEvent]:
        if gap.niveau_urgence != "CRITIQUE":
            return []
        return [AlertEvent(
            type_alerte   = "GAP_CRITIQUE",
            cible_type    = "INDIVIDUEL",
            enseignant_id = enseignant_id,
            competence_id = gap.competence_id,
            skill_gap_id  = gap.id,
            severite      = "CRITICAL",
            titre         = f"Gap critique — {gap.competence_nom}",
            message       = (
                f"Niveau actuel {gap.niveau_actuel}/5, requis {gap.niveau_requis}/5 "
                f"sur la compétence « {gap.competence_nom} ». "
                f"Score priorité : {round(float(gap.priorite_score), 2)}."
            ),
            details_json  = {
                "gap_score":      float(gap.gap_score),
                "priorite_score": float(gap.priorite_score),
                "niveau_actuel":  gap.niveau_actuel,
                "niveau_requis":  gap.niveau_requis,
            },
        )]

    # ── Règle R2 : Stagnation ────────────────────────────────
    def _r2_stagnation(self, enseignant_id: str, gap: SkillGap) -> list[AlertEvent]:
        if gap.mois_stagnation < SEUIL_STAGNATION_WARNING or float(gap.gap_score) == 0:
            return []
        severite = "CRITICAL" if gap.mois_stagnation >= SEUIL_STAGNATION_CRITIQUE else "WARNING"
        return [AlertEvent(
            type_alerte   = "STAGNATION",
            cible_type    = "INDIVIDUEL",
            enseignant_id = enseignant_id,
            competence_id = gap.competence_id,
            skill_gap_id  = gap.id,
            severite      = severite,
            titre         = f"Stagnation — {gap.competence_nom}",
            message       = (
                f"Aucune progression sur « {gap.competence_nom} » "
                f"depuis {gap.mois_stagnation} mois."
            ),
            details_json  = {"mois_stagnation": gap.mois_stagnation},
        )]

    # ── Règle R3 : Régression ────────────────────────────────
    def _r3_regression(self, enseignant_id: str, gap: SkillGap) -> list[AlertEvent]:
        if not gap.en_regression:
            return []
        return [AlertEvent(
            type_alerte   = "REGRESSION",
            cible_type    = "INDIVIDUEL",
            enseignant_id = enseignant_id,
            competence_id = gap.competence_id,
            skill_gap_id  = gap.id,
            severite      = "CRITICAL",
            titre         = f"Régression détectée — {gap.competence_nom}",
            message       = (
                f"Baisse de niveau constatée sur « {gap.competence_nom} ». "
                f"Niveau actuel : {gap.niveau_actuel}/5."
            ),
            details_json  = {"niveau_actuel": gap.niveau_actuel},
        )]

    # ── Règle R4 : Complétion faible ─────────────────────────
    def _r4_completion_faible(self, enseignant_id: str, profile: dict) -> list[AlertEvent]:
        nb_inscrites  = int(profile.get("nb_formations_in_progress", 0) or 0)
        nb_completees = int(profile.get("nb_formations_completed", 0) or 0)
        total = nb_inscrites + nb_completees
        if total < SEUIL_NB_FORMATIONS_MIN:
            return []
        taux = nb_completees / total * 100
        if taux >= SEUIL_COMPLETION_FAIBLE:
            return []
        return [AlertEvent(
            type_alerte   = "COMPLETION_FAIBLE",
            cible_type    = "INDIVIDUEL",
            enseignant_id = enseignant_id,
            severite      = "WARNING",
            titre         = "Taux de complétion des formations insuffisant",
            message       = (
                f"Taux de complétion : {round(taux, 1)}% "
                f"({nb_completees}/{total} formations)."
            ),
            details_json  = {"taux_completion": round(taux, 1), "nb_total": total},
        )]

    # ── Règle R5 : Tendance département ──────────────────────
    def _r5_tendance_dept(
        self, departement_id: str, dept_stats: dict
    ) -> list[AlertEvent]:
        alerts = []
        for cid, stats in dept_stats.items():
            nb_critique = int(stats.get("nb_critique", 0))
            nb_total    = int(stats.get("nb_total", 1))
            competence_nom = stats.get("competence_nom", f"Compétence {cid}")
            if nb_critique < SEUIL_DEPT_NB_ENSEIGNANTS:
                continue
            pct = nb_critique / max(nb_total, 1)
            if pct < SEUIL_DEPT_PCT:
                continue
            alerts.append(AlertEvent(
                type_alerte    = "TENDANCE_DEPARTEMENT",
                cible_type     = "COLLECTIF",
                departement_id = departement_id,
                competence_id  = int(cid),
                severite       = "WARNING",
                titre          = f"Tendance critique département — {competence_nom}",
                message        = (
                    f"{round(pct * 100, 1)}% des enseignants du département "
                    f"ont un gap critique sur « {competence_nom} »."
                ),
                details_json   = {
                    "nb_critique": nb_critique,
                    "nb_total":    nb_total,
                    "pct":         round(pct, 4),
                },
            ))
        return alerts

    # ── Règle R6 : Besoin non couvert ────────────────────────
    def _r6_besoin_non_couvert(
        self, enseignant_id: str, besoins: list[dict]
    ) -> list[AlertEvent]:
        alerts = []
        today  = date.today()
        for b in besoins:
            priorite = b.get("priorite", "BASSE")
            if priorite not in ("HAUTE", "CRITIQUE"):
                continue
            approuve_cup = b.get("approuve_cup") or b.get("approuveCUP")
            if approuve_cup:
                continue
            refresh = b.get("last_refresh_date") or b.get("lastRefreshDate")
            jours = 0
            if refresh:
                if isinstance(refresh, datetime):
                    jours = (today - refresh.date()).days
                elif isinstance(refresh, date):
                    jours = (today - refresh).days
            if jours < SEUIL_BESOIN_JOURS:
                continue
            titre = b.get("titre") or b.get("theme") or "Besoin sans titre"
            alerts.append(AlertEvent(
                type_alerte   = "BESOIN_NON_COUVERT",
                cible_type    = "INDIVIDUEL",
                enseignant_id = enseignant_id,
                severite      = "INFO",
                titre         = f"Besoin prioritaire non traité — {titre[:80]}",
                message       = (
                    f"Besoin de formation « {titre} » (priorité {priorite}) "
                    f"exprimé il y a {jours} jours sans approbation CUP."
                ),
                details_json  = {
                    "id_besoin": b.get("id_besoin_formation"),
                    "priorite":  priorite,
                    "jours":     jours,
                },
            ))
        return alerts

    # ── Déduplication ────────────────────────────────────────
    def _find_active_duplicate(self, alert: AlertEvent) -> AlertEvent | None:
        q = (
            self.db.query(AlertEvent)
            .filter(
                AlertEvent.type_alerte  == alert.type_alerte,
                AlertEvent.cible_type   == alert.cible_type,
                AlertEvent.statut.in_(["NOUVELLE", "LUE"]),
            )
        )
        if alert.enseignant_id:
            q = q.filter(AlertEvent.enseignant_id == alert.enseignant_id)
        if alert.competence_id:
            q = q.filter(AlertEvent.competence_id == alert.competence_id)
        return q.first()
