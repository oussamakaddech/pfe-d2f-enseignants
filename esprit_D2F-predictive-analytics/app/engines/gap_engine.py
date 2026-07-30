"""Coverage-based Gap Engine — deterministic, rule-based gap detection.

Replaces the forbidden formula gap = niveau_requis - niveau_actuel.
Gaps are now computed as coverage deficits using the assignment service
as the source of truth for teacher–knowledge links.

The eight allowed gap types:
  GAP_NOT_ASSIGNED
  GAP_PREREQUISITE_MISSING
  GAP_TRAINING_NOT_COMPLETED
  GAP_EXPLICIT_NEED
  GAP_COLLECTIVE_NEED
  GAP_STALE_ASSIGNMENT
  GAP_STRATEGIC_COVERAGE
  GAP_DEMAND_TREND

All gaps are coverage-based, never derived from a teacher mastery level.
The knowledge difficulty_level is a fixed reference value from the
reference framework and never varies per teacher.
"""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Any

from sqlalchemy.orm import Session

from app.models.db_models import Knowledge, TeacherKnowledgeAssignment, TeacherCompetencyAssignment, SkillGap
from app.engines.predictive_gap_diagnostic import (
    GAP_NOT_ASSIGNED,
    GAP_PREREQUISITE_MISSING,
    GAP_TRAINING_NOT_COMPLETED,
    GAP_EXPLICIT_NEED,
    GAP_COLLECTIVE_NEED,
    GAP_STALE_ASSIGNMENT,
    GAP_STRATEGIC_COVERAGE,
    GAP_DEMAND_TREND,
    PRIORITY_WEIGHTS,
    PRIORITY_LEVELS,
)
from app.config import settings

logger = logging.getLogger(__name__)


def _normalize_teacher_id(teacher_id: str) -> str:
    tid = teacher_id.strip().upper()
    if tid.startswith("ENS"):
        return tid
    raise ValueError(f"Invalid teacher ID format: {teacher_id} (must be ENSxxx)")


def _knowledge_difficulty_score(difficulty_level: int) -> float:
    """Normalize the fixed knowledge difficulty level to [0, 1]."""
    return max(0.0, min(1.0, float(difficulty_level) / 5.0))


def _compute_assignment_freshness(assigned_at: date | None, validated_at: date | None) -> float:
    """Compute freshness score [0, 1]. 1 = very fresh, 0 = very stale."""
    if validated_at is not None:
        return 0.0
    if assigned_at is None:
        return 0.5
    days = (date.today() - assigned_at.date()).days
    if days <= 30:
        return 0.0
    if days <= 90:
        return min(1.0, days / 90.0)
    return 1.0


def detect_gaps_for_teacher(
    teacher_id: str,
    db: Session,
    connaissances: list[dict] | None = None,
    assignments: list[dict] | None = None,
    besoins_individuels: list[dict] | None = None,
    besoins_collectifs: list[dict] | None = None,
    formations_suivies: list[dict] | None = None,
    domaine_demand: dict[int, float] | None = None,
) -> list[dict[str, Any]]:
    """Detect coverage-based gaps for a teacher.

    Returns a list of gap dicts compatible with the diagnostic engine.
    Each gap has a gap_type from the eight allowed types.

    Parameters
    ----------
    teacher_id : canonical ENS format
    connaissances : optional pre-loaded knowledge rows [knowledge_id, competency_id, ...]
    assignments : optional pre-loaded TeacherKnowledgeAssignment rows
    besoins_individuels : optional [competence_id, ...] active individual needs
    besoins_collectifs : optional [competence_id, ...] active collective CUP needs
    formations_suivies : optional [formation_id, competence_id, statut, ...]
    domaine_demand : optional {competence_id → demand_weight 0-1}
    """
    teacher_id = _normalize_teacher_id(teacher_id)

    all_knowledge = connaissances or _load_all_knowledge(db)
    all_assignments = assignments or _load_assignments(db, teacher_id)
    all_besoins_ind = besoins_individuels or _load_besoins_individuels(db, teacher_id)
    all_besoins_coll = besoins_collectifs or _load_besoins_collectifs(db, teacher_id)
    all_formations = formations_suivies or _load_formations_suivies(db, teacher_id)

    domaine_demand = domaine_demand or {}

    gaps: list[dict[str, Any]] = []

    for knowledge in all_knowledge:
        kid = knowledge["id"]
        kc = knowledge.get("knowledge_code", str(kid))
        kname = knowledge.get("knowledge_name", "")
        kdiff = knowledge.get("difficulty_level", 1)
        cid = knowledge.get("competency_id")
        ccode = knowledge.get("competency_code", str(cid))
        cname = knowledge.get("competency_name", "")
        prereq_ids = knowledge.get("prerequis_ids") or []

        assignment = _find_assignment(all_assignments, kid)
        is_assigned = assignment is not None
        is_validated = assignment and assignment.get("assignment_status") == "VALIDATED"
        is_active = assignment and assignment.get("active", True)
        days_since_assigned = _days_since(assignment.get("assigned_at") if assignment else None)
        is_stale = not is_validated and days_since_assigned and days_since_assigned > 90

        prerequisite_missing = _check_prerequisites(prereq_ids, all_assignments)

        formation_completed = _has_completed_formation(all_formations, kc, cid)

        has_individual_need = _has_besoin(all_besoins_ind, kid, ccode, cid)
        has_collective_need = _has_besoin(all_besoins_coll, kid, ccode, cid)

        is_strategic = bool(domaine_demand.get(cid, 0.0) >= 0.7)

        gap_type = _classify_gap(
            is_assigned=is_assigned,
            is_active=is_active,
            is_validated=is_validated,
            is_stale=is_stale,
            prerequisite_missing=prerequisite_missing,
            formation_completed=formation_completed,
            has_individual_need=has_individual_need,
            has_collective_need=has_collective_need,
            is_strategic=is_strategic,
        )

        if gap_type is None:
            continue

        gap_dict = {
            "teacher_id": teacher_id,
            "knowledge_id": kc,
            "knowledge_name": kname,
            "knowledge_type": knowledge.get("knowledge_type", "THEORETICAL"),
            "knowledge_difficulty_level": kdiff,
            "competency_id": str(cid) if cid else "",
            "competency_name": cname,
            "gap_type": gap_type,
            "assignment_status": assignment.get("assignment_status") if assignment else "NOT_ASSIGNED",
            "priority_score": 0.0,
            "priority_level": "FAIBLE",
            "factors": [],
            "explanation_fr": "",
            "source": "RULE_BASED_COVERAGE_GAP",
            "analysis_status": "READY",
            "warnings": [],
            "data_quality": "COMPLETE",
        }
        gaps.append(gap_dict)

    return gaps


def _load_all_knowledge(db: Session) -> list[dict]:
    rows = db.query(Knowledge).filter_by(actif=True).all()
    result = []
    for r in rows:
        prereqs = r.prerequis_ids or []
        if isinstance(prereqs, str):
            import json
            try:
                prereqs = json.loads(prereqs)
            except (json.JSONDecodeError, TypeError):
                prereqs = []
        result.append({
            "id": r.id,
            "knowledge_code": r.knowledge_code,
            "knowledge_name": r.knowledge_name,
            "knowledge_type": r.knowledge_type,
            "competency_id": r.competency_id,
            "competency_code": r.competency_code,
            "competency_name": r.competency_name,
            "difficulty_level": r.difficulty_level,
            "prerequis_ids": prereqs,
        })
    return result


def _load_assignments(db: Session, teacher_id: str) -> list[dict]:
    rows = db.query(TeacherKnowledgeAssignment).filter_by(
        teacher_id=teacher_id, active=True
    ).all()
    return [
        {
            "id": r.id,
            "teacher_id": r.teacher_id,
            "knowledge_id": r.knowledge_id,
            "knowledge_code": r.knowledge_code,
            "knowledge_name": r.knowledge_name,
            "competency_id": r.competency_id,
            "competency_code": r.competency_code,
            "competency_name": r.competency_name,
            "assignment_status": r.assignment_status,
            "assignment_source": r.assignment_source,
            "assigned_at": r.assigned_at,
            "validated_at": r.validated_at,
            "active": r.active,
            "data_quality_status": r.data_quality_status,
        }
        for r in rows
    ]


def _load_besoins_individuels(db: Session, teacher_id: str) -> list[dict]:
    from app.models.db_models import AlertEvent
    rows = db.query(AlertEvent).filter(
        AlertEvent.enseignant_id == teacher_id,
        AlertEvent.type_alerte == "BESOIN_NON_COUVERT",
        AlertEvent.statut == "NOUVELLE",
    ).all()
    return [
        {"competence_id": r.competence_id, "competence_code": r.competence_id}
        for r in rows
    ]


def _load_besoins_collectifs(db: Session, teacher_id: str) -> list[dict]:
    from app.models.db_models import AlertEvent
    rows = db.query(AlertEvent).filter(
        AlertEvent.enseignant_id == teacher_id,
        AlertEvent.type_alerte == "BESOIN_NON_COUVERT",
        AlertEvent.cible_type == "DEPARTEMENT",
        AlertEvent.statut == "NOUVELLE",
    ).all()
    return [
        {"competence_id": r.competence_id}
        for r in rows
    ]


def _load_formations_suivies(db: Session, teacher_id: str) -> list[dict]:
    from app.models.db_models import TrainingPath, TrainingPathItem
    rows = db.query(TrainingPath).filter_by(
        enseignant_id=teacher_id, statut="COMPLETED"
    ).all()
    return [
        {
            "training_path_id": r.id,
            "competence_id": r.competence_id,
            "formation_id": None,
            "formation_titre": r.competence_nom,
        }
        for r in rows
    ]


def _find_assignment(assignments: list[dict], knowledge_id: int) -> dict | None:
    for a in assignments:
        if a.get("knowledge_id") == knowledge_id:
            return a
    return None


def _check_prerequisites(prereq_ids: list, all_assignments: list[dict]) -> int:
    if not prereq_ids:
        return 0
    assigned_knowledge_ids = {a.get("knowledge_id") for a in all_assignments if a.get("active")}
    missing = 0
    for pid in prereq_ids:
        if pid not in assigned_knowledge_ids:
            missing += 1
    return missing


def _has_completed_formation(formations: list[dict], kcode: str, cid: int | None) -> bool:
    for f in formations:
        if f.get("knowledge_code") == kcode or (cid and f.get("competence_id") == cid):
            return True
    return False


def _has_besoin(besoins: list[dict], kid: int, kcode: str, cid: int | None) -> bool:
    for b in besoins:
        bid = b.get("competence_id")
        if bid == kid or bid == cid or str(bid) == kcode:
            return True
    return False


def _days_since(dt: date | None) -> int | None:
    if dt is None:
        return None
    if isinstance(dt, datetime):
        dt = dt.date()
    return (date.today() - dt).days


def _classify_gap(
    is_assigned: bool,
    is_active: bool,
    is_validated: bool,
    is_stale: bool,
    prerequisite_missing: int,
    formation_completed: bool,
    has_individual_need: bool,
    has_collective_need: bool,
    is_strategic: bool,
) -> str | None:
    """Classify the gap type based on coverage status.

    Returns None if no gap is detected (teacher is fully covered).
    """
    if not is_assigned:
        return GAP_NOT_ASSIGNED
    if not is_active:
        return GAP_NOT_ASSIGNED
    if is_stale and not is_validated:
        return GAP_STALE_ASSIGNMENT
    if prerequisite_missing > 0:
        return GAP_PREREQUISITE_MISSING
    if has_individual_need:
        return GAP_EXPLICIT_NEED
    if has_collective_need:
        return GAP_COLLECTIVE_NEED
    if is_strategic and not formation_completed:
        return GAP_TRAINING_NOT_COMPLETED
    if not is_validated and not formation_completed:
        return GAP_TRAINING_NOT_COMPLETED
    return None


def compute_priority_score(gap: dict[str, Any]) -> float:
    """Compute the priority score from a gap dict using the spec formula.

    priority_score =
      0.25 * knowledge_difficulty_score
    + 0.20 * explicit_need_score
    + 0.15 * collective_need_score
    + 0.15 * prerequisite_gap_score
    + 0.10 * training_completion_score
    + 0.10 * assignment_freshness_score
    + 0.05 * strategic_impact_score
    """
    w = PRIORITY_WEIGHTS

    difficulty = gap.get("knowledge_difficulty_level", 1)
    kd_score = _knowledge_difficulty_score(difficulty)

    gap_type = gap.get("gap_type", "")
    has_explicit_need = gap_type == GAP_EXPLICIT_NEED
    explicit_score = 1.0 if has_explicit_need else 0.0

    has_collective = gap_type == GAP_COLLECTIVE_NEED
    collective_score = 1.0 if has_collective else 0.0

    has_prereq = gap_type == GAP_PREREQUISITE_MISSING
    prereq_score = 1.0 if has_prereq else 0.0

    needs_training = gap_type in (GAP_TRAINING_NOT_COMPLETED, GAP_NOT_ASSIGNED)
    training_score = 1.0 if needs_training else 0.0

    stale = gap_type == GAP_STALE_ASSIGNMENT
    freshness_score = 1.0 if stale else 0.0

    is_strategic = gap.get("is_strategic", False)
    strategic_score = 1.0 if is_strategic else 0.0

    score = (
        w["knowledge_difficulty"] * kd_score
        + w["explicit_need"] * explicit_score
        + w["collective_need"] * collective_score
        + w["prerequisite_gap"] * prereq_score
        + w["training_completion"] * training_score
        + w["assignment_freshness"] * freshness_score
        + w["strategic_impact"] * strategic_score
    )
    return round(max(0.0, min(1.0, score)), 4)


def classify_priority(score: float) -> str:
    for threshold, level in PRIORITY_LEVELS:
        if score >= threshold:
            return level
    return "FAIBLE"


def build_gap_factors(gap: dict[str, Any]) -> list[dict[str, Any]]:
    """Build the factors list for a gap diagnostic."""
    w = PRIORITY_WEIGHTS
    gap_type = gap.get("gap_type", "")
    difficulty = gap.get("knowledge_difficulty_level", 1)
    kd_score = _knowledge_difficulty_score(difficulty)

    factors = [
        {
            "key": "knowledge_difficulty",
            "label": f"Niveau de difficulté du savoir (niveau {difficulty})",
            "value": kd_score,
            "weight": w["knowledge_difficulty"],
            "contribution": round(w["knowledge_difficulty"] * kd_score, 4),
        },
    ]

    if gap_type == GAP_EXPLICIT_NEED:
        factors.append({
            "key": "individual_need",
            "label": "Besoin individuel actif",
            "value": 1.0,
            "weight": w["explicit_need"],
            "contribution": w["explicit_need"],
        })

    if gap_type == GAP_COLLECTIVE_NEED:
        factors.append({
            "key": "collective_need",
            "label": "Besoin collectif CUP actif",
            "value": 1.0,
            "weight": w["collective_need"],
            "contribution": w["collective_need"],
        })

    if gap_type == GAP_PREREQUISITE_MISSING:
        factors.append({
            "key": "prerequisite_gap",
            "label": "Prérequis non couvert pour ce savoir",
            "value": 1.0,
            "weight": w["prerequisite_gap"],
            "contribution": w["prerequisite_gap"],
        })

    if gap_type in (GAP_TRAINING_NOT_COMPLETED, GAP_NOT_ASSIGNED):
        factors.append({
            "key": "training_completion",
            "label": "Aucune formation terminée pour couvrir ce savoir",
            "value": 1.0,
            "weight": w["training_completion"],
            "contribution": w["training_completion"],
        })

    if gap_type == GAP_STALE_ASSIGNMENT:
        factors.append({
            "key": "assignment_freshness",
            "label": "Affectation ancienne ou non validée",
            "value": 1.0,
            "weight": w["assignment_freshness"],
            "contribution": w["assignment_freshness"],
        })

    if gap.get("is_strategic"):
        factors.append({
            "key": "strategic_impact",
            "label": "Savoir stratégique pour le domaine/UP/département",
            "value": 1.0,
            "weight": w["strategic_impact"],
            "contribution": w["strategic_impact"],
        })

    return factors 
 