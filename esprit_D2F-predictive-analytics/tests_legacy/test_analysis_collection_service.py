"""Tests for app.services.analysis_collection_service module."""

from unittest.mock import MagicMock

import pytest

from app.services.analysis_collection_service import build_domaine_demand, collect_analysis_data


class TestBuildDomaineDemand:
    """Tests for build_domaine_demand function."""

    def test_empty_demand_list(self):
        """build_domaine_demand should return empty dict for empty input."""
        result = build_domaine_demand([], 0)
        assert result == {}

    def test_no_competence_id_rows_skipped(self):
        """Rows without competence_id should be skipped."""
        demand = [
            {"total_demand": 100},  # Missing competence_id
            {"competence_id": None, "total_demand": 50},
            {"competence_id": "", "total_demand": 30},
        ]
        result = build_domaine_demand(demand, 180)
        assert result == {}

    def test_single_demand_row(self):
        """Single demand row should create ratio."""
        demand = [{"competence_id": 1, "total_demand": 100}]
        result = build_domaine_demand(demand, 100)
        assert result == {1: 1.0}

    def test_multiple_demand_rows(self):
        """Multiple rows should compute correct ratios."""
        demand = [
            {"competence_id": 1, "total_demand": 100},
            {"competence_id": 2, "total_demand": 50},
            {"competence_id": 3, "total_demand": 50},
        ]
        result = build_domaine_demand(demand, 200)
        assert result == {1: 0.5, 2: 0.25, 3: 0.25}

    def test_zero_total_demand_prevents_division_error(self):
        """Zero total_demand should not cause division by zero."""
        demand = [{"competence_id": 1, "total_demand": 100}]
        result = build_domaine_demand(demand, 0)
        assert result == {1: 100.0}

    def test_missing_total_demand_treated_as_zero(self):
        """Missing total_demand should be treated as 0."""
        demand = [
            {"competence_id": 1},  # Missing total_demand
            {"competence_id": 2, "total_demand": 100},
        ]
        result = build_domaine_demand(demand, 100)
        assert result == {1: 0.0, 2: 1.0}

    def test_string_competence_id_converted_to_int(self):
        """String competence_id values should be converted to int."""
        demand = [
            {"competence_id": "123", "total_demand": 50},
            {"competence_id": 456, "total_demand": 50},
        ]
        result = build_domaine_demand(demand, 100)
        assert result == {123: 0.5, 456: 0.5}

    def test_duplicate_competence_ids_last_wins(self):
        """Duplicate competence_id should overwrite previous value."""
        demand = [
            {"competence_id": 1, "total_demand": 100},
            {"competence_id": 1, "total_demand": 50},
        ]
        result = build_domaine_demand(demand, 150)
        assert result == {1: 50 / 150}


class TestCollectAnalysisData:
    """Tests for collect_analysis_data function."""

    def test_collect_analysis_data_returns_all_keys(self):
        """collect_analysis_data should return dict with all required keys."""
        # Mock DataService
        svc = MagicMock()
        svc.get_competency_levels.return_value = [{"id": 1}]
        svc.get_required_levels.return_value = [{"id": 1, "level": 3}]
        svc.get_all_formations.return_value = []
        svc.get_formation_competencies.return_value = []
        svc.get_inscriptions.return_value = []
        svc.get_evaluations.return_value = []
        svc.get_evaluations_globales.return_value = []
        svc.get_besoins.return_value = []
        svc.get_certificats.return_value = []
        svc.get_prerequisite_graph.return_value = {}
        svc.get_besoin_demand.return_value = []

        result = collect_analysis_data(svc, "ENS-123")

        expected_keys = {
            "comp_levels", "req_levels", "formations", "form_comps",
            "inscriptions", "evaluations", "eval_glob",
            "besoins", "certificats", "prereqs", "dom_demand",
        }
        assert set(result.keys()) == expected_keys

    def test_collect_analysis_data_calls_service_methods(self):
        """collect_analysis_data should call all required DataService methods."""
        svc = MagicMock()
        svc.get_competency_levels.return_value = []
        svc.get_required_levels.return_value = []
        svc.get_all_formations.return_value = []
        svc.get_formation_competencies.return_value = []
        svc.get_inscriptions.return_value = []
        svc.get_evaluations.return_value = []
        svc.get_evaluations_globales.return_value = []
        svc.get_besoins.return_value = []
        svc.get_certificats.return_value = []
        svc.get_prerequisite_graph.return_value = {}
        svc.get_besoin_demand.return_value = []

        collect_analysis_data(svc, "ENS-456")

        svc.get_competency_levels.assert_called_once_with("ENS-456")
        svc.get_required_levels.assert_called_once()
        svc.get_all_formations.assert_called_once()
        svc.get_formation_competencies.assert_called_once()
        svc.get_inscriptions.assert_called_once_with("ENS-456")
        svc.get_evaluations.assert_called_once_with("ENS-456")
        svc.get_evaluations_globales.assert_called_once()
        svc.get_besoins.assert_called_once_with("ENS-456")
        svc.get_certificats.assert_called_once_with("ENS-456")
        svc.get_prerequisite_graph.assert_called_once()
        svc.get_besoin_demand.assert_called_once()

    def test_collect_analysis_data_with_demand(self):
        """collect_analysis_data should compute dom_demand from besoin_demand."""
        svc = MagicMock()
        svc.get_competency_levels.return_value = []
        svc.get_required_levels.return_value = []
        svc.get_all_formations.return_value = []
        svc.get_formation_competencies.return_value = []
        svc.get_inscriptions.return_value = []
        svc.get_evaluations.return_value = []
        svc.get_evaluations_globales.return_value = []
        svc.get_besoins.return_value = []
        svc.get_certificats.return_value = []
        svc.get_prerequisite_graph.return_value = {}
        svc.get_besoin_demand.return_value = [
            {"competence_id": 10, "total_demand": 100},
            {"competence_id": 20, "total_demand": 100},
        ]

        result = collect_analysis_data(svc, "ENS-789")

        assert "dom_demand" in result
        assert result["dom_demand"] == {10: 0.5, 20: 0.5}

    def test_collect_analysis_data_empty_demand(self):
        """collect_analysis_data should handle empty demand gracefully."""
        svc = MagicMock()
        svc.get_competency_levels.return_value = []
        svc.get_required_levels.return_value = []
        svc.get_all_formations.return_value = []
        svc.get_formation_competencies.return_value = []
        svc.get_inscriptions.return_value = []
        svc.get_evaluations.return_value = []
        svc.get_evaluations_globales.return_value = []
        svc.get_besoins.return_value = []
        svc.get_certificats.return_value = []
        svc.get_prerequisite_graph.return_value = {}
        svc.get_besoin_demand.return_value = []

        result = collect_analysis_data(svc, "ENS-empty")

        assert result["dom_demand"] == {}

    def test_collect_analysis_data_service_error_propagates(self):
        """collect_analysis_data should propagate service errors."""
        svc = MagicMock()
        svc.get_competency_levels.side_effect = RuntimeError("DB connection failed")

        with pytest.raises(RuntimeError) as exc_info:
            collect_analysis_data(svc, "ENS-error")
        assert "DB connection failed" in str(exc_info.value)
