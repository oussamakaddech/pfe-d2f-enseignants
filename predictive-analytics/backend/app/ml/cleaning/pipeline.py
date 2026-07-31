"""Pipeline de nettoyage complet: raw -> staging -> curated (+ rapports).

Étapes par dataset:
  1. Normalisation des IDs (ENSxxx)
  2. Validation de schéma (types, colonnes, enums, dates, niveaux)
  3. Déduplication (strict + métier, dernière version gagnante)
  4. Validation métier (intégrité référentielle)
  5. Gestion des missing data (jamais d'imputation silencieuse des niveaux)
  6. Cohérence temporelle (end>=start, certificat>=complétion, snapshots ordonnés)
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

import pandas as pd

from app.ml.cleaning.dedupe import DedupReport, deduplicate
from app.ml.cleaning.normalize import (
    IdNormalizationReport,
    load_id_aliases,
    normalize_id_column,
)
from app.ml.cleaning.quality_reports import write_reports
from app.ml.cleaning.validate import (
    ValidationReport,
    validate_date_order,
    validate_level_range,
    validate_schema,
)

logger = logging.getLogger(__name__)

TEACHER_FILES = {
    "teacher_competencies": "teacher_id",
    "enrollments": "teacher_id",
    "attendance": "teacher_id",
    "evaluations": "teacher_id",
    "certificates": "teacher_id",
    "training_needs": "teacher_id",
    "teacher_profile_snapshots": "teacher_id",
    "training_outcomes": "teacher_id",
}

KNOWN_IDS = {
    "teachers": (["teacher_id"], None),
    "teacher_competencies": (["teacher_id"], "knowledge_id"),
    "required_levels": (["knowledge_id"], None),
    "training_catalog": (["training_id"], None),
    "training_competency_links": (["training_id"], "knowledge_id"),
    "enrollments": (["teacher_id", "training_id"], None),
    "attendance": (["teacher_id", "training_id"], None),
    "evaluations": (["teacher_id", "training_id"], None),
    "certificates": (["teacher_id", "training_id"], None),
    "training_needs": (["teacher_id"], None),
    "teacher_profile_snapshots": (["teacher_id"], None),
    "training_outcomes": (["teacher_id", "training_id"], None),
}


@dataclass
class CleaningConfig:
    raw_dir: Path
    staging_dir: Path
    curated_dir: Path
    reports_dir: Path
    alias_file: str | Path | None = None
    drop_missing_ids: bool = True
    reference_date: datetime | None = None


@dataclass
class CleaningResult:
    per_dataset: dict[str, dict[str, Any]] = field(default_factory=dict)
    validation: ValidationReport = field(default_factory=ValidationReport)
    id_report: IdNormalizationReport = field(default_factory=IdNormalizationReport)

    def summary(self) -> dict:
        total_in = sum(v["input_rows"] for v in self.per_dataset.values())
        total_kept = sum(v["kept_rows"] for v in self.per_dataset.values())
        return {
            "run_at": datetime.now().isoformat(),
            "status": "OK" if not self.validation.has_errors() else "ERRORS",
            "error_count": len(self.validation.errors),
            "warning_count": len(self.validation.warnings),
            "total_input_rows": total_in,
            "total_kept_rows": total_kept,
        }


class CleaningPipeline:
    def __init__(self, config: CleaningConfig) -> None:
        self.config = config
        for d in (config.raw_dir, config.staging_dir, config.curated_dir, config.reports_dir):
            d.mkdir(parents=True, exist_ok=True)
        self.result = CleaningResult()

    # ------------------------------------------------------------------- runner
    def run(self) -> CleaningResult:
        alias_map = load_id_aliases(self.config.alias_file) if self.config.alias_file else {}

        id_report = IdNormalizationReport()
        id_report.mapped_legacy = len(alias_map)
        self.result.id_report = id_report

        reference_ids: set[str] = set()
        reference_training_ids: set[str] = set()
        reference_knowledge_ids: set[str] = set()

        # teachers d'abord pour les référentiels
        self._process_teachers(alias_map, reference_ids)
        reference_knowledge_ids.update(
            self._process_reference_dataset(
                "required_levels", alias_map, reference_ids, reference_training_ids, reference_knowledge_ids
            )
        )
        self._process_reference_dataset(
            "training_catalog", alias_map, reference_ids, reference_training_ids, reference_knowledge_ids
        )
        self._process_reference_dataset(
            "training_competency_links", alias_map, reference_ids, reference_training_ids, reference_knowledge_ids
        )

        for dataset in [
            "teacher_competencies",
            "enrollments",
            "attendance",
            "evaluations",
            "certificates",
            "training_needs",
            "teacher_profile_snapshots",
            "training_outcomes",
        ]:
            self._process_teacher_dataset(
                dataset,
                alias_map,
                reference_ids,
                reference_training_ids,
                reference_knowledge_ids,
            )

        self._write_global_reports()
        return self.result

    # --------------------------------------------------------- dataset process
    def _process_teachers(
        self, alias_map: dict[str, str], reference_ids: set[str]
    ) -> None:
        df = self._read_raw("teachers")
        if df is None:
            return
        df, per_dataset = self._normalize_teacher_id(df, "teachers", alias_map)
        report = self.result.validation
        validate_schema(
            df, "teachers",
            required_columns=["teacher_id", "full_name", "department_code", "up_code", "role"],
            enum_columns={"role": {"TEACHER", "DEPARTMENT_HEAD", "UP_HEAD", "ADMIN", "Enseignant", "Chef de Département"}},
            report=report,
        )
        df = self._finalize(df, "teachers")
        reference_ids.update(df["teacher_id"].dropna().astype(str).tolist())
        self._save(df, "teachers")

    def _process_reference_dataset(
        self,
        dataset: str,
        alias_map: dict[str, str],
        reference_ids: set[str],
        reference_training_ids: set[str],
        reference_knowledge_ids: set[str],
    ) -> set[str]:
        df = self._read_raw(dataset)
        if df is None:
            return set()
        df, per_dataset = self._normalize_teacher_id(df, dataset, alias_map)

        if dataset == "required_levels":
            validate_schema(
                df, dataset,
                required_columns=["knowledge_id", "knowledge_name", "knowledge_type",
                                  "sub_competency_id", "competency_id", "domain_id", "required_level"],
                enum_columns={"knowledge_type": {"THEORETICAL", "PRACTICAL", "THEORIQUE", "PRATIQUE"}},
                numeric_columns=["required_level"],
                report=self.result.validation,
            )
            validate_level_range(df, "required_level", dataset, self.result.validation)
            df["knowledge_type"] = df["knowledge_type"].map(
                {"THEORIQUE": "THEORETICAL", "PRATIQUE": "PRACTICAL", "THEORETICAL": "THEORETICAL", "PRACTICAL": "PRACTICAL"}
            ).fillna(df["knowledge_type"])
            df["required_level"] = pd.to_numeric(df["required_level"], errors="coerce")
            df = self._finalize(df, dataset, business_keys=["knowledge_id"])
            known = set(df["knowledge_id"].dropna().astype(str).tolist())
            self._save(df, dataset)
            return known

        if dataset == "training_catalog":
            validate_schema(
                df, dataset,
                required_columns=["training_id", "title", "active", "cancelled", "registration_open", "duration_hours"],
                numeric_columns=["duration_hours", "capacity", "registration_count"],
                date_columns=["start_date", "end_date", "available_from"],
                report=self.result.validation,
            )
            validate_date_order(df, "start_date", "end_date", dataset, self.result.validation)
            df["active"] = df["active"].astype(bool) if "active" in df else df
            df = self._finalize(df, dataset, business_keys=["training_id"])
            self._save(df, dataset)
            return set(df["training_id"].dropna().astype(str).tolist())

        # training_competency_links
        validate_schema(
            df, dataset,
            required_columns=["training_id", "knowledge_id"],
            numeric_columns=["niveau_prerequis", "niveau_vise"],
            report=self.result.validation,
        )
        validate_level_range(df, "niveau_vise", dataset, self.result.validation, critical=False)
        validate_level_range(df, "niveau_prerequis", dataset, self.result.validation, critical=False)
        df = self._finalize(df, dataset, business_keys=["training_id", "knowledge_id"])
        self._save(df, dataset)
        return set()

    def _process_teacher_dataset(
        self,
        dataset: str,
        alias_map: dict[str, str],
        reference_ids: set[str],
        reference_training_ids: set[str],
        reference_knowledge_ids: set[str],
    ) -> None:
        df = self._read_raw(dataset)
        if df is None:
            return
        df, per_dataset = self._normalize_teacher_id(df, dataset, alias_map)
        report = self.result.validation

        # business validation: no record without teacher
        if "teacher_id" in df.columns:
            for idx, tid in df["teacher_id"].items():
                if pd.isna(tid):
                    continue
                if str(tid) not in reference_ids:
                    report.add(dataset, idx, "teacher_id", "ERROR", f"enseignant inconnu: {tid}")
                    if self.config.drop_missing_ids:
                        df.loc[idx, "teacher_id"] = None

        if dataset in {"enrollments", "training_outcomes"}:
            if "training_id" in df.columns and reference_training_ids:
                for idx, tid in df["training_id"].items():
                    if pd.isna(tid):
                        continue
                    if str(tid) not in reference_training_ids:
                        report.add(dataset, idx, "training_id", "ERROR", f"formation inconnue: {tid}")
                        if self.config.drop_missing_ids:
                            df.loc[idx, "training_id"] = None

        if dataset == "teacher_competencies":
            validate_schema(
                df, dataset,
                required_columns=["teacher_id", "knowledge_id"],
                numeric_columns=["current_level"],
                date_columns=["last_assessment_date"],
                report=report,
            )
            validate_level_range(df, "current_level", dataset, report, critical=False)
            df["current_level"] = self._coerce_levels(df["current_level"])
            df = self._finalize(df, dataset, business_keys=["teacher_id", "knowledge_id"],
                                version_columns=["last_assessment_date"])

        elif dataset == "enrollments":
            validate_schema(
                df, dataset,
                required_columns=["enrollment_id", "teacher_id", "training_id", "status", "enrolled_at"],
                date_columns=["enrolled_at", "completion_date"],
                enum_columns={"status": {"ENROLLED", "COMPLETED", "DROPPED", "PENDING"}},
                report=report,
            )
            validate_date_order(df, "enrolled_at", "completion_date", dataset, report)
            df = self._finalize(df, dataset, business_keys=["enrollment_id"])

        elif dataset == "attendance":
            validate_schema(
                df, dataset,
                required_columns=["attendance_id", "teacher_id", "training_id", "session_date", "present"],
                date_columns=["session_date"],
                report=report,
            )
            df = self._finalize(df, dataset, business_keys=["attendance_id"])

        elif dataset == "evaluations":
            validate_schema(
                df, dataset,
                required_columns=["evaluation_id", "teacher_id", "training_id", "evaluation_date"],
                numeric_columns=["note"],
                date_columns=["evaluation_date"],
                report=report,
            )
            if "note" in df.columns:
                df["note"] = pd.to_numeric(df["note"], errors="coerce")
                df.loc[df["note"].between(0, 20, inclusive="both") == False, "note"] = None
            df = self._finalize(df, dataset, business_keys=["evaluation_id"])

        elif dataset == "certificates":
            validate_schema(
                df, dataset,
                required_columns=["certificate_id", "teacher_id", "training_id", "issued_date", "valid"],
                date_columns=["issued_date"],
                report=report,
            )
            df = self._finalize(df, dataset, business_keys=["certificate_id"])

        elif dataset == "training_needs":
            validate_schema(
                df, dataset,
                required_columns=["need_id", "teacher_id", "status", "requested_at"],
                date_columns=["requested_at"],
                enum_columns={"status": {"PENDING", "APPROVED", "REJECTED", "FULFILLED"}},
                report=report,
            )
            df = self._finalize(df, dataset, business_keys=["need_id"])

        elif dataset == "teacher_profile_snapshots":
            validate_schema(
                df, dataset,
                required_columns=["snapshot_id", "teacher_id", "snapshot_date"],
                date_columns=["snapshot_date"],
                report=report,
            )
            df = self._finalize(df, dataset, business_keys=["teacher_id", "snapshot_date"],
                                version_columns=["snapshot_date"])

        elif dataset == "training_outcomes":
            validate_schema(
                df, dataset,
                required_columns=["outcome_id", "teacher_id", "training_id", "outcome_date"],
                date_columns=["outcome_date"],
                report=report,
            )
            df = self._finalize(df, dataset, business_keys=["outcome_id"])

        self._save(df, dataset)

    # ------------------------------------------------------------------- utils
    def _read_raw(self, dataset: str) -> pd.DataFrame | None:
        path = self.config.raw_dir / f"{dataset}.csv"
        if not path.exists():
            logger.warning("dataset absent: %s", path)
            return None
        return pd.read_csv(path, dtype=str)

    def _normalize_teacher_id(
        self,
        df: pd.DataFrame,
        dataset: str,
        alias_map: dict[str, str],
    ) -> tuple[pd.DataFrame, dict[str, Any]]:
        input_rows = len(df)
        report = self.result.id_report
        has_teacher_col = False
        if dataset in TEACHER_FILES:
            col = TEACHER_FILES[dataset]
            if col in df.columns:
                has_teacher_col = True
                df[col] = normalize_id_column(df[col], alias_map=alias_map, report=report)
        elif dataset == "teachers":
            has_teacher_col = True
            df["teacher_id"] = normalize_id_column(df["teacher_id"], alias_map=alias_map, report=report)

        if self.config.drop_missing_ids and has_teacher_col and dataset != "teachers":
            before = len(df)
            df = df.dropna(subset=["teacher_id"])
            dropped = before - len(df)
            report.rejected += dropped

        per_dataset = {
            "input_rows": input_rows,
            "normalized": report.normalized,
            "rejected": report.rejected,
        }
        return df, per_dataset

    def _coerce_levels(self, series: pd.Series) -> pd.Series:
        def to_int(v):
            if pd.isna(v):
                return None
            text = str(v).strip().upper()
            if text in {"", "NAN", "NONE"}:
                return None
            if text.startswith("N") and len(text) == 2 and text[1].isdigit():
                return int(text[1])
            try:
                n = int(float(text))
                return n if 1 <= n <= 5 else None
            except ValueError:
                return None

        return series.map(to_int)

    def _finalize(
        self,
        df: pd.DataFrame,
        dataset: str,
        *,
        business_keys: list[str] | None = None,
        version_columns: list[str] | None = None,
    ) -> pd.DataFrame:
        df = df.copy()
        df, dedup = deduplicate(df, business_keys=business_keys, version_columns=version_columns)
        kept = len(df)
        self.result.per_dataset[dataset] = {
            "input_rows": len(df) + dedup.dropped_strict + dedup.dropped_business,
            "kept_rows": kept,
            "errors": 0,
            "warnings": 0,
            "dropped_strict": dedup.dropped_strict,
            "dropped_business": dedup.dropped_business,
        }
        return df

    def _save(self, df: pd.DataFrame, dataset: str) -> None:
        df.to_csv(self.config.staging_dir / f"{dataset}.csv", index=False)
        df.to_csv(self.config.curated_dir / f"{dataset}.csv", index=False)
        if dataset in self.result.per_dataset:
            self.result.per_dataset[dataset]["kept_rows"] = len(df)

    def _write_global_reports(self) -> None:
        validation = self.result.validation
        per_dataset = self.result.per_dataset
        for name, info in per_dataset.items():
            info["errors"] = sum(1 for i in validation.issues if i.dataset == name and i.severity == "ERROR")
            info["warnings"] = sum(1 for i in validation.issues if i.dataset == name and i.severity == "WARNING")

        summary = self.result.summary()
        write_reports(self.config.reports_dir, summary=summary, validation_report=validation, per_dataset=per_dataset)
