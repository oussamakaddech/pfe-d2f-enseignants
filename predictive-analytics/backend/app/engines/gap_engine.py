"""GapEngine — moteur déterministe et explicable de détection de gaps.

Principe scientifique:
    Un gap directement calculable par une règle métier ne doit JAMAIS être
    prédit par du ML. Ce moteur est 100% déterministe:
        gap_level = max(required_level - current_level, 0)

Règles de base:
  - Aucun enregistrement de compétence != aucun gap:
      un enseignant sans compétences => INCOMPLETE_PROFILE / MISSING_COMPETENCIES.
  - gap_level = max(required - current, 0) quand les deux sont connus.
  - Un savoir sans enregistrement => MISSING_ASSIGNMENT (DATA_INCOMPLETE si le
    profil de l'enseignant est partiellement rempli).
  - Prérequis non satisfaits => MISSING_PREREQUISITE.
  - Évaluation périmée => STALE_ASSESSMENT (escalade le déficit associé).
  - Besoin actif non résolu => ACTIVE_TRAINING_NEED.

Aucune dépendance API/DB: le moteur consomme un TeacherContext (Pydantic).
"""

from __future__ import annotations

import logging
from dataclasses import dataclass
from datetime import date, timedelta
from typing import Any, Callable

from app.domain.entities.gap import (
    GapAggregate,
    GapDiagnostic,
    TeacherGapAnalysis,
)
from app.domain.entities.competency import Knowledge, KnowledgeRecord
from app.domain.enums.gap import GapSeverity, GapType
from app.domain.enums.quality import DataQualityStatus
from app.domain.enums.training import NeedStatus
from app.domain.services.context import TeacherContext, apply_aggregate, max_severity

logger = logging.getLogger(__name__)

SEVERITY_RANK = {
    GapSeverity.LOW: 1,
    GapSeverity.MEDIUM: 2,
    GapSeverity.HIGH: 3,
    GapSeverity.CRITICAL: 4,
}


def severity_for_gap_level(gap_level: int) -> GapSeverity:
    if gap_level >= 4:
        return GapSeverity.CRITICAL
    if gap_level == 3:
        return GapSeverity.HIGH
    if gap_level == 2:
        return GapSeverity.MEDIUM
    return GapSeverity.LOW


def escalate(severity: GapSeverity, steps: int = 1) -> GapSeverity:
    rank = SEVERITY_RANK[severity] + steps
    rank = min(max(rank, 1), 4)
    return {1: GapSeverity.LOW, 2: GapSeverity.MEDIUM, 3: GapSeverity.HIGH, 4: GapSeverity.CRITICAL}[rank]


@dataclass(frozen=True)
class GapEngineConfig:
    stale_assessment_days: int = 365
    active_need_statuses: tuple = (NeedStatus.APPROVED,)


class GapEngine:
    """Détecte les gaps d'un enseignant à partir d'un TeacherContext."""

    def __init__(self, config: GapEngineConfig | None = None) -> None:
        self.config = config or GapEngineConfig()

    # ------------------------------------------------------------------ public
    def analyze(self, context: TeacherContext) -> TeacherGapAnalysis:
        teacher = context.teacher
        today = context.reference_date or date.today()
        gaps: list[GapDiagnostic] = []

        records_by_knowledge: dict[str, KnowledgeRecord] = {}
        for r in context.records:
            if r.knowledge_id not in records_by_knowledge:
                records_by_knowledge[r.knowledge_id] = r
            else:
                existing = records_by_knowledge[r.knowledge_id]
                if (r.last_assessment_date or date.min) > (
                    existing.last_assessment_date or date.min
                ):
                    records_by_knowledge[r.knowledge_id] = r

        has_records = bool(context.records)

        if not has_records:
            gaps.append(
                self._incomplete_profile_gap(teacher, today)
            )
            analysis = TeacherGapAnalysis(
                teacher_id=teacher.teacher_id,
                gaps=gaps,
                aggregates=[],
                data_quality_status=DataQualityStatus.MISSING_COMPETENCIES,
                detected_at=today,
                has_competency_records=False,
                warnings=["Aucune compétence enregistrée pour cet enseignant."],
            )
            return analysis

        needs_by_knowledge: dict[str, list] = {}
        for need in context.needs:
            if need.status in self.config.active_need_statuses and need.knowledge_id:
                needs_by_knowledge.setdefault(need.knowledge_id, []).append(need)

        for knowledge in context.hierarchy.knowledges:
            record = records_by_knowledge.get(knowledge.knowledge_id)
            knowledge_gaps = self._detect_for_knowledge(
                context, knowledge, record, needs_by_knowledge, today
            )
            gaps.extend(knowledge_gaps)

        gaps = self._finalize_severities(gaps)

        aggregates = self._build_aggregates(teacher.teacher_id, gaps)

        dq = self._data_quality(has_records, gaps)
        warnings = self._warnings(gaps, dq)

        return TeacherGapAnalysis(
            teacher_id=teacher.teacher_id,
            gaps=gaps,
            aggregates=aggregates,
            data_quality_status=dq,
            detected_at=today,
            has_competency_records=has_records,
            warnings=warnings,
        )

    # ------------------------------------------------------------- per knowledge
    def _detect_for_knowledge(
        self,
        context: TeacherContext,
        knowledge: Knowledge,
        record: KnowledgeRecord | None,
        needs_by_knowledge: dict[str, list],
        today: date,
    ) -> list[GapDiagnostic]:
        teacher_id = context.teacher.teacher_id
        required = knowledge.required_level
        results: list[GapDiagnostic] = []

        def base(sub_id: str | None, comp_id: str | None, dom_id: str | None) -> dict[str, str]:
            return {
                "domain_id": dom_id or "",
                "competency_id": comp_id or "",
                "sub_competency_id": sub_id or "",
            }

        sub = context.hierarchy.sub_by_id(knowledge.sub_competency_id)
        comp = context.hierarchy.competency_by_id(sub.competency_id) if sub else None
        dom = context.hierarchy.domain_by_id(comp.domain_id) if comp else None
        b = base(sub.sub_competency_id if sub else None, comp.competency_id if comp else None, dom.domain_id if dom else None)

        # --- MISSING_ASSIGNMENT / INCOMPLETE_PROFILE --------------------------
        if record is None:
            results.append(
                self._mk_gap(
                    teacher_id,
                    knowledge,
                    b,
                    gap_type=GapType.MISSING_ASSIGNMENT,
                    current_level=None,
                    required_level=required,
                    gap_level=required,
                    severity=self._missing_assignment_severity(required),
                    rule_id="GAP.RULE.MISSING_ASSIGNMENT",
                    rule_label="Savoir non renseigné",
                    formula="required_level",
                    human=(
                        f"Aucun niveau renseigné pour « {knowledge.name} » "
                        f"(requis {required}). Considéré non acquis."
                    ),
                    evidence=[
                        {"source": "teacher_competencies", "detail": "no record for knowledge", "reference_value": required}
                    ],
                    data_quality=DataQualityStatus.DATA_INCOMPLETE,
                    detected_at=today,
                )
            )
            return results

        current = record.current_level
        last_assessed = record.last_assessment_date

        # --- INCOMPLETE_PROFILE (niveau manquant sur enregistrement) -----------
        if current is None:
            results.append(
                self._mk_gap(
                    teacher_id,
                    knowledge,
                    b,
                    gap_type=GapType.INCOMPLETE_PROFILE,
                    current_level=None,
                    required_level=required,
                    gap_level=0,
                    severity=GapSeverity.MEDIUM,
                    rule_id="GAP.RULE.INCOMPLETE_RECORD",
                    rule_label="Niveau manquant",
                    formula="current_level is null",
                    human=f"Le niveau de « {knowledge.name} » est manquant.",
                    evidence=[{"source": "teacher_competencies", "detail": "current_level null"}],
                    data_quality=DataQualityStatus.DATA_INCOMPLETE,
                    detected_at=today,
                )
            )
            return results

        deficit = max(required - current, 0)
        severity = severity_for_gap_level(deficit)

        # --- LEVEL_DEFICIT ----------------------------------------------------
        if deficit > 0:
            results.append(
                self._mk_gap(
                    teacher_id,
                    knowledge,
                    b,
                    gap_type=GapType.LEVEL_DEFICIT,
                    current_level=current,
                    required_level=required,
                    gap_level=deficit,
                    severity=severity,
                    rule_id="GAP.RULE.LEVEL_DEFICIT",
                    rule_label="Écart de niveau",
                    formula="max(required_level - current_level, 0)",
                    human=(
                        f"Niveau actuel {current} < requis {required} pour "
                        f"« {knowledge.name} » (écart {deficit})."
                    ),
                    evidence=[
                        {"source": "assessment", "observed_value": current, "reference_value": required}
                    ],
                    data_quality=DataQualityStatus.COMPLETE,
                    detected_at=today,
                )
            )

        # --- MISSING_PREREQUISITE --------------------------------------------
        prereq_deficit = self._prerequisite_deficit(context, knowledge)
        if prereq_deficit and prereq_deficit > 0:
            results.append(
                self._mk_gap(
                    teacher_id,
                    knowledge,
                    b,
                    gap_type=GapType.MISSING_PREREQUISITE,
                    current_level=current,
                    required_level=required,
                    gap_level=max(deficit, prereq_deficit),
                    severity=escalate(severity_for_gap_level(max(deficit, prereq_deficit)), 1),
                    rule_id="GAP.RULE.MISSING_PREREQUISITE",
                    rule_label="Prérequis manquant",
                    formula="prereq.current_level < prereq.required_level",
                    human=(
                        f"Un prérequis de « {knowledge.name} » n'est pas satisfait "
                        f"(écart {prereq_deficit})."
                    ),
                    evidence=[
                        {"source": "prerequisites", "detail": "prerequisite deficit", "observed_value": prereq_deficit}
                    ],
                    data_quality=DataQualityStatus.COMPLETE,
                    detected_at=today,
                )
            )

        # --- STALE_ASSESSMENT ------------------------------------------------
        stale = self._is_stale(last_assessed, today)
        if stale:
            results.append(
                self._mk_gap(
                    teacher_id,
                    knowledge,
                    b,
                    gap_type=GapType.STALE_ASSESSMENT,
                    current_level=current,
                    required_level=required,
                    gap_level=deficit,
                    severity=GapSeverity.LOW if deficit == 0 else escalate(severity, 1),
                    rule_id="GAP.RULE.STALE_ASSESSMENT",
                    rule_label="Évaluation périmée",
                    formula=f"last_assessment_date < today - {self.config.stale_assessment_days}d",
                    human=(
                        f"La dernière évaluation de « {knowledge.name} » date de "
                        f"{last_assessed.isoformat() if last_assessed else 'jamais'}, "
                        f"soit plus de {self.config.stale_assessment_days} jours."
                    ),
                    evidence=[
                        {"source": "assessments", "observed_value": last_assessed.isoformat() if last_assessed else None}
                    ],
                    data_quality=DataQualityStatus.STALE,
                    detected_at=today,
                )
            )

        # --- ACTIVE_TRAINING_NEED --------------------------------------------
        if knowledge.knowledge_id in needs_by_knowledge:
            results.append(
                self._mk_gap(
                    teacher_id,
                    knowledge,
                    b,
                    gap_type=GapType.ACTIVE_TRAINING_NEED,
                    current_level=current,
                    required_level=required,
                    gap_level=deficit,
                    severity=max_severity([GapSeverity.MEDIUM, severity]),
                    rule_id="GAP.RULE.ACTIVE_TRAINING_NEED",
                    rule_label="Besoin actif non résolu",
                    formula="exists approved need & gap persists",
                    human=(
                        f"Un besoin de formation approuvé concerne « {knowledge.name} » "
                        f"mais l'écart persiste."
                    ),
                    evidence=[
                        {
                            "source": "training_needs",
                            "detail": "approved need",
                            "observed_value": [n.need_id for n in needs_by_knowledge[knowledge.knowledge_id]],
                        }
                    ],
                    data_quality=DataQualityStatus.COMPLETE,
                    detected_at=today,
                )
            )

        return results

    # ------------------------------------------------------------------ helpers
    def _prerequisite_deficit(
        self, context: TeacherContext, knowledge: Knowledge
    ) -> int | None:
        records = {r.knowledge_id: r for r in context.records}
        max_deficit = 0
        found = False
        for prereq_id in knowledge.prereq_knowledge_ids:
            prereq = context.hierarchy.knowledge_by_id(prereq_id)
            if prereq is None:
                continue
            found = True
            record = records.get(prereq_id)
            if record is None or record.current_level is None:
                max_deficit = max(max_deficit, prereq.required_level)
            else:
                max_deficit = max(
                    max_deficit, max(prereq.required_level - record.current_level, 0)
                )
        return max_deficit if found else None

    def _is_stale(self, last_assessed: date | None, today: date) -> bool:
        if last_assessed is None:
            return True
        return (today - last_assessed) > timedelta(days=self.config.stale_assessment_days)

    def _finalize_severities(self, gaps: list[GapDiagnostic]) -> list[GapDiagnostic]:
        return [self._clamp(g) for g in gaps]

    def _clamp(self, gap: GapDiagnostic) -> GapDiagnostic:
        if gap.severity == GapSeverity.CRITICAL:
            return gap
        # escalate if critical flag on knowledge via evidence is unnecessary; keep as-is
        return gap

    def _missing_assignment_severity(self, required: int) -> GapSeverity:
        if required >= 4:
            return GapSeverity.CRITICAL
        if required == 3:
            return GapSeverity.HIGH
        if required == 2:
            return GapSeverity.MEDIUM
        return GapSeverity.LOW

    def _incomplete_profile_gap(self, teacher, today: date) -> GapDiagnostic:
        return GapDiagnostic(
            teacher_id=teacher.teacher_id,
            domain_id="",
            competency_id="",
            sub_competency_id="",
            knowledge_id="",
            knowledge_code="",
            knowledge_name="Profil de compétences vide",
            knowledge_type="THEORETICAL",
            current_level=None,
            required_level=None,
            gap_level=0,
            gap_type=GapType.INCOMPLETE_PROFILE,
            severity=GapSeverity.CRITICAL,
            evidence=[
                {"source": "teacher_competencies", "detail": "no competency records"}
            ],
            explainability=None,
            data_quality_status=DataQualityStatus.MISSING_COMPETENCIES,
            detected_at=today,
        )

    def _mk_gap(
        self,
        teacher_id: str,
        knowledge: Knowledge,
        hierarchy_ids: dict[str, str],
        *,
        gap_type: GapType,
        current_level: int | None,
        required_level: int | None,
        gap_level: int,
        severity: GapSeverity,
        rule_id: str,
        rule_label: str,
        formula: str,
        human: str,
        evidence: list[dict[str, Any]],
        data_quality: DataQualityStatus,
        detected_at: date,
    ) -> GapDiagnostic:
        return GapDiagnostic(
            teacher_id=teacher_id,
            domain_id=hierarchy_ids["domain_id"],
            competency_id=hierarchy_ids["competency_id"],
            sub_competency_id=hierarchy_ids["sub_competency_id"],
            knowledge_id=knowledge.knowledge_id,
            knowledge_code=knowledge.code,
            knowledge_name=knowledge.name,
            knowledge_type=knowledge.knowledge_type.value,
            current_level=current_level,
            required_level=required_level,
            gap_level=gap_level,
            gap_type=gap_type,
            severity=severity,
            evidence=evidence,
            explainability={
                "rule_id": rule_id,
                "rule_label": rule_label,
                "formula": formula,
                "human_readable": human,
                "evidence": evidence,
            },
            data_quality_status=data_quality,
            detected_at=detected_at,
        )

    # --------------------------------------------------------------- aggregation
    def _build_aggregates(
        self, teacher_id: str, gaps: list[GapDiagnostic]
    ) -> list[GapAggregate]:
        aggregates: list[GapAggregate] = []

        aggregates.extend(
            apply_aggregate(
                teacher_id,
                gaps,
                "SUB_COMPETENCY",
                key_fn=lambda g: g.sub_competency_id,
                ref_id_attr="sub_competency_id",
                name_attr="knowledge_name",
                parent_attr="competency_id",
            )
        )
        aggregates.extend(
            apply_aggregate(
                teacher_id,
                gaps,
                "COMPETENCY",
                key_fn=lambda g: g.competency_id,
                ref_id_attr="competency_id",
                name_attr="knowledge_name",
                parent_attr="domain_id",
            )
        )
        aggregates.extend(
            apply_aggregate(
                teacher_id,
                gaps,
                "DOMAIN",
                key_fn=lambda g: g.domain_id,
                ref_id_attr="domain_id",
                name_attr="knowledge_name",
            )
        )
        return aggregates

    # ----------------------------------------------------------- data quality
    def _data_quality(
        self, has_records: bool, gaps: list[GapDiagnostic]
    ) -> DataQualityStatus:
        if not has_records:
            return DataQualityStatus.MISSING_COMPETENCIES
        if any(g.data_quality_status == DataQualityStatus.DATA_INCOMPLETE for g in gaps):
            return DataQualityStatus.DATA_INCOMPLETE
        if any(g.data_quality_status == DataQualityStatus.STALE for g in gaps):
            return DataQualityStatus.STALE
        return DataQualityStatus.COMPLETE

    def _warnings(
        self, gaps: list[GapDiagnostic], dq: DataQualityStatus
    ) -> list[str]:
        warnings: list[str] = []
        if dq == DataQualityStatus.DATA_INCOMPLETE:
            warnings.append("Certaines compétences n'ont pas de niveau renseigné.")
        if dq == DataQualityStatus.MISSING_COMPETENCIES:
            warnings.append("Aucune compétence enregistrée: profil incomplet.")
        if any(g.gap_type == GapType.STALE_ASSESSMENT for g in gaps):
            warnings.append("Des évaluations sont périmées.")
        return warnings
