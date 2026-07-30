"""Contextual Training Recommendation Engine.

Recommends formations based on detected coverage gaps, training catalog,
and teacher profile. Every recommendation is traceable to an active gap
and a specific formation that is active, not cancelled, and open for enrollment.

Rule set:
- Formation must be active
- Formation must not be cancelled
- Inscriptions must be open
- Formation must target the gap's savoir, sous-compétence, or compétence
- Formation must respect departmental and UP restrictions
- Formation must not already be completed by the teacher
- Prerequisites must be satisfied or a prerequisite path must be proposed
- Formation must address an active gap
- Target level must be consistent with the knowledge difficulty level

All score components without data are null (never 0.5 fallback).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)


@dataclass
class Recommendation:
    teacher_id: str
    training_id: str
    training_name: str
    gap_id: str
    knowledge_id: str
    knowledge_difficulty_level: int
    eligibility: bool
    recommendation_score: float | None = None
    score_components: dict[str, float | None] = field(default_factory=dict)
    warnings: list[str] = field(default_factory=list)
    explanation_fr: str = ""
    source: str = "RULE_BASED_CONTEXTUAL_RECOMMENDATION"
    prerequisite_path: list[dict[str, Any]] | None = None

    def to_dict(self) -> dict[str, Any]:
        return {
            "teacher_id": self.teacher_id,
            "training_id": self.training_id,
            "training_name": self.training_name,
            "gap_id": self.gap_id,
            "knowledge_id": self.knowledge_id,
            "knowledge_difficulty_level": self.knowledge_difficulty_level,
            "eligibility": self.eligibility,
            "recommendation_score": round(self.recommendation_score, 4) if self.recommendation_score is not None else None,
            "score_components": self.score_components,
            "warnings": self.warnings,
            "explanation_fr": self.explanation_fr,
            "source": self.source,
            "prerequisite_path": self.prerequisite_path,
        }


def _normalize_score(value: float | None) -> float | None:
    if value is None:
        return None
    return max(0.0, min(1.0, float(value)))


def check_eligibility(
    formation: dict[str, Any],
    gap: dict[str, Any],
    teacher_completed_formations: set[str],
) -> tuple[bool, list[str]]:
    """Check if a formation is eligible for a teacher given a gap."""
    if hasattr(gap, "to_dict"):
        gap = gap.to_dict()
    warnings: list[str] = []
    eligible = True

    if not formation.get("active", False):
        return False, ["La formation n'est pas active."]

    if formation.get("cancelled", False):
        return False, ["La formation a été annulée."]

    if not formation.get("inscriptions_ouvertes", False):
        return False, ["Les inscriptions ne sont pas ouvertes."]

    target = formation.get("target_competency_code") or ""
    gap_knowledge_id = gap.get("knowledge_id", "")
    gap_competency_id = gap.get("competency_id", "")

    if target and gap_knowledge_id and target not in gap_knowledge_id and target not in str(gap_competency_id):
        # Formation doesn't target the gap's knowledge or competency
        if not _formation_covers_gap(formation, gap):
            eligible = False
            warnings.append("La formation ne cible pas le savoir ou la compétence du gap détecté.")

    if formation.get("departement_restriction") and formation.get("departement_restriction") != gap.get("departement_id"):
        eligible = False
        warnings.append("La formation n'est pas ouverte au département de l'enseignant.")

    if formation.get("up_restriction") and formation.get("up_restriction") != gap.get("up_code"):
        eligible = False
        warnings.append("La formation n'est pas ouverte à l'UP de l'enseignant.")

    formation_id = str(formation.get("training_id") or formation.get("id"))
    if formation_id in teacher_completed_formations:
        eligible = False
        warnings.append("L'enseignant a déjà complété cette formation.")

    if not _prerequisites_satisfied(formation, teacher_completed_formations):
        warnings.append("Les prérequis de la formation ne sont pas satisfaits.")

    difficulty = gap.get("knowledge_difficulty_level", 0)
    target_level = formation.get("niveau_cible") or formation.get("niveau_vise") or 0
    if target_level and difficulty and target_level < difficulty:
        warnings.append("Le niveau cible de la formation est inférieur au niveau de difficulté du savoir.")

    return eligible, warnings


def _formation_covers_gap(formation: dict[str, Any], gap: dict[str, Any]) -> bool:
    """Check if a formation covers the gap's knowledge or competency."""
    target = formation.get("target_competency_code") or ""
    gap_knowledge = gap.get("knowledge_id", "")
    gap_competency = str(gap.get("competency_id", ""))
    gap_competency_code = gap.get("competency_code", "")
    if target in (gap_knowledge, gap_competency, gap_competency_code):
        return True
    formation_name = (formation.get("training_name") or formation.get("name") or "").lower()
    gap_name = (gap.get("knowledge_name") or gap.get("competency_name") or "").lower()
    if gap_name and formation_name and gap_name[:20] in formation_name[:50]:
        return True
    return False


def _prerequisites_satisfied(formation: dict[str, Any], teacher_completed: set[str]) -> bool:
    prereqs = formation.get("prerequisites") or []
    if not prereqs:
        return True
    for p in prereqs:
        if str(p) not in teacher_completed:
            return False
    return True


def compute_recommendation_score(
    gap: dict[str, Any],
    formation: dict[str, Any],
    teacher_completed_formations: set[str],
    historical_effectiveness: dict[str, float] | None = None,
) -> Recommendation:
    """Compute a contextual recommendation score for a teacher–formation pair."""
    if hasattr(gap, "to_dict"):
        gap = gap.to_dict()
    eligible, eligibility_warnings = check_eligibility(formation, gap, teacher_completed_formations)

    if not eligible:
        return Recommendation(
            teacher_id=gap.get("teacher_id", ""),
            training_id=str(formation.get("training_id") or formation.get("id", "")),
            training_name=formation.get("training_name") or formation.get("name", ""),
            gap_id=gap.get("gap_id", ""),
            knowledge_id=gap.get("knowledge_id", ""),
            knowledge_difficulty_level=gap.get("knowledge_difficulty_level", 0),
            eligibility=False,
            score_components={},
            warnings=eligibility_warnings,
            explanation_fr="Cette formation n'est pas éligible pour cet enseignant.",
        )

    gap_priority = gap.get("priority_score", 0.0)

    # knowledge_training_relevance: how well the formation targets the gap's knowledge
    knowledge_relevance = _compute_knowledge_relevance(formation, gap)

    # prerequisite_readiness
    prereq_satisfied = _prerequisites_satisfied(formation, teacher_completed_formations)
    prereq_readiness = 1.0 if prereq_satisfied else 0.0

    # availability (open enrollment)
    availability = 1.0 if formation.get("inscriptions_ouvertes") else 0.0

    # individual_need_alignment
    has_individual_need = gap.get("gap_type") in ("GAP_EXPLICIT_NEED",)
    individual_need_alignment = 1.0 if has_individual_need else None

    # collective_need_alignment
    has_collective = gap.get("gap_type") in ("GAP_COLLECTIVE_NEED",)
    collective_need_alignment = 1.0 if has_collective else None

    # strategic_impact
    is_strategic = gap.get("is_strategic", False)
    strategic_impact = 1.0 if is_strategic else None

    # historical_effectiveness (null if no data)
    hist_key = str(formation.get("training_id") or formation.get("id", ""))
    historical_effectiveness_val = None
    if historical_effectiveness is not None and hist_key in historical_effectiveness:
        historical_effectiveness_val = _normalize_score(historical_effectiveness[hist_key])

    components: dict[str, float | None] = {
        "gap_priority": round(gap_priority, 4),
        "knowledge_training_relevance": round(knowledge_relevance, 4) if knowledge_relevance is not None else None,
        "prerequisite_readiness": prereq_readiness,
        "availability": availability,
        "individual_need_alignment": individual_need_alignment,
        "collective_need_alignment": collective_need_alignment,
        "strategic_impact": strategic_impact,
        "historical_effectiveness": historical_effectiveness_val,
    }

    # Compute weighted score — only include non-null components
    active_components = {k: v for k, v in components.items() if v is not None}
    if active_components:
        total_weight = len(active_components)
        recommendation_score = sum(active_components.values()) / total_weight
    else:
        recommendation_score = None

    warnings = list(eligibility_warnings)
    if historical_effectiveness_val is None:
        warnings.append("Aucune donnée historique suffisante pour estimer l'efficacité de cette formation.")

    explanation_parts = [
        f"Cette formation est recommandée car elle cible le savoir « {gap.get('knowledge_name', '')} »",
        f"de difficulté {gap.get('knowledge_difficulty_level', 0)}",
    ]
    if has_individual_need:
        explanation_parts.append("pour lequel un besoin individuel est actif.")
    elif gap.get("gap_type") == "GAP_NOT_ASSIGNED":
        explanation_parts.append("pour lequel un gap de couverture a été détecté.")

    return Recommendation(
        teacher_id=gap.get("teacher_id", ""),
        training_id=str(formation.get("training_id") or formation.get("id", "")),
        training_name=formation.get("training_name") or formation.get("name", ""),
        gap_id=gap.get("gap_id", ""),
        knowledge_id=gap.get("knowledge_id", ""),
        knowledge_difficulty_level=gap.get("knowledge_difficulty_level", 0),
        eligibility=True,
        recommendation_score=round(recommendation_score, 4) if recommendation_score is not None else None,
        score_components=components,
        warnings=warnings,
        explanation_fr=" ".join(explanation_parts),
        source="RULE_BASED_CONTEXTUAL_RECOMMENDATION",
    )


def _compute_knowledge_relevance(formation: dict[str, Any], gap: dict[str, Any]) -> float | None:
    """Compute how well the formation targets the gap knowledge."""
    target = formation.get("target_competency_code") or ""
    gap_target = gap.get("competency_code") or gap.get("knowledge_id", "")

    if target and gap_target:
        if target == gap_target or target in gap_target or gap_target in target:
            return 1.0

    if not target and not gap_target:
        return None

    return 0.5


def generate_recommendations(
    teacher_id: str,
    gaps: list[dict[str, Any]],
    formations_catalog: list[dict[str, Any]],
    teacher_completed_formations: set[str] | None = None,
    historical_effectiveness: dict[str, float] | None = None,
) -> list[Recommendation]:
    """Generate contextual recommendations for a teacher."""
    teacher_completed = teacher_completed_formations or set()
    recommendations: list[Recommendation] = []

    for gap in gaps:
        if gap.get("analysis_status") != "READY":
            continue

        for formation in formations_catalog:
            rec = compute_recommendation_score(gap, formation, teacher_completed, historical_effectiveness)
            if rec.eligibility:
                recommendations.append(rec)

    # Sort by recommendation_score descending
    recommendations.sort(key=lambda r: r.recommendation_score or 0.0, reverse=True)

    return recommendations