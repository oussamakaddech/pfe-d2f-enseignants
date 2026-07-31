"""DashboardEngine — agrégations globales pour le pilotage."""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any

from pydantic import BaseModel, Field

from app.domain.enums.gap import GapSeverity
from app.engines.gap_engine import GapEngine
from app.engines.risk_engine import RiskEngine
from app.infrastructure.repositories.curated_repository import CuratedRepository


class GlobalKpis(BaseModel):
    total_teachers: int = 0
    teachers_with_data: int = 0
    teachers_at_risk: int = 0
    avg_risk_score: float = 0.0
    total_open_gaps: int = 0
    critical_gaps: int = 0
    open_needs: int = 0
    enrollment_rate: float = 0.0
    completion_rate: float = 0.0


class RiskRow(BaseModel):
    teacher_id: str
    department_code: str = ""
    risk_score: float = 0.0
    risk_level: str = "LOW"
    top_gap: str = ""
    gap_count: int = 0


class HeatmapCell(BaseModel):
    department_code: str = ""
    domain_id: str = ""
    gap_count: int = 0
    max_severity: str = "LOW"
    weighted_severity: float = 0.0


class TrainingDemandRow(BaseModel):
    training_id: str = ""
    title: str = ""
    demand_count: int = 0
    avg_relevance: float = 0.0
    target_domains: list[str] = Field(default_factory=list)


class DashboardEngine:
    """Agrège les diagnostics de tous les enseignants (batch, cacheable)."""

    def __init__(self, repository: CuratedRepository) -> None:
        self.repo = repository
        self.gap_engine = GapEngine()
        self.risk_engine = RiskEngine()

    def kpis(self) -> GlobalKpis:
        teacher_ids = self.repo.teacher_ids()
        k = GlobalKpis(total_teachers=len(teacher_ids))
        open_gaps = 0
        critical = 0
        risks: list[float] = []
        enroll_df = self.repo.df("enrollments")
        completed = 0
        total_enrollments = len(enroll_df)
        if total_enrollments:
            completed = int(
                (enroll_df["status"].str.upper() == "COMPLETED").sum()
            )
            k.completion_rate = round(completed / total_enrollments, 4)
        need_df = self.repo.df("training_needs")
        k.open_needs = int(
            need_df["status"].str.upper().isin(["APPROVED", "PENDING"]).sum()
        )

        for tid in teacher_ids:
            context = self.repo.build_context(tid)
            if context is None or not context.records:
                continue
            k.teachers_with_data += 1
            analysis = self.gap_engine.analyze(context)
            gaps = [g for g in analysis.gaps if g.gap_level > 0]
            open_gaps += len(gaps)
            critical += sum(1 for g in gaps if g.severity == GapSeverity.CRITICAL)
            risk = self.risk_engine.evaluate(context, analysis)
            risks.append(risk.risk_score)
            if risk.risk_score >= 0.5:
                k.teachers_at_risk += 1

        k.total_open_gaps = open_gaps
        k.critical_gaps = critical
        k.avg_risk_score = round(sum(risks) / len(risks), 4) if risks else 0.0
        return k

    def teachers_at_risk(self, threshold: float = 0.5) -> list[RiskRow]:
        rows: list[RiskRow] = []
        for tid in self.repo.teacher_ids():
            context = self.repo.build_context(tid)
            if context is None:
                continue
            analysis = self.gap_engine.analyze(context)
            risk = self.risk_engine.evaluate(context, analysis)
            if risk.risk_score >= threshold:
                gaps = [g for g in analysis.gaps if g.gap_level > 0]
                top = ""
                if gaps:
                    worst = max(gaps, key=lambda g: g.gap_level)
                    top = f"{worst.knowledge_name} ({worst.severity.value})"
                rows.append(
                    RiskRow(
                        teacher_id=tid,
                        department_code=context.teacher.department_code,
                        risk_score=risk.risk_score,
                        risk_level=risk.risk_level,
                        top_gap=top,
                        gap_count=len(gaps),
                    )
                )
        rows.sort(key=lambda r: r.risk_score, reverse=True)
        return rows

    def gap_heatmap(self) -> list[HeatmapCell]:
        cells: dict[tuple[str, str], list[int]] = {}
        severities: dict[tuple[str, str], list[GapSeverity]] = {}
        for tid in self.repo.teacher_ids():
            context = self.repo.build_context(tid)
            if context is None:
                continue
            analysis = self.gap_engine.analyze(context)
            for gap in analysis.gaps:
                if gap.gap_level <= 0 and gap.domain_id == "":
                    continue
                dept = context.teacher.department_code
                key = (dept, gap.domain_id)
                cells.setdefault(key, []).append(gap.gap_level)
                severities.setdefault(key, []).append(gap.severity)
        out: list[HeatmapCell] = []
        for (dept, domain), values in cells.items():
            max_sev = max(severities[key], key=lambda s: s.value if hasattr(s, "value") else s)
            out.append(
                HeatmapCell(
                    department_code=dept,
                    domain_id=domain,
                    gap_count=len(values),
                    max_severity=str(max_sev.value if hasattr(max_sev, "value") else max_sev),
                    weighted_severity=round(sum(values) / 4.0, 4),
                )
            )
        out.sort(key=lambda c: c.weighted_severity, reverse=True)
        return out

    def training_demand(self) -> list[TrainingDemandRow]:
        """Demande collective: gaps ouverts par savoir + besoins ouverts."""
        gap_by_knowledge: dict[str, int] = {}
        domain_by_knowledge: dict[str, str] = {}
        for tid in self.repo.teacher_ids():
            context = self.repo.build_context(tid)
            if context is None:
                continue
            analysis = self.gap_engine.analyze(context)
            for gap in analysis.gaps:
                if gap.gap_level <= 0 or not gap.knowledge_id:
                    continue
                gap_by_knowledge[gap.knowledge_id] = (
                    gap_by_knowledge.get(gap.knowledge_id, 0) + 1
                )
                domain_by_knowledge.setdefault(gap.knowledge_id, gap.domain_id)
        need_df = self.repo.df("training_needs")
        for _, row in need_df.iterrows():
            kn = str(row.get("knowledge_id", "") or "")
            if kn and str(row.get("status", "")).upper() in {"APPROVED", "PENDING"}:
                gap_by_knowledge[kn] = gap_by_knowledge.get(kn, 0) + 1
                domain_by_knowledge.setdefault(kn, "")

        rows: list[TrainingDemandRow] = []
        for training in self.repo.trainings():
            target_kn = training.target_knowledge_ids
            demand = sum(gap_by_knowledge.get(kn, 0) for kn in target_kn)
            if demand <= 0:
                continue
            rows.append(
                TrainingDemandRow(
                    training_id=training.training_id,
                    title=training.title,
                    demand_count=demand,
                    avg_relevance=round(
                        demand / max(self.repo.teacher_ids().__len__(), 1), 4
                    ),
                    target_domains=sorted(
                        {domain_by_knowledge.get(kn, "") for kn in target_kn if domain_by_knowledge.get(kn)}
                    ),
                )
            )
        rows.sort(key=lambda r: r.demand_count, reverse=True)
        return rows
