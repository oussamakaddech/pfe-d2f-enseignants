"""RiskEngine — score de risque de stagnation d'un enseignant.

Déterministe (règles) avec option d'enrichissement par prédiction ML
(stagnation_risk_future) quand elle est disponible.
"""

from __future__ import annotations

from datetime import date
from typing import Any

from pydantic import BaseModel, Field

from app.domain.entities.gap import TeacherGapAnalysis
from app.domain.enums.gap import GapSeverity, GapType
from app.domain.services.context import TeacherContext


class RiskFactor(BaseModel):
    code: str
    label: str
    weight: float
    contribution: float
    detail: str = ""


class RiskProfile(BaseModel):
    model_config = {"protected_namespaces": ()}

    teacher_id: str
    risk_score: float
    risk_level: str
    factors: list[RiskFactor] = Field(default_factory=list)
    ml_stagnation_probability: float | None = None
    model_version: str | None = None


class RiskEngine:
    def __init__(self, stagnation_weights: dict[str, float] | None = None) -> None:
        self.weights = stagnation_weights or {
            "critical_gap_pressure": 0.25,
            "high_gap_pressure": 0.20,
            "stale_assessments": 0.20,
            "unresolved_needs": 0.20,
            "low_historical_completion": 0.15,
        }
        total = sum(self.weights.values())
        assert abs(total - 1.0) < 1e-6, "stagnation weights must sum to 1"

    def evaluate(
        self,
        context: TeacherContext,
        gap_analysis: TeacherGapAnalysis,
        ml_probability: float | None = None,
        model_version: str | None = None,
    ) -> RiskProfile:
        factors: list[RiskFactor] = []

        critical = sum(
            1 for g in gap_analysis.gaps if g.severity == GapSeverity.CRITICAL
        )
        high = sum(1 for g in gap_analysis.gaps if g.severity == GapSeverity.HIGH)
        stale = sum(
            1 for g in gap_analysis.gaps if g.gap_type == GapType.STALE_ASSESSMENT
        )
        needs_open = sum(
            1
            for n in context.needs
            if n.status.value in ("APPROVED", "PENDING")
        )

        completed = [e for e in context.enrollments if e.status.value == "COMPLETED"]
        total_enrollments = len(context.enrollments)
        completion_rate = (
            (len(completed) / total_enrollments) if total_enrollments else 0.5
        )

        factors.append(
            RiskFactor(
                code="CRITICAL_GAP_PRESSURE",
                label="Pression gaps critiques",
                weight=self.weights["critical_gap_pressure"],
                contribution=min(1.0, critical),
                detail=f"{critical} gaps critiques",
            )
        )
        factors.append(
            RiskFactor(
                code="HIGH_GAP_PRESSURE",
                label="Pression gaps élevés",
                weight=self.weights["high_gap_pressure"],
                contribution=min(1.0, high),
                detail=f"{high} gaps élevés",
            )
        )
        factors.append(
            RiskFactor(
                code="STALE_ASSESSMENTS",
                label="Évaluations périmées",
                weight=self.weights["stale_assessments"],
                contribution=min(1.0, stale / 3.0),
                detail=f"{stale} évaluations périmées",
            )
        )
        factors.append(
            RiskFactor(
                code="UNRESOLVED_NEEDS",
                label="Besoins non résolus",
                weight=self.weights["unresolved_needs"],
                contribution=min(1.0, needs_open),
                detail=f"{needs_open} besoins ouverts",
            )
        )
        factors.append(
            RiskFactor(
                code="LOW_COMPLETION",
                label="Taux de complétion historique",
                weight=self.weights["low_historical_completion"],
                contribution=1.0 - completion_rate,
                detail=f"taux de complétion {completion_rate:.2f}",
            )
        )

        score = sum(f.weight * f.contribution for f in factors)

        if ml_probability is not None:
            # combine règles + ML (mean) — l'explicabilité reste prioritaire
            score = 0.7 * score + 0.3 * ml_probability

        score = round(max(0.0, min(1.0, score)), 4)
        level = self._level(score)

        return RiskProfile(
            teacher_id=context.teacher.teacher_id,
            risk_score=score,
            risk_level=level,
            factors=factors,
            ml_stagnation_probability=(
                round(ml_probability, 4) if ml_probability is not None else None
            ),
            model_version=model_version,
        )

    def _level(self, score: float) -> str:
        if score >= 0.75:
            return "CRITICAL"
        if score >= 0.5:
            return "HIGH"
        if score >= 0.25:
            return "MEDIUM"
        return "LOW"
