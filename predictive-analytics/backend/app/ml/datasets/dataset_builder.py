"""Construction des datasets supervisés (temporels, sans fuite).

Chaque builder:
  1. produit des lignes (teacher, événement) triées par date d'événement
  2. calcule les features strictement avec des données <= date événement
  3. calcule la cible avec des données > date événement
  4. ajoute feature_cutoff_date pour le garde-fou anti-fuite
"""

from __future__ import annotations

from dataclasses import dataclass
from datetime import date, timedelta

import pandas as pd

from app.infrastructure.repositories.curated_repository import CuratedRepository
from app.ml.datasets.leakage import LeakageGuard
from app.ml.features.feature_engineering import (
    compute_department_pressure,
    compute_up_gap_density,
    featurize_batch,
)
from app.ml.features.feature_schema import FEATURE_COLUMNS


@dataclass
class DatasetConfig:
    stagnation_window_days: int = 180
    future_need_horizon_days: int = 90
    snapshot_step_days: int = 60
    min_records_ratio: float = 0.0


META_COLUMNS = [
    "teacher_id",
    "event_date",
    "feature_cutoff_date",
    "has_any_feature",
]


class SupervisedDataset:
    def __init__(self, X: pd.DataFrame, y: pd.Series, meta: pd.DataFrame) -> None:
        self.X = X
        self.y = y
        self.meta = meta

    @property
    def event_dates(self) -> pd.Series:
        return pd.to_datetime(self.meta["event_date"])


class DatasetBuilder:
    """Construit les 4 datasets supervisés depuis le repository curated."""

    def __init__(self, repository: CuratedRepository, config: DatasetConfig | None = None) -> None:
        self.repo = repository
        self.config = config or DatasetConfig()
        self.guard = LeakageGuard()

    # ------------------------------------------------------------- completion
    def build_completion(self) -> SupervisedDataset:
        rows: list[dict] = []
        dept_pressure = compute_department_pressure(self.repo, self.repo.reference_date)
        up_density = compute_up_gap_density(self.repo, self.repo.reference_date)

        enroll_df = self.repo.df("enrollments")
        for _, row in enroll_df.iterrows():
            tid = str(row.get("teacher_id", "") or "")
            enrolled_at = pd.to_datetime(row.get("enrolled_at"), errors="coerce")
            if not tid or pd.isna(enrolled_at):
                continue
            event = enrolled_at.date()
            teacher = self.repo.teacher(tid)
            if teacher is None:
                continue
            vec = self._vector(
                tid,
                event,
                dept_pressure.get(teacher.department_code, 0.0),
                up_density.get(teacher.up_code, 0.0),
            )
            if vec is None:
                continue
            completed = str(row.get("status", "")).strip().upper() == "COMPLETED"
            vec["teacher_id"] = tid
            vec["event_date"] = event
            vec["completed"] = 1 if completed else 0
            rows.append(vec)

        return self._to_dataset(rows, "completion_probability")

    # ---------------------------------------------------------- effectiveness
    def build_effectiveness(self) -> SupervisedDataset:
        rows: list[dict] = []
        outcomes = self.repo.df("training_outcomes")
        outcome_map: dict[tuple[str, str], float] = {}
        for _, row in outcomes.iterrows():
            key = (str(row.get("teacher_id", "") or ""), str(row.get("training_id", "") or ""))
            eff = row.get("effectiveness_score")
            if eff is not None and not pd.isna(eff):
                outcome_map[key] = float(eff)

        dept_pressure = compute_department_pressure(self.repo, self.repo.reference_date)
        up_density = compute_up_gap_density(self.repo, self.repo.reference_date)

        enroll_df = self.repo.df("enrollments")
        for _, row in enroll_df.iterrows():
            tid = str(row.get("teacher_id", "") or "")
            trid = str(row.get("training_id", "") or "")
            completion = pd.to_datetime(row.get("completion_date"), errors="coerce")
            if not tid or not trid or pd.isna(completion):
                continue
            event = completion.date()
            teacher = self.repo.teacher(tid)
            if teacher is None:
                continue
            # cible: outcome disponible sinon proxy via évaluation
            target = outcome_map.get((tid, trid))
            if target is None:
                evals = self.repo.evaluations(tid)
                notes = [e.note for e in evals if e.training_id == trid and e.note is not None]
                if not notes:
                    continue
                target = min(max((sum(notes) / len(notes) - 10) / 10, 0.0), 1.0)
            vec = self._vector(
                tid,
                event,
                dept_pressure.get(teacher.department_code, 0.0),
                up_density.get(teacher.up_code, 0.0),
            )
            if vec is None:
                continue
            vec["teacher_id"] = tid
            vec["event_date"] = event
            vec["effectiveness_score"] = target
            rows.append(vec)
        return self._to_dataset(rows, "training_effectiveness_score")

    # ------------------------------------------------------------- stagnation
    def build_stagnation(self) -> SupervisedDataset:
        rows: list[dict] = []
        dept_pressure = compute_department_pressure(self.repo, self.repo.reference_date)
        up_density = compute_up_gap_density(self.repo, self.repo.reference_date)
        window = self.config.stagnation_window_days

        for tid in self.repo.teacher_ids():
            teacher = self.repo.teacher(tid)
            if teacher is None:
                continue
            comp_df = self.repo.df("teacher_competencies")
            tcomp = comp_df[comp_df["teacher_id"] == tid]
            if tcomp.empty:
                continue
            assessed_dates = pd.to_datetime(tcomp["last_assessment_date"], errors="coerce").dropna()
            if assessed_dates.empty:
                continue
            latest = assessed_dates.max().date()
            snapshot = latest - timedelta(days=window)
            while snapshot < latest:
                vec = self._vector(
                    tid,
                    snapshot,
                    dept_pressure.get(teacher.department_code, 0.0),
                    up_density.get(teacher.up_code, 0.0),
                )
                if vec is not None and vec["nb_gaps_open"] > 0:
                    stagnation = self._has_progress(tid, snapshot, window)
                    vec["teacher_id"] = tid
                    vec["event_date"] = snapshot
                    vec["stagnation"] = 0 if stagnation else 1
                    rows.append(vec)
                snapshot = snapshot + timedelta(days=self.config.snapshot_step_days)
        return self._to_dataset(rows, "stagnation_risk_future")

    # ------------------------------------------------------------ future need
    def build_future_need(self) -> SupervisedDataset:
        rows: list[dict] = []
        horizon = self.config.future_need_horizon_days
        dept_pressure = compute_department_pressure(self.repo, self.repo.reference_date)
        up_density = compute_up_gap_density(self.repo, self.repo.reference_date)

        needs_df = self.repo.df("training_needs")
        need_map: dict[str, list[date]] = {}
        for _, row in needs_df.iterrows():
            tid = str(row.get("teacher_id", "") or "")
            req = pd.to_datetime(row.get("requested_at"), errors="coerce")
            if tid and not pd.isna(req):
                need_map.setdefault(tid, []).append(req.date())

        for tid in self.repo.teacher_ids():
            teacher = self.repo.teacher(tid)
            if teacher is None:
                continue
            comp_df = self.repo.df("teacher_competencies")
            tcomp = comp_df[comp_df["teacher_id"] == tid]
            if tcomp.empty:
                continue
            assessed_dates = pd.to_datetime(tcomp["last_assessment_date"], errors="coerce").dropna()
            if assessed_dates.empty:
                continue
            latest = assessed_dates.max().date()
            snapshot = latest - timedelta(days=horizon)
            while snapshot < latest:
                vec = self._vector(
                    tid,
                    snapshot,
                    dept_pressure.get(teacher.department_code, 0.0),
                    up_density.get(teacher.up_code, 0.0),
                )
                if vec is not None:
                    future_need = self._has_need_in_window(
                        need_map.get(tid, []), snapshot, horizon
                    )
                    vec["teacher_id"] = tid
                    vec["event_date"] = snapshot
                    vec["future_need"] = 1 if future_need else 0
                    rows.append(vec)
                snapshot = snapshot + timedelta(days=self.config.snapshot_step_days)
        return self._to_dataset(rows, "future_need_probability")

    # ------------------------------------------------------------------ utils
    def _vector(self, tid: str, as_of: date, dept_pressure: float, up_density: float):
        context = self.repo.build_context(tid, as_of)
        if context is None:
            return None
        from app.ml.features.feature_engineering import build_feature_vector

        return build_feature_vector(context, dept_pressure, up_density)

    def _has_progress(self, tid: str, snapshot: date, window: int) -> bool:
        comp_df = self.repo.df("teacher_competencies")
        tcomp = comp_df[comp_df["teacher_id"] == tid]
        baseline = self.repo.build_context(tid, snapshot)
        if baseline is None:
            return False
        base_levels = {
            r.knowledge_id: r.current_level
            for r in baseline.records
            if r.current_level is not None
        }
        end = snapshot + timedelta(days=window)
        for _, row in tcomp.iterrows():
            assessed = pd.to_datetime(row.get("last_assessment_date"), errors="coerce")
            if pd.isna(assessed):
                continue
            if snapshot < assessed.date() <= end:
                kn = str(row.get("knowledge_id", "") or "")
                level = row.get("current_level")
                if level is None or pd.isna(level) or str(level).strip() == "":
                    continue
                try:
                    new_level = int(float(level))
                except (TypeError, ValueError):
                    continue
                if kn in base_levels and new_level > base_levels[kn]:
                    return True
        return False

    def _has_need_in_window(self, need_dates: list[date], snapshot: date, horizon: int) -> bool:
        end = snapshot + timedelta(days=horizon)
        return any(snapshot < nd <= end for nd in need_dates)

    def _to_dataset(self, rows: list[dict], target_name: str) -> SupervisedDataset:
        if not rows:
            return SupervisedDataset(
                X=pd.DataFrame(columns=FEATURE_COLUMNS),
                y=pd.Series(dtype="float64"),
                meta=pd.DataFrame(columns=META_COLUMNS),
            )
        df = pd.DataFrame(rows)
        y_col = {
            "completion_probability": "completed",
            "training_effectiveness_score": "effectiveness_score",
            "stagnation_risk_future": "stagnation",
            "future_need_probability": "future_need",
        }[target_name]
        X = df[FEATURE_COLUMNS].astype(float)
        y = df[y_col].astype(float)
        meta = pd.DataFrame(
            {
                "teacher_id": df["teacher_id"],
                "event_date": pd.to_datetime(df["event_date"]),
                "feature_cutoff_date": pd.to_datetime(df["feature_cutoff_date"]),
                "has_any_feature": True,
            }
        )
        return SupervisedDataset(X=X, y=y, meta=meta)


def build_completion_dataset(repo: CuratedRepository) -> SupervisedDataset:
    return DatasetBuilder(repo).build_completion()


def build_effectiveness_dataset(repo: CuratedRepository) -> SupervisedDataset:
    return DatasetBuilder(repo).build_effectiveness()


def build_stagnation_dataset(repo: CuratedRepository, config: DatasetConfig | None = None) -> SupervisedDataset:
    return DatasetBuilder(repo, config).build_stagnation()


def build_future_need_dataset(repo: CuratedRepository, config: DatasetConfig | None = None) -> SupervisedDataset:
    return DatasetBuilder(repo, config).build_future_need()
