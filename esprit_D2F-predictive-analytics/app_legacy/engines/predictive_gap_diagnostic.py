"""Predictive Gap Diagnostic — deterministic coverage-based diagnostic engine.

Produces deterministic, rule-based diagnostics for teacher coverage gaps.
Never uses the forbidden formula gap = niveau_requis - niveau_maitrise_enseignant.
All scores are derived from coverage data, assignments, needs, and training records.
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

GAP_NOT_ASSIGNED = "GAP_NOT_ASSIGNED"
GAP_PREREQUISITE_MISSING = "GAP_PREREQUISITE_MISSING"
GAP_TRAINING_NOT_COMPLETED = "GAP_TRAINING_NOT_COMPLETED"
GAP_EXPLICIT_NEED = "GAP_EXPLICIT_NEED"
GAP_COLLECTIVE_NEED = "GAP_COLLECTIVE_NEED"
GAP_STALE_ASSIGNMENT = "GAP_STALE_ASSIGNMENT"
GAP_STRATEGIC_COVERAGE = "GAP_STRATEGIC_COVERAGE"
GAP_DEMAND_TREND = "GAP_DEMAND_TREND"

PRIORITY_WEIGHTS = {
    "knowledge_difficulty": 0.25,
    "explicit_need": 0.20,
    "collective_need": 0.15,
    "prerequisite_gap": 0.15,
    "training_completion": 0.10,
    "assignment_freshness": 0.10,
    "strategic_impact": 0.05,
}

PRIORITY_LEVELS = [(0.75, "CRITIQUE"), (0.50, "HAUTE"), (0.25, "MODEREE"), (0.0, "FAIBLE")]


@dataclass
class GapDiagnostic:
    teacher_id: str
    gap_id: str
    gap_type: str
    knowledge_id: str
    knowledge_name: str
    knowledge_type: str | None = None
    knowledge_difficulty_level: int = 1
    competency_id: str | None = None
    competency_name: str | None = None
    assignment_status: str | None = None
    priority_score: float = 0.0
    priority_level: str = "FAIBLE"
    factors: list[dict[str, Any]] = field(default_factory=list)
    explanation_fr: str = ""
    source: str = "RULE_BASED_PREDICTIVE_DIAGNOSTIC"
    analysis_status: str = "READY"
    warnings: list[str] = field(default_factory=list)

    def to_dict(self) -> dict[str, Any]:
        return {
            "teacher_id": self.teacher_id,
            "gap_id": self.gap_id,
            "gap_type": self.gap_type,
            "knowledge_id": self.knowledge_id,
            "knowledge_name": self.knowledge_name,
            "knowledge_type": self.knowledge_type,
            "knowledge_difficulty_level": self.knowledge_difficulty_level,
            "competency_id": self.competency_id,
            "competency_name": self.competency_name,
            "assignment_status": self.assignment_status,
            "priority_score": round(self.priority_score, 4),
            "priority_level": self.priority_level,
            "factors": self.factors,
            "explanation_fr": self.explanation_fr,
            "source": self.source,
            "analysis_status": self.analysis_status,
            "warnings": self.warnings,
        }


def _normalize_score(value: float) -> float:
    return max(0.0, min(1.0, float(value)))


def _classify_priority(score: float) -> str:
    for threshold, level in PRIORITY_LEVELS:
        if score >= threshold:
            return level
    return "FAIBLE"


def _knowledge_difficulty_score(difficulty_level: int) -> float:
    return _normalize_score(float(difficulty_level) / 5.0)


def _build_factor(key: str, label: str, value: float, weight: float) -> dict[str, Any]:
    return {
        "key": key,
        "label": label,
        "value": round(value, 4),
        "weight": weight,
        "contribution": round(weight * value, 4),
    }


def diagnose_gap(
    teacher_id: str,
    knowledge_id: str,
    knowledge_name: str,
    knowledge_type: str | None = None,
    knowledge_difficulty_level: int = 1,
    competency_id: str | None = None,
    competency_name: str | None = None,
    gap_type: str = GAP_NOT_ASSIGNED,
    assignment_status: str | None = None,
    has_explicit_need: bool = False,
    has_collective_need: bool = False,
    missing_prerequisites: int = 0,
    total_prerequisites: int = 0,
    has_incomplete_training: bool = False,
    assignment_stale_days: int | None = None,
    is_validated: bool = False,
    is_strategic: bool = False,
    warnings: list[str] | None = None,
) -> GapDiagnostic:
    warnings = warnings or []

    kd_score = _knowledge_difficulty_score(knowledge_difficulty_level)
    w = PRIORITY_WEIGHTS

    explicit_score = 1.0 if has_explicit_need else 0.0
    collective_score = 1.0 if has_collective_need else 0.0
    prereq_score = 0.0 if total_prerequisites <= 0 else _normalize_score(missing_prerequisites / total_prerequisites)
    training_score = 1.0 if has_incomplete_training else 0.0
    freshness_score = 1.0 if (not is_validated and assignment_stale_days is not None and assignment_stale_days > 90) else 0.0
    strategic_score = 1.0 if is_strategic else 0.0

    priority_score = round(
        w["knowledge_difficulty"] * kd_score
        + w["explicit_need"] * explicit_score
        + w["collective_need"] * collective_score
        + w["prerequisite_gap"] * prereq_score
        + w["training_completion"] * training_score
        + w["assignment_freshness"] * freshness_score
        + w["strategic_impact"] * strategic_score,
        4,
    )

    priority_level = _classify_priority(priority_score)

    factors = [
        _build_factor("knowledge_difficulty", f"Niveau de difficulté (niveau {knowledge_difficulty_level})", kd_score, w["knowledge_difficulty"]),
    ]

    if has_explicit_need:
        factors.append(_build_factor("individual_need", "Besoin individuel actif", 1.0, w["explicit_need"]))
    if has_collective_need:
        factors.append(_build_factor("collective_need", "Besoin collectif CUP actif", 1.0, w["collective_need"]))
    if missing_prerequisites > 0:
        factors.append(_build_factor("prerequisite_gap", f"Prérequis manquants ({missing_prerequisites}/{total_prerequisites})", prereq_score, w["prerequisite_gap"]))
    if has_incomplete_training:
        factors.append(_build_factor("training_completion", "Formation non terminée pour ce savoir", 1.0, w["training_completion"]))
    if not is_validated and assignment_stale_days is not None and assignment_stale_days > 90:
        factors.append(_build_factor("assignment_freshness", "Affectation ancienne ou non validée", 1.0, w["assignment_freshness"]))
    if is_strategic:
        factors.append(_build_factor("strategic_impact", "Savoir stratégique pour le domaine/UP/département", 1.0, w["strategic_impact"]))

    explanation_parts = [f"Le savoir « {knowledge_name} » est de niveau de difficulté {knowledge_difficulty_level}."]

    if gap_type == GAP_NOT_ASSIGNED:
        explanation_parts.append("Ce savoir n'est pas encore affecté(e) à cet enseignant.")
    elif gap_type == GAP_PREREQUISITE_MISSING:
        explanation_parts.append(f"Il manque {missing_prerequisites} prérequis pour couvrir ce savoir.")
    elif gap_type == GAP_TRAINING_NOT_COMPLETED:
        explanation_parts.append("Aucune formation liée à ce savoir n'a été complétée.")
    elif gap_type == GAP_EXPLICIT_NEED:
        explanation_parts.append("Un besoin individuel est actif pour cette compétence.")
    elif gap_type == GAP_COLLECTIVE_NEED:
        explanation_parts.append("Un besoin collectif CUP est applicable pour cette compétence.")
    elif gap_type == GAP_STALE_ASSIGNMENT:
        explanation_parts.append(f"L'affectation date de plus de 90 jours et n'est pas validée.")
    elif gap_type == GAP_STRATEGIC_COVERAGE:
        explanation_parts.append("Ce savoir est stratégique pour le département ou l'UP.")
    elif gap_type == GAP_DEMAND_TREND:
        explanation_parts.append("Ce savoir est en forte demande mais insuffisamment couvert.")

    gap_id = f"GAP-{teacher_id}-{knowledge_id}-{gap_type}"

    return GapDiagnostic(
        teacher_id=teacher_id,
        gap_id=gap_id,
        gap_type=gap_type,
        knowledge_id=knowledge_id,
        knowledge_name=knowledge_name,
        knowledge_type=knowledge_type,
        knowledge_difficulty_level=knowledge_difficulty_level,
        competency_id=competency_id,
        competency_name=competency_name,
        assignment_status=assignment_status,
        priority_score=priority_score,
        priority_level=priority_level,
        factors=factors,
        explanation_fr=" ".join(explanation_parts),
        source="RULE_BASED_PREDICTIVE_DIAGNOSTIC",
        analysis_status="READY",
        warnings=warnings,
    )