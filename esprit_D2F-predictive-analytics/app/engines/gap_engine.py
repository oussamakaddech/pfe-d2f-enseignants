"""GapEngine — calcule les SkillGap pour un enseignant (algorithmes Section 2A)."""

import logging
from datetime import date, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.engines.feature_engine import NIVEAU_MAP, niveau_to_int
from app.models.db_models import SkillGap

logger = logging.getLogger(__name__)

# Seuils (alignés Section 2C)
SEUIL_STAGNATION_CRITIQUE = 12  # mois
SEUIL_GAP_CRITIQUE = 0.75
SEUIL_GAP_HAUTE    = 0.50
SEUIL_GAP_MODEREE  = 0.25


def _classify_urgence(priorite_score: float) -> str:
    if priorite_score >= SEUIL_GAP_CRITIQUE:
        return "CRITIQUE"
    if priorite_score >= SEUIL_GAP_HAUTE:
        return "HAUTE"
    if priorite_score >= SEUIL_GAP_MODEREE:
        return "MODEREE"
    return "FAIBLE"


def _compute_mois_stagnation(enseignant_id: str, competence_id: int, db: Session) -> int:
    """Compte les mois depuis le dernier changement de niveau pour cette compétence."""
    last = (
        db.query(SkillGap)
        .filter_by(enseignant_id=enseignant_id, competence_id=competence_id)
        .order_by(SkillGap.computed_at.desc())
        .first()
    )
    if not last:
        return 0
    delta = date.today() - last.computed_at.date()
    return delta.days // 30


def _detect_regression(enseignant_id: str, competence_id: int, niveau_actuel: int, db: Session) -> bool:
    last = (
        db.query(SkillGap)
        .filter_by(enseignant_id=enseignant_id, competence_id=competence_id)
        .order_by(SkillGap.computed_at.desc())
        .first()
    )
    if not last:
        return False
    return niveau_actuel < int(last.niveau_actuel)


class GapEngine:
    """Calcule les gaps de compétences et les persiste en base."""

    def __init__(self, db: Session):
        self.db = db

    def compute_gaps(
        self,
        enseignant_id: str,
        competence_levels: list[dict],
        required_levels: list[dict],
        besoins: list[dict],
        prediction_result_id: int | None,
        domaine_demand: dict[int, float],
        total_enseignants: int,
    ) -> list[SkillGap]:
        """
        Calcule un SkillGap par compétence et le persiste.
        domaine_demand : {competence_id → poids_demande 0-1}
        """

        # Index: (competence_id, savoir_id) → niveau_actuel max
        current_index: dict[int, int] = {}
        last_eval_index: dict[int, date | None] = {}
        for row in competence_levels:
            cid = row.get("competence_id")
            if not cid:
                continue
            cid = int(cid)
            n = niveau_to_int(row.get("current_level"))
            current_index[cid] = max(current_index.get(cid, 0), n)
            acq = row.get("date_acquisition") or row.get("created_at")
            # Normalize datetime → date so all values stored are comparable.
            if isinstance(acq, datetime):
                acq = acq.date()
            if isinstance(acq, date):
                prev = last_eval_index.get(cid)
                last_eval_index[cid] = max(prev, acq) if prev else acq

        # Index: competence_id → niveau_requis max
        required_index: dict[int, dict] = {}
        for row in required_levels:
            cid = row.get("competence_id")
            if not cid:
                continue
            cid = int(cid)
            n_req = niveau_to_int(row.get("required_level"))
            if cid not in required_index or n_req > required_index[cid]["niveau"]:
                required_index[cid] = {
                    "niveau": n_req,
                    "nom":    row.get("competence_nom", f"Competence {cid}"),
                    "domaine_id":  row.get("domaine_id"),
                    "domaine_nom": row.get("domaine_nom"),
                }

        # Comptage besoins par compétence (fuzzy via theme/titre)
        besoin_count: dict[int, int] = {}
        for b in besoins:
            titre_b = (b.get("theme") or b.get("titre") or "").lower()
            for cid, info in required_index.items():
                nom_c = info["nom"].lower()
                if any(word in titre_b for word in nom_c.split() if len(word) > 3):
                    besoin_count[cid] = besoin_count.get(cid, 0) + 1

        gaps: list[SkillGap] = []

        for cid, req_info in required_index.items():
            niveau_requis = req_info["niveau"]
            if niveau_requis == 0:
                continue

            niveau_actuel = current_index.get(cid, 0)
            gap_brut = max(0.0, (niveau_requis - niveau_actuel) / 5.0)

            if gap_brut == 0.0:
                continue  # pas de gap

            # ── Urgence ──────────────────────────────────
            mois_stag = _compute_mois_stagnation(enseignant_id, cid, self.db)
            en_regres = _detect_regression(enseignant_id, cid, niveau_actuel, self.db)
            nb_besoins_c = besoin_count.get(cid, 0)

            urgence_score = min(1.0,
                (mois_stag / SEUIL_STAGNATION_CRITIQUE)
                + (0.3 if en_regres else 0.0)
                + (nb_besoins_c / 5) * 0.2
            )

            # ── Impact ───────────────────────────────────
            poids_domaine    = domaine_demand.get(cid, 0.0)
            niveau_vise      = min(5, niveau_requis + 1)
            poids_niv_vise   = niveau_vise / 5.0
            # compétences bloquées : simplification — ratio besoins
            poids_bloquants  = min(1.0, nb_besoins_c / 3.0)

            impact_score = (
                poids_domaine  * 0.4
                + poids_niv_vise * 0.3
                + poids_bloquants * 0.3
            )

            # ── Priorité ─────────────────────────────────
            priorite_score = round(
                gap_brut      * 0.45
                + urgence_score * 0.35
                + impact_score  * 0.20,
                4,
            )

            niveau_urgence = _classify_urgence(priorite_score)

            # ── Persistance ──────────────────────────────
            gap = SkillGap(
                enseignant_id        = enseignant_id,
                competence_id        = cid,
                competence_code      = str(cid),
                competence_nom       = req_info["nom"],
                domaine_id           = req_info.get("domaine_id"),
                domaine_nom          = req_info.get("domaine_nom"),
                niveau_actuel        = niveau_actuel,
                niveau_requis        = niveau_requis,
                niveau_vise          = niveau_vise,
                gap_score            = round(gap_brut, 4),
                urgence_score        = round(urgence_score, 4),
                impact_score         = round(impact_score, 4),
                priorite_score       = priorite_score,
                niveau_urgence       = niveau_urgence,
                mois_stagnation      = mois_stag,
                en_regression        = en_regres,
                nb_besoins_exprimes  = nb_besoins_c,
                derniere_evaluation  = last_eval_index.get(cid),
                justification        = self._justification(
                    gap_brut, urgence_score, mois_stag, en_regres, nb_besoins_c
                ),
                prediction_result_id = prediction_result_id,
            )
            self.db.add(gap)
            gaps.append(gap)

        self.db.flush()
        logger.info("GapEngine: %d gaps computed for enseignant %s", len(gaps), enseignant_id)
        return gaps

    def _justification(
        self, gap_brut: float, urgence: float, mois_stag: int,
        en_regres: bool, nb_besoins: int
    ) -> str:
        parts = [f"Écart de niveau : {round(gap_brut * 5, 1)}/5 points"]
        if en_regres:
            parts.append("régression détectée")
        if mois_stag >= 6:
            parts.append(f"stagnation depuis {mois_stag} mois")
        if nb_besoins > 0:
            parts.append(f"{nb_besoins} besoin(s) exprimé(s)")
        return " — ".join(parts) + "."
