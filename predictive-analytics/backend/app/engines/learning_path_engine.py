"""LearningPathEngine — ordonne les formations recommandées en parcours.

- Ordre topologique sur les prérequis (formation-level + knowledge-level).
- Détection de cycles (report, ne pas boucler).
- Distingue les étapes BLOQUANTES (prérequis manquant) des OPTIONNELLES.
- Calcule la durée totale estimée.
- Propose des suggestions futures si la formation n'est pas encore ouverte.
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date
from typing import Any

from pydantic import BaseModel, Field

from app.domain.entities.training import Training
from app.domain.enums.training import RecommendationPriority
from app.engines.recommendation_engine import (
    Recommendation,
    RecommendationResult,
    RecommendationWeights,
)

from app.domain.services.context import TeacherContext


class LearningPathStep(BaseModel):
    training_id: str
    title: str
    position: int
    score: float
    priority: RecommendationPriority
    is_blocking: bool = False
    blocked_by: list[str] = Field(default_factory=list)
    target_gap_ids: list[str] = Field(default_factory=list)
    estimated_duration_hours: float = 0.0
    available_from: date | None = None
    status: str = "PLANNED"  # PLANNED | BLOCKED | FUTURE_SUGGESTION


class LearningPath(BaseModel):
    teacher_id: str
    steps: list[LearningPathStep] = Field(default_factory=list)
    total_duration_hours: float = 0.0
    cycles_detected: list[list[str]] = Field(default_factory=list)
    blocking_steps: list[LearningPathStep] = Field(default_factory=list)
    optional_steps: list[LearningPathStep] = Field(default_factory=list)
    future_suggestions: list[LearningPathStep] = Field(default_factory=list)


class LearningPathEngine:
    def __init__(self) -> None:
        pass

    def build(
        self,
        context: TeacherContext,
        recommendation_result: RecommendationResult,
    ) -> LearningPath:
        path = LearningPath(teacher_id=context.teacher.teacher_id)
        today = context.reference_date or date.today()

        recs = recommendation_result.recommendations
        if not recs:
            return path

        trainings = {t.training_id: t for t in context.trainings}
        by_id = {r.training_id: r for r in recs}

        # ---- dependency graph: training A depends on B if B is a prereq ----
        graph: dict[str, list[str]] = {}
        prereq_map: dict[str, list[str]] = {}
        for rec in recs:
            graph.setdefault(rec.training_id, [])
            training = trainings.get(rec.training_id)
            prereqs: list[str] = list(training.prereq_training_ids) if training else []
            for pid in prereqs:
                if pid in by_id:
                    graph.setdefault(pid, []).append(rec.training_id)
            prereq_map[rec.training_id] = prereqs

        cycles = self._detect_cycles(graph)
        path.cycles_detected = cycles

        # ---- topological order (Kahn) with cycle-tolerant fallback ----
        ordered = self._topological_sort(graph, cycles)

        positions: dict[str, int] = {}
        for position, tid in enumerate(ordered, start=1):
            positions[tid] = position

        for tid in ordered:
            rec = by_id[tid]
            training = trainings.get(tid)
            prereqs = prereq_map[tid]
            missing_prereqs = [p for p in prereqs if p not in by_id]
            in_cycle = any(tid in c for c in cycles)
            is_future = (
                training is not None
                and training.available_from is not None
                and training.available_from > today
            )

            is_blocking = bool(missing_prereqs) or in_cycle
            status = "PLANNED"
            if is_blocking:
                status = "BLOCKED"
            if is_future:
                status = "FUTURE_SUGGESTION"

            step = LearningPathStep(
                training_id=tid,
                title=rec.title,
                position=positions[tid],
                score=rec.recommendation_score,
                priority=rec.priority,
                is_blocking=is_blocking,
                blocked_by=missing_prereqs,
                target_gap_ids=rec.target_gap_ids,
                estimated_duration_hours=rec.estimated_duration_hours,
                available_from=rec.available_from,
                status=status,
            )
            path.steps.append(step)

        path.total_duration_hours = round(
            sum(s.estimated_duration_hours for s in path.steps), 2
        )
        path.blocking_steps = [s for s in path.steps if s.status == "BLOCKED"]
        path.optional_steps = [s for s in path.steps if not s.is_blocking]
        path.future_suggestions = [s for s in path.steps if s.status == "FUTURE_SUGGESTION"]

        # ---- future suggestions: trainings relevant to gaps but not yet open ----
        excluded = {e["training_id"]: e["reason"] for e in recommendation_result.excluded_trainings}
        for tid, reason in excluded.items():
            training = trainings.get(tid)
            if training is None:
                continue
            is_future = (
                training.available_from is not None and training.available_from > today
            ) or (training.start_date is not None and training.start_date > today)
            if reason in {"REGISTRATION_CLOSED", "NOT_ACTIVE"} and is_future:
                if tid in by_id:
                    continue
                path.future_suggestions.append(
                    LearningPathStep(
                        training_id=tid,
                        title=training.title,
                        position=0,
                        score=0.0,
                        priority=RecommendationPriority.LOW,
                        is_blocking=False,
                        estimated_duration_hours=training.duration_hours,
                        available_from=training.available_from or training.start_date,
                        status="FUTURE_SUGGESTION",
                    )
                )
        return path

    # ------------------------------------------------------------------ helpers
    def _detect_cycles(self, graph: dict[str, list[str]]) -> list[list[str]]:
        WHITE, GRAY, BLACK = 0, 1, 2
        color: dict[str, int] = {node: WHITE for node in graph}
        cycles: list[list[str]] = []
        stack: list[str] = []

        def dfs(node: str) -> None:
            color[node] = GRAY
            stack.append(node)
            for neighbor in graph.get(node, []):
                if color.get(neighbor, WHITE) == GRAY:
                    if neighbor in stack:
                        cycle = stack[stack.index(neighbor) :] + [neighbor]
                        cycles.append(cycle)
                elif color.get(neighbor, WHITE) == WHITE:
                    dfs(neighbor)
            stack.pop()
            color[node] = BLACK

        for node in graph:
            if color.get(node, WHITE) == WHITE:
                dfs(node)
        # dedupe cycles
        unique: list[list[str]] = []
        seen: set[str] = set()
        for cycle in cycles:
            key = ",".join(sorted(cycle))
            if key not in seen:
                seen.add(key)
                unique.append(cycle)
        return unique

    def _topological_sort(
        self, graph: dict[str, list[str]], cycles: list[list[str]]
    ) -> list[str]:
        in_cycle: set[str] = set()
        for cycle in cycles:
            in_cycle.update(cycle)

        indegree: dict[str, int] = {n: 0 for n in graph}
        for node, neighbors in graph.items():
            for n in neighbors:
                indegree[n] = indegree.get(n, 0) + 1

        queue = sorted([n for n in graph if indegree.get(n, 0) == 0])
        ordered: list[str] = []
        while queue:
            node = queue.pop(0)
            ordered.append(node)
            for neighbor in sorted(graph.get(node, [])):
                indegree[neighbor] -= 1
                if indegree[neighbor] == 0:
                    queue.append(neighbor)

        # append nodes not ordered (cycles) at the end, sorted by score desc
        remaining = sorted(
            [n for n in graph if n not in ordered],
            key=lambda n: 0,
        )
        ordered.extend(remaining)
        return ordered
