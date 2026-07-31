"""RecommendationEngine — recommandation explicable de formations.

Principe: l'éligibilité est STRICTE et déterministe. Le scoring pondéré est
explicable via `reason_codes` et une explication lisible.

score =
  0.40 * gap_relevance
+ 0.15 * severity_priority
+ 0.10 * prerequisite_compatibility
+ 0.10 * training_effectiveness
+ 0.10 * urgency
+ 0.05 * availability
+ 0.05 * need_alignment
+ 0.05 * diversification_bonus

Contraintes:
  - jamais recommander une formation hors gap actif (collaborative filtering
    ne peut intervenir qu'après éligibilité stricte et sur gaps actifs).
"""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date
from typing import Any

from pydantic import BaseModel, Field

from app.domain.entities.gap import GapDiagnostic, TeacherGapAnalysis
from app.domain.entities.training import Enrollment, Training
from app.domain.enums.gap import GapSeverity, GapType
from app.domain.enums.quality import DataQualityStatus
from app.domain.enums.training import EnrollmentStatus, NeedStatus, RecommendationPriority
from app.domain.services.context import TeacherContext

SEVERITY_RANK = {
    GapSeverity.LOW: 1,
    GapSeverity.MEDIUM: 2,
    GapSeverity.HIGH: 3,
    GapSeverity.CRITICAL: 4,
}


@dataclass(frozen=True)
class RecommendationWeights:
    gap_relevance: float = 0.40
    severity_priority: float = 0.15
    prerequisite_compatibility: float = 0.10
    training_effectiveness: float = 0.10
    urgency: float = 0.10
    availability: float = 0.05
    need_alignment: float = 0.05
    diversification_bonus: float = 0.05

    def __post_init__(self) -> None:
        total = sum(
            [
                self.gap_relevance,
                self.severity_priority,
                self.prerequisite_compatibility,
                self.training_effectiveness,
                self.urgency,
                self.availability,
                self.need_alignment,
                self.diversification_bonus,
            ]
        )
        if abs(total - 1.0) > 1e-6:
            raise ValueError(f"Recommendation weights must sum to 1.0, got {total}")


@dataclass
class EligibilityRules:
    """Options d'éligibilité configurables."""

    ignore_department_filter: bool = False
    exclude_capacity_full: bool = True


class Recommendation(BaseModel):
    training_id: str
    title: str
    recommendation_score: float
    priority: RecommendationPriority
    target_gap_ids: list[str] = Field(default_factory=list)
    target_competencies: list[str] = Field(default_factory=list)
    expected_level_progression: dict[str, Any] = Field(default_factory=dict)
    prerequisite_status: str = "MET"
    estimated_duration_hours: float = 0.0
    available_from: date | None = None
    reason_codes: list[str] = Field(default_factory=list)
    human_readable_explanation: str = ""
    alternatives: list[str] = Field(default_factory=list)
    data_quality_status: DataQualityStatus = DataQualityStatus.COMPLETE
    score_breakdown: dict[str, float] = Field(default_factory=dict)


class RecommendationResult(BaseModel):
    teacher_id: str
    recommendations: list[Recommendation] = Field(default_factory=list)
    excluded_trainings: list[dict[str, Any]] = Field(default_factory=list)
    no_eligible_reason: str | None = None


class RecommendationEngine:
    def __init__(
        self,
        weights: RecommendationWeights | None = None,
        rules: EligibilityRules | None = None,
    ) -> None:
        self.weights = weights or RecommendationWeights()
        self.rules = rules or EligibilityRules()

    # ------------------------------------------------------------- entry point
    def recommend(
        self,
        context: TeacherContext,
        gap_analysis: TeacherGapAnalysis,
    ) -> RecommendationResult:
        result = RecommendationResult(teacher_id=context.teacher.teacher_id)

        if not gap_analysis.has_competency_records:
            result.no_eligible_reason = "DATA_INCOMPLETE"
            return result

        active_gaps = [
            g for g in gap_analysis.gaps if g.gap_level > 0 or self._force_active(g)
        ]
        if not active_gaps:
            result.no_eligible_reason = "NO_ACTIVE_GAPS"
            return result

        gaps_by_knowledge: dict[str, list[GapDiagnostic]] = {}
        for g in active_gaps:
            if g.knowledge_id:
                gaps_by_knowledge.setdefault(g.knowledge_id, []).append(g)

        completed_ids = self._completed_trainings(context.enrollments)

        eligible: list[tuple[Training, list[GapDiagnostic], list[str]]] = []
        for training in context.trainings:
            exclusion = self._eligibility_exclusion(
                context, training, gaps_by_knowledge, completed_ids
            )
            if exclusion:
                result.excluded_trainings.append(
                    {
                        "training_id": training.training_id,
                        "reason": exclusion,
                    }
                )
                continue
            matched_gaps = [
                g
                for gid in training.target_knowledge_ids
                for g in gaps_by_knowledge.get(gid, [])
            ]
            if not matched_gaps:
                result.excluded_trainings.append(
                    {
                        "training_id": training.training_id,
                        "reason": "NO_GAP_LINKED",
                    }
                )
                continue
            reason_codes = self._reason_codes(context, training, matched_gaps)
            eligible.append((training, matched_gaps, reason_codes))

        if not eligible:
            result.no_eligible_reason = "NO_ELIGIBLE_TRAINING"
            return result

        # diversification: group by target competency so similar trainings
        # get a small bonus for being complementary.
        scored: list[Recommendation] = []
        for training, matched_gaps, reason_codes in eligible:
            rec = self._score_training(
                context, training, matched_gaps, reason_codes, len(eligible)
            )
            scored.append(rec)

        scored.sort(key=lambda r: r.recommendation_score, reverse=True)
        top_ids = {r.training_id for r in scored[:2]}
        for rec in scored:
            rec.alternatives = [r.training_id for r in scored if r.training_id != rec.training_id][:3]

        result.recommendations = scored
        return result

    # ------------------------------------------------------------- eligibility
    def _eligibility_exclusion(
        self,
        context: TeacherContext,
        training: Training,
        gaps_by_knowledge: dict[str, list[GapDiagnostic]],
        completed_ids: set[str],
    ) -> str | None:
        if not training.active:
            return "NOT_ACTIVE"
        if training.cancelled:
            return "CANCELLED"
        if not training.registration_open:
            return "REGISTRATION_CLOSED"
        today = context.reference_date or date.today()
        if training.end_date is not None and training.end_date < today:
            return "ENDED"

        teacher = context.teacher
        if training.department_code and not self.rules.ignore_department_filter:
            if training.department_code != teacher.department_code:
                return "DEPARTMENT_MISMATCH"
        if training.up_code and training.up_code != teacher.up_code:
            return "UP_MISMATCH"
        if training.role and training.role != teacher.role.value:
            return "ROLE_MISMATCH"

        if training.training_id in completed_ids:
            return "ALREADY_COMPLETED"

        if not any(k in gaps_by_knowledge for k in training.target_knowledge_ids):
            return "NO_GAP_LINKED"

        if not self._prerequisites_met(context, training):
            return "PREREQUISITE_MISSING"

        if training.capacity is not None and not training.seats_available:
            if self.rules.exclude_capacity_full:
                return "CAPACITY_FULL"
        return None

    def _prerequisites_met(
        self,
        context: TeacherContext,
        training: Training,
    ) -> bool:
        # knowledge-level prerequisites: unmet prereq is acceptable when the
        # training itself targets the knowledge (it will fill the gap).
        records = {r.knowledge_id: r for r in context.records}
        for link in training.competency_links:
            if link.niveau_prerequis is None:
                continue
            if link.knowledge_id in training.target_knowledge_ids:
                continue
            record = records.get(link.knowledge_id)
            if record is None or record.current_level is None:
                return False
            if record.current_level < link.niveau_prerequis:
                return False
        return True

    def _completed_trainings(self, enrollments: list[Enrollment]) -> set[str]:
        return {
            e.training_id
            for e in enrollments
            if e.status in (EnrollmentStatus.COMPLETED,) or e.certificate_issued
        }

    def _force_active(self, gap: GapDiagnostic) -> bool:
        return gap.gap_type in {
            GapType.MISSING_PREREQUISITE,
            GapType.ACTIVE_TRAINING_NEED,
        }

    # ---------------------------------------------------------------- scoring
    def _score_training(
        self,
        context: TeacherContext,
        training: Training,
        matched_gaps: list[GapDiagnostic],
        reason_codes: list[str],
        total_eligible: int,
    ) -> Recommendation:
        breakdown: dict[str, float] = {}

        gap_relevance = self._gap_relevance(training, matched_gaps)
        severity_priority = self._severity_priority(matched_gaps)
        prereq_compat = self._prereq_compatibility(context, training)
        effectiveness = self._training_effectiveness(context, training)
        urgency = self._urgency(context, matched_gaps)
        availability = self._availability(training)
        need_alignment = self._need_alignment(context, training)
        diversification = self._diversification_bonus(training, total_eligible)

        w = self.weights
        score = (
            w.gap_relevance * gap_relevance
            + w.severity_priority * severity_priority
            + w.prerequisite_compatibility * prereq_compat
            + w.training_effectiveness * effectiveness
            + w.urgency * urgency
            + w.availability * availability
            + w.need_alignment * need_alignment
            + w.diversification_bonus * diversification
        )
        score = round(max(0.0, min(1.0, score)), 4)

        breakdown = {
            "gap_relevance": round(gap_relevance, 4),
            "severity_priority": round(severity_priority, 4),
            "prerequisite_compatibility": round(prereq_compat, 4),
            "training_effectiveness": round(effectiveness, 4),
            "urgency": round(urgency, 4),
            "availability": round(availability, 4),
            "need_alignment": round(need_alignment, 4),
            "diversification_bonus": round(diversification, 4),
        }

        target_competencies = sorted(
            {
                g.competency_id or "unknown"
                for g in matched_gaps
                if g.competency_id
            }
        )
        target_knowledge_ids = sorted({g.knowledge_id for g in matched_gaps if g.knowledge_id})
        expected_progression = {}
        for link in training.competency_links:
            if link.knowledge_id in target_knowledge_ids or link.niveau_vise:
                expected_progression[link.knowledge_id] = {
                    "niveau_vise": link.niveau_vise,
                    "niveau_prerequis": link.niveau_prerequis,
                }

        prerequisite_status = "MET"
        missing_training_prereq = [
            pid
            for pid in training.prereq_training_ids
            if pid not in self._completed_trainings(context.enrollments)
        ]
        if missing_training_prereq:
            prerequisite_status = "BLOCKED"
        elif prereq_compat < 1.0:
            prerequisite_status = "PARTIAL"

        return Recommendation(
            training_id=training.training_id,
            title=training.title,
            recommendation_score=score,
            priority=self._priority_from_score(score),
            target_gap_ids=[
                g.id if hasattr(g, "id") else f"{g.teacher_id}:{g.knowledge_id}:{g.gap_type.value}"
                for g in matched_gaps
            ],
            target_competencies=target_competencies,
            expected_level_progression=expected_progression,
            prerequisite_status=prerequisite_status,
            estimated_duration_hours=training.duration_hours,
            available_from=training.available_from or training.start_date,
            reason_codes=reason_codes,
            human_readable_explanation=self._human_explanation(
                training, matched_gaps, breakdown, reason_codes
            ),
            data_quality_status=DataQualityStatus.COMPLETE,
            score_breakdown=breakdown,
        )

    # ------------------------------------------------- component calculations
    def _gap_relevance(
        self, training: Training, matched_gaps: list[GapDiagnostic]
    ) -> float:
        if not matched_gaps:
            return 0.0
        covered = training.target_knowledge_ids
        gaps = [g for g in matched_gaps if g.knowledge_id in covered]
        if not gaps:
            return 0.0
        return min(1.0, len(gaps) / max(len(matched_gaps), 1))

    def _severity_priority(self, matched_gaps: list[GapDiagnostic]) -> float:
        if not matched_gaps:
            return 0.0
        max_sev = max(SEVERITY_RANK[g.severity] for g in matched_gaps)
        return max_sev / 4.0

    def _prereq_compatibility(self, context: TeacherContext, training: Training) -> float:
        records = {r.knowledge_id: r for r in context.records}
        total = 0
        met = 0
        for link in training.competency_links:
            if link.niveau_prerequis is None:
                total += 1
                met += 1
                continue
            total += 1
            if link.knowledge_id in training.target_knowledge_ids:
                met += 1
                continue
            record = records.get(link.knowledge_id)
            if record is not None and record.current_level is not None:
                if record.current_level >= link.niveau_prerequis:
                    met += 1
        # training-level prerequisites
        completed = self._completed_trainings(context.enrollments)
        for pid in training.prereq_training_ids:
            total += 1
            if pid in completed:
                met += 1
        return (met / total) if total else 1.0

    def _training_effectiveness(
        self, context: TeacherContext, training: Training
    ) -> float:
        if training.effectiveness_score is not None:
            return training.effectiveness_score
        # historical proxy: average observed gain on linked knowledges
        gains = []
        for e in context.enrollments:
            if e.training_id != training.training_id:
                continue
            for ev in context.evaluations:
                if ev.training_id == e.training_id and ev.note is not None:
                    gains.append(min(ev.note / 20.0, 1.0))
        return sum(gains) / len(gains) if gains else 0.5

    def _urgency(
        self, context: TeacherContext, matched_gaps: list[GapDiagnostic]
    ) -> float:
        today = context.reference_date or date.today()
        max_urgency = 0.0
        for g in matched_gaps:
            if g.detected_at is None:
                continue
            age_days = (today - g.detected_at).days
            if age_days > 180:
                max_urgency = max(max_urgency, 1.0)
            else:
                max_urgency = max(max_urgency, age_days / 180.0)
        return max_urgency

    def _availability(self, training: Training) -> float:
        if training.capacity is None:
            return 1.0
        if training.seats_available:
            return 1.0 - (training.registration_count / training.capacity)
        return 0.0

    def _need_alignment(self, context: TeacherContext, training: Training) -> float:
        targeted = training.target_knowledge_ids
        for need in context.needs:
            if need.status != NeedStatus.APPROVED:
                continue
            if need.knowledge_id and need.knowledge_id in targeted:
                return 1.0
        return 0.0

    def _diversification_bonus(self, training: Training, total_eligible: int) -> float:
        # small bonus for trainings covering distinct knowledge clusters
        if total_eligible <= 1:
            return 1.0
        return 0.5

    # ------------------------------------------------------------ explanation
    def _reason_codes(
        self,
        context: TeacherContext,
        training: Training,
        matched_gaps: list[GapDiagnostic],
    ) -> list[str]:
        codes = ["GAP_RELEVANCE"]
        max_sev = max(SEVERITY_RANK[g.severity] for g in matched_gaps)
        if max_sev >= 4:
            codes.append("CRITICAL_SEVERITY")
        elif max_sev == 3:
            codes.append("HIGH_SEVERITY")
        if self._prereq_compatibility(context, training) == 1.0:
            codes.append("PREREQ_OK")
        if training.effectiveness_score is not None and training.effectiveness_score >= 0.7:
            codes.append("HIGH_EFFECTIVENESS")
        if training.capacity is not None:
            codes.append("CAPACITY_AVAILABLE")
        if self._need_alignment(context, training) == 1.0:
            codes.append("NEED_ALIGNED")
        return codes

    @staticmethod
    def _priority_from_score(score: float) -> RecommendationPriority:
        if score >= 0.75:
            return RecommendationPriority.HIGH
        if score >= 0.5:
            return RecommendationPriority.MEDIUM
        return RecommendationPriority.LOW

    def _human_explanation(
        self,
        training: Training,
        matched_gaps: list[GapDiagnostic],
        breakdown: dict[str, float],
        reason_codes: list[str],
    ) -> str:
        names = "; ".join(sorted({g.knowledge_name for g in matched_gaps if g.knowledge_name}))
        sev = max(SEVERITY_RANK[g.severity] for g in matched_gaps)
        sev_label = {4: "critique", 3: "élevée", 2: "moyenne", 1: "faible"}[sev]
        score = round(
            breakdown["gap_relevance"] * 0.40
            + breakdown["severity_priority"] * 0.15
            + breakdown["prerequisite_compatibility"] * 0.10
            + breakdown["training_effectiveness"] * 0.10
            + breakdown["urgency"] * 0.10
            + breakdown["availability"] * 0.05
            + breakdown["need_alignment"] * 0.05
            + breakdown["diversification_bonus"] * 0.05,
            2,
        )
        return (
            f"Formation « {training.title} » recommandée (score {score:.2f}/1): "
            f"elle cible {names or 'vos gaps actifs'} de sévérité {sev_label} "
            f"et s'intègre à votre parcours. Raisons: {', '.join(reason_codes)}."
        )
