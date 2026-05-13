"""FeatureEngine — construit et persiste un FeatureSnapshot pour un enseignant."""

import logging
from datetime import date
from typing import Any

from sqlalchemy.orm import Session

from app.models.db_models import FeatureSnapshot

logger = logging.getLogger(__name__)

# Mapping NiveauMaitrise (enum Java) → entier
NIVEAU_MAP = {
    "N1_DEBUTANT": 1,
    "N2_ELEMENTAIRE": 2,
    "N3_INTERMEDIAIRE": 3,
    "N4_AVANCE": 4,
    "N5_EXPERT": 5,
}

PRIORITE_ORDER = {"BASSE": 1, "MOYENNE": 2, "HAUTE": 3, "CRITIQUE": 4}


def niveau_to_int(val: Any) -> int:
    if isinstance(val, int):
        return val
    if isinstance(val, str):
        return NIVEAU_MAP.get(val.upper(), 0)
    return 0


class FeatureEngine:
    """Calcule les features agrégées d'un enseignant et les persiste."""

    def __init__(self, db: Session):
        self.db = db

    def build_snapshot(
        self,
        enseignant_id: str,
        competence_levels: list[dict],
        teacher_profile: dict,
        besoins: list[dict],
        certificats: list[dict],
    ) -> FeatureSnapshot:
        today = date.today()

        # ── Compétences ──────────────────────────────────
        niveaux = [niveau_to_int(r.get("current_level")) for r in competence_levels]
        nb_evalues = len([n for n in niveaux if n > 0])
        niveau_moyen = round(sum(niveaux) / len(niveaux), 2) if niveaux else 0.0

        counts = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for n in niveaux:
            if n in counts:
                counts[n] += 1

        # ── Formations ───────────────────────────────────
        nb_inscrites  = int(teacher_profile.get("nb_formations_in_progress", 0) or 0)
        nb_completees = int(teacher_profile.get("nb_formations_completed", 0) or 0)
        nb_approuvees = nb_completees  # APPROVED = formations suivies complétées
        taux_comp = round(nb_completees / max(nb_inscrites + nb_completees, 1) * 100, 2)
        taux_pres = round(float(teacher_profile.get("taux_assiduite", 0.0) or 0.0) * 100, 2)

        # ── Besoins ──────────────────────────────────────
        nb_besoins   = len(besoins)
        nb_approuves = sum(1 for b in besoins if b.get("approuve_admin"))
        priorite_max = None
        if besoins:
            priorites = [b.get("priorite", "BASSE") for b in besoins if b.get("priorite")]
            if priorites:
                priorite_max = max(priorites, key=lambda p: PRIORITE_ORDER.get(p, 0))

        # ── Évaluations ──────────────────────────────────
        note_moy  = float(teacher_profile.get("avg_eval_score", 0.0) or 0.0)
        nb_evals  = int(teacher_profile.get("nb_evaluations", 0) or 0)

        # ── Certificats ──────────────────────────────────
        nb_certifs = len(certificats)

        # ── Upsert en base ───────────────────────────────
        existing = (
            self.db.query(FeatureSnapshot)
            .filter_by(enseignant_id=enseignant_id, snapshot_date=today)
            .first()
        )

        if existing:
            snap = existing
        else:
            snap = FeatureSnapshot(enseignant_id=enseignant_id, snapshot_date=today)
            self.db.add(snap)

        snap.nb_savoirs_evalues         = nb_evalues
        snap.nb_savoirs_niveau_1        = counts[1]
        snap.nb_savoirs_niveau_2        = counts[2]
        snap.nb_savoirs_niveau_3        = counts[3]
        snap.nb_savoirs_niveau_4        = counts[4]
        snap.nb_savoirs_niveau_5        = counts[5]
        snap.niveau_moyen_competences   = niveau_moyen
        snap.nb_formations_inscrites    = nb_inscrites
        snap.nb_formations_approuvees   = nb_approuvees
        snap.nb_formations_completees   = nb_completees
        snap.taux_completion_formations = taux_comp
        snap.taux_presence_moyen        = taux_pres
        snap.nb_besoins_exprimes        = nb_besoins
        snap.nb_besoins_approuves       = nb_approuves
        snap.priorite_besoin_max        = priorite_max
        snap.note_evaluation_moyenne    = round(note_moy, 2) if note_moy else None
        snap.nb_evaluations_soumises    = nb_evals
        snap.nb_certificats_obtenus     = nb_certifs

        self.db.flush()
        logger.debug("FeatureSnapshot upserted for enseignant %s", enseignant_id)
        return snap
