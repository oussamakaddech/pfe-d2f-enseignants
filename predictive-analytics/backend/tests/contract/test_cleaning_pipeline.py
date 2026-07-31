"""Tests du pipeline de nettoyage et de la politique ENSxxx."""

from __future__ import annotations

from pathlib import Path

import pandas as pd
import pytest

from app.domain.enums.teacher import (
    is_valid_teacher_id,
    normalize_teacher_id,
)
from app.ml.cleaning.dedupe import deduplicate
from app.ml.cleaning.normalize import (
    IdNormalizationReport,
    load_id_aliases,
    normalize_id_column,
)
from app.ml.cleaning.pipeline import CleaningConfig, CleaningPipeline
from app.ml.cleaning.validate import validate_level_range, validate_schema


class TestIdPolicy:
    def test_accepts_canonical(self):
        assert normalize_teacher_id("ens001") == "ENS001"
        assert normalize_teacher_id("  ENS030 ") == "ENS030"
        assert is_valid_teacher_id("ENS001")

    def test_rejects_legacy(self):
        assert not is_valid_teacher_id("T001")
        with pytest.raises(ValueError):
            normalize_teacher_id("T001")

    def test_rejects_formation_service_format(self):
        assert not is_valid_teacher_id("E00001")

    def test_rejects_garbage(self):
        assert not is_valid_teacher_id("AB12")
        assert not is_valid_teacher_id("")
        with pytest.raises(ValueError):
            normalize_teacher_id(None)


class TestNormalization:
    def test_legacy_mapped_via_alias(self):
        df = pd.DataFrame({"teacher_id": ["T001", "ENS002", "T999"]})
        report = IdNormalizationReport()
        series = normalize_id_column(
            df["teacher_id"],
            alias_map={"T001": "ENS001"},
            report=report,
        )
        assert series.tolist() == ["ENS001", "ENS002", None]
        assert report.mapped_legacy == 1
        assert report.rejected == 1
        assert report.rejected_rows[0]["raw_value"] == "T999"

    def test_load_aliases(self, tmp_path):
        p = tmp_path / "aliases.csv"
        p.write_text("legacy_id,canonical_id\nT001,ENS001\nT002,ENS002\n", encoding="utf-8")
        mapping = load_id_aliases(p)
        assert mapping == {"T001": "ENS001", "T002": "ENS002"}


class TestDedupe:
    def test_strict_duplicates_removed(self):
        df = pd.DataFrame({"a": [1, 1, 2], "b": ["x", "x", "y"]})
        out, report = deduplicate(df, business_keys=["a"])
        assert report.dropped_strict == 1
        assert len(out) == 2

    def test_business_dedup_keeps_latest(self):
        df = pd.DataFrame(
            {
                "teacher_id": ["ENS001", "ENS001"],
                "knowledge_id": ["K1", "K1"],
                "current_level": [2, 4],
                "last_assessment_date": ["2024-01-01", "2024-06-01"],
            }
        )
        out, report = deduplicate(
            df, business_keys=["teacher_id", "knowledge_id"], version_columns=["last_assessment_date"]
        )
        assert len(out) == 1
        assert out.iloc[0]["current_level"] == 4


class TestValidation:
    def test_level_out_of_range(self):
        df = pd.DataFrame({"level": [1, 6, 3, "N7"]})
        report = validate_level_range(df, "level", "t")
        assert len(report.errors) == 2

    def test_missing_column_reported(self):
        df = pd.DataFrame({"a": [1]})
        report = validate_schema(df, "t", required_columns=["a", "b"])
        assert any("b" in i.message for i in report.errors)


class TestPipeline:
    def _write_raw(self, tmp_path: Path) -> Path:
        raw = tmp_path / "raw"
        raw.mkdir()
        pd.DataFrame(
            [{"teacher_id": "ENS001", "full_name": "A", "department_code": "GL", "up_code": "UP", "role": "TEACHER"}]
        ).to_csv(raw / "teachers.csv", index=False)
        pd.DataFrame(
            [
                {
                    "knowledge_id": "KN-1",
                    "knowledge_name": "S1",
                    "knowledge_type": "THEORETICAL",
                    "sub_competency_id": "SUB-1",
                    "sub_competency_name": "SC1",
                    "competency_id": "COMP-1",
                    "competency_name": "C1",
                    "domain_id": "DOM-1",
                    "domain_name": "D1",
                    "required_level": "4",
                    "is_critical": "true",
                    "prereq_knowledge_ids": "",
                }
            ]
        ).to_csv(raw / "required_levels.csv", index=False)
        pd.DataFrame(
            [
                {
                    "training_id": "F001",
                    "title": "T",
                    "active": "true",
                    "cancelled": "false",
                    "registration_open": "true",
                    "start_date": "2026-01-01",
                    "end_date": "2026-01-05",
                    "duration_hours": "20",
                }
            ]
        ).to_csv(raw / "training_catalog.csv", index=False)
        pd.DataFrame(
            [{"training_id": "F001", "knowledge_id": "KN-1", "niveau_vise": "4"}]
        ).to_csv(raw / "training_competency_links.csv", index=False)
        # teacher with competency record + one with legacy id
        pd.DataFrame(
            [
                {"teacher_id": "ENS001", "knowledge_id": "KN-1", "current_level": "2", "last_assessment_date": "2026-01-01", "validated": "false", "source": "A"},
                {"teacher_id": "T999", "knowledge_id": "KN-1", "current_level": "3", "last_assessment_date": "2026-01-01", "validated": "false", "source": "A"},
            ]
        ).to_csv(raw / "teacher_competencies.csv", index=False)
        return raw

    def test_pipeline_ens_only_and_rejects_legacy(self, tmp_path):
        raw = self._write_raw(tmp_path)
        cfg = CleaningConfig(
            raw_dir=raw,
            staging_dir=tmp_path / "staging",
            curated_dir=tmp_path / "curated",
            reports_dir=tmp_path / "reports",
            alias_file=None,
        )
        result = CleaningPipeline(cfg).run()
        assert result.validation.has_errors() is False
        curated = pd.read_csv(tmp_path / "curated" / "teacher_competencies.csv")
        assert (curated["teacher_id"] == "ENS001").all()
        assert "T999" not in set(curated["teacher_id"])

    def test_pipeline_legacy_mapped_with_aliases(self, tmp_path):
        raw = self._write_raw(tmp_path)
        pd.DataFrame([{"legacy_id": "T999", "canonical_id": "ENS001"}]).to_csv(
            raw / "id_aliases.csv", index=False
        )
        cfg = CleaningConfig(
            raw_dir=raw,
            staging_dir=tmp_path / "staging",
            curated_dir=tmp_path / "curated",
            reports_dir=tmp_path / "reports",
            alias_file=raw / "id_aliases.csv",
        )
        result = CleaningPipeline(cfg).run()
        curated = pd.read_csv(tmp_path / "curated" / "teacher_competencies.csv")
        assert set(curated["teacher_id"]) == {"ENS001"}

    def test_reports_generated(self, tmp_path):
        raw = self._write_raw(tmp_path)
        cfg = CleaningConfig(
            raw_dir=raw,
            staging_dir=tmp_path / "staging",
            curated_dir=tmp_path / "curated",
            reports_dir=tmp_path / "reports",
        )
        CleaningPipeline(cfg).run()
        assert (tmp_path / "reports" / "quality_report.json").exists()
        assert (tmp_path / "reports" / "quality_report.md").exists()
        assert (tmp_path / "reports" / "validation_issues.csv").exists()

    def test_no_competency_without_teacher(self, tmp_path):
        raw = self._write_raw(tmp_path)
        # add a competency for an unknown teacher
        pd.DataFrame(
            [{"teacher_id": "ENS999", "knowledge_id": "KN-1", "current_level": "3", "last_assessment_date": "2026-01-01", "validated": "false", "source": "A"}]
        ).to_csv(raw / "teacher_competencies.csv", index=False)
        cfg = CleaningConfig(
            raw_dir=raw,
            staging_dir=tmp_path / "staging",
            curated_dir=tmp_path / "curated",
            reports_dir=tmp_path / "reports",
        )
        result = CleaningPipeline(cfg).run()
        # orphan row dropped
        curated = pd.read_csv(tmp_path / "curated" / "teacher_competencies.csv")
        assert "ENS999" not in set(curated["teacher_id"])
