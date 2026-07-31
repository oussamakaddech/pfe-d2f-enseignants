"""Schéma des features — ordre stable et types."""

from __future__ import annotations

FEATURE_SCHEMA: dict[str, str] = {
    "nb_gaps_open": "int",
    "weighted_gap_severity": "float",
    "avg_current_level": "float",
    "avg_required_level": "float",
    "nb_trainings_completed_90d": "int",
    "attendance_rate_180d": "float",
    "evaluation_avg_180d": "float",
    "certificate_rate": "float",
    "unresolved_need_count": "int",
    "dept_training_pressure": "float",
    "up_gap_density": "float",
    "time_since_last_training_days": "float",
    "time_since_last_assessment_days": "float",
    "prerequisite_missing_count": "int",
    "active_training_load": "int",
    "historical_completion_rate": "float",
    "historical_success_rate": "float",
}

FEATURE_COLUMNS: list[str] = list(FEATURE_SCHEMA.keys())
