"""Current Gap Diagnostic — deterministic, rule-based, no ML leakage.

This module is the SINGLE source of truth for computing the current competency
gap for a teacher. It uses ONLY the deterministic formula:

    gap = (niveau_requis - niveau_actuel) / 5.0

No ML model is involved. No target leakage is possible because the gap is
computed directly from the input data, not predicted from features that
include the same data.

Source: RULE_BASED_DIAGNOSTIC (not ML)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import date, datetime
from typing import Any

from app.config import settings

logger = logging.getLogger(__name__)

# ── Severity thresholds ─────────────────────────────────────
SEUIL_CRITIQUE = 0.75
SEUIL_HAUTE = 0.50
SEUIL_MODEREE = 0.25


@dataclass
class GapDiagnostic:
    """Complete diagnostic for a single competency gap.

    All fields are computed deterministically — no ML involved.
    The ``source`` field is always ``RULE_BASED_DIAGNOSTIC``.
    """

    enseignant_id: str
    competence_id: int
    competence_nom: str
    domaine_nom: str | None = None
    niveau_actuel: int = 0
    niveau_requis: int = 5
    niveau_vise: int = 5
    gap_brut: float = 0.0
    gap_score: float = 0.0
    urgence_score: float = 0.0
    impact_score: float = 0.0
    priorite_score: float = 0.0
    niveau_urgence: str = "FAIBLE"
    mois_stagnation: int = 0
    en_regression: bool = False
    nb_besoins_exprimes: int = 0
    justification: str = ""
    source: str = "RULE_BASED_DIAGNOSTIC"
    data_quality: str = "COMPLETE"
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "enseignant_id": self.enseignant_id,
            "competence_id": self.competence_id,
            "competence_nom": self.competence_nom,
            "domaine_nom": self.domaine_nom,
            "niveau_actuel": self.niveau_actuel,
            "niveau_requis": self.niveau_requis,
            "niveau_vise": self.niveau_vise,
            "gap_brut": round(self.gap_brut, 4),
            "gap_score": round(self.gap_score, 4),
            "urgence_score": round(self.urgence_score, 4),
            "impact_score": round(self.impact_score, 4),
            "priorite_score": round(self.priorite_score, 4),
            "niveau_urgence": self.niveau_urgence,
            "mois_stagnation": self.mois_stagnation,
            "en_regression": self.en_regression,
            "nb_besoins_exprimes": self.nb_besoins_exprimes,
            "justification": self.justification,
            "source": self.source,
            "data_quality": self.data_quality,
            "warnings": self.warnings,
        }


def compute_current_gap(
    niveau_actuel: int,
    niveau_requis: int,
) -> float:
    """Compute the deterministic current gap.

    Formula: max(0, (niveau_requis - niveau_actuel) / 5.0)

    This is a RULE-BASED calculation, NOT an ML prediction.
    """
    return max(0.0, (niveau_requis - niveau_actuel) / 5.0)


def classify_urgence(priorite_score: float) -> str:
    """Classify urgency based on priority score thresholds."""
    if priorite_score >= SEUIL_CRITIQUE:
        return "CRITIQUE"
    if priorite_score >= SEUIL_HAUTE:
        return "HAUTE"
    if priorite_score >= SEUIL_MODEREE:
        return "MODEREE"
    return "FAIBLE"


def compute_urgence_score(
    mois_stagnation: int,
    en_regression: bool,
    nb_besoins_c: int,
    seuil_stagnation: int = 12,
) -> float:
    """Compute urgency score from stagnation, regression, and needs."""
    return min(1.0,
        (mois_stagnation / max(seuil_stagnation, 1))
        + (0.3 if en_regression else 0.0)
        + (nb_besoins_c / 5) * 0.2
    )


def compute_impact_score(
    cid: int,
    niveau_requis: int,
    nb_besoins_c: int,
    domaine_demand: dict[int, float] | None = None,
) -> float:
    """Compute impact score from domaine demand, niveau vise, and blocking needs."""
    if domaine_demand is None:
        domaine_demand = {}
    poids_domaine = domaine_demand.get(cid, 0.0)
    niveau_vise = min(5, niveau_requis + 1)
    poids_niv_vise = niveau_vise / 5.0
    poids_bloquants = min(1.0, nb_besoins_c / 3.0)
    return (
        poids_domaine * 0.4
        + poids_niv_vise * 0.3
        + poids_bloquants * 0.3
    )


def compute_priorite_score(
    gap_brut: float,
    urgence_score: float,
    impact_score: float,
) -> float:
    """Compute priority score from gap, urgency, and impact."""
    return round(
        gap_brut * 0.45
        + urgence_score * 0.35
        + impact_score * 0.20,
        4,
    )


def build_justification(
    gap_brut: float,
    mois_stagnation: int,
    en_regression: bool,
    nb_besoins: int,
) -> str:
    """Build a human-readable explanation in French."""
    parts = []
    if gap_brut >= SEUIL_CRITIQUE:
        parts.append("Écart critique")
    elif gap_brut >= SEUIL_HAUTE:
        parts.append("Écart élevé")
    elif gap_brut >= SEUIL_MODEREE:
        parts.append("Écart modéré")

    if mois_stagnation >= 12:
        parts.append(f"stagnation depuis {mois_stagnation} mois")
    elif mois_stagnation >= 6:
        parts.append(f"stagnation depuis {mois_stagnation} mois")

    if en_regression:
        parts.append("tendance à la régression")

    if nb_besoins > 0:
        parts.append(f"{nb_besoins} besoin(s) non satisfait(s)")

    return " — ".join(parts) if parts else "Écart calculé"


def diagnose_gap(
    enseignant_id: str,
    competence_id: int,
    competence_nom: str,
    niveau_actuel: int,
    niveau_requis: int,
    domaine_nom: str | None = None,
    mois_stagnation: int = 0,
    en_regression: bool = False,
    nb_besoins_exprimes: int = 0,
    domaine_demand: dict[int, float] | None = None,
) -> GapDiagnostic:
    """Compute a complete gap diagnostic for a single competency.

    This is the main entry point for the deterministic gap diagnostic.
    It computes all fields (gap, urgency, impact, priority, classification)
    using ONLY rule-based formulas — no ML involved.
    """
    gap_brut = compute_current_gap(niveau_actuel, niveau_requis)

    if gap_brut < 1e-9:
        return GapDiagnostic(
            enseignant_id=enseignant_id,
            competence_id=competence_id,
            competence_nom=competence_nom,
            domaine_nom=domaine_nom,
            niveau_actuel=niveau_actuel,
            niveau_requis=niveau_requis,
            gap_brut=0.0,
            gap_score=0.0,
            source="RULE_BASED_DIAGNOSTIC",
            data_quality="COMPLETE",
            justification="Aucun écart détecté",
        )

    urgence = compute_urgence_score(mois_stagnation, en_regression, nb_besoins_exprimes)
    impact = compute_impact_score(competence_id, niveau_requis, nb_besoins_exprimes, domaine_demand)
    priorite = compute_priorite_score(gap_brut, urgence, impact)
    niveau_urgence = classify_urgence(priorite)

    niveau_vise = min(5, niveau_requis + 1)
    justification = build_justification(gap_brut, mois_stagnation, en_regression, nb_besoins_exprimes)

    data_quality = "COMPLETE"
    warnings_list: list[str] = []
    if niveau_actuel == 0:
        data_quality = "INCOMPLETE"
        warnings_list.append("Niveau actuel manquant — valeur 0 utilisée par défaut")
    if niveau_requis == 0:
        data_quality = "INCOMPLETE"
        warnings_list.append("Niveau requis manquant — valeur 0 utilisée par défaut")

    return GapDiagnostic(
        enseignant_id=enseignant_id,
        competence_id=competence_id,
        competence_nom=competence_nom,
        domaine_nom=domaine_nom,
        niveau_actuel=niveau_actuel,
        niveau_requis=niveau_requis,
        niveau_vise=niveau_vise,
        gap_brut=gap_brut,
        gap_score=round(gap_brut, 4),
        urgence_score=round(urgence, 4),
        impact_score=round(impact, 4),
        priorite_score=priorite,
        niveau_urgence=niveau_urgence,
        mois_stagnation=mois_stagnation,
        en_regression=en_regression,
        nb_besoins_exprimes=nb_besoins_exprimes,
        justification=justification,
        source="RULE_BASED_DIAGNOSTIC",
        data_quality=data_quality,
        warnings=warnings_list,
    )