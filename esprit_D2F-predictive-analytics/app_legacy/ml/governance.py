"""ML Governance module for the D2F Predictive Analytics service.

The leaky gap_predictor model is deprecated and MUST NOT be used
for current gap prediction. It is retained only for historical
reference and for future ML targets that require longitudinal data.

Allowed future ML targets (all require dated longitudinal snapshots,
future labels, temporal train/val/test split, baseline, leakage audit,
variance control, dataset/model/sklearn versioning, metrics,
explicability, and drift monitoring):
  - probability of training completion
  - probability of need satisfaction after training
  - probability of future need appearance (90-day horizon)
  - probability of strategic knowledge coverage decline
  - future training effectiveness for profile type
  - probability of non-participation in a session
"""

from __future__ import annotations

import logging
from dataclasses import dataclass, field
from typing import Any

logger = logging.getLogger(__name__)

ML_DEPRECATION_REASON = (
    "The gap_predictor model contains target leakage: it predicts "
    "current gaps using features that include the same target data. "
    "Current gaps are computed deterministically from the assignment "
    "service and reference framework, not predicted from features."
)

FUTURE_ML_TARGETS = [
    "training_completion_probability",
    "need_satisfaction_after_training",
    "future_need_appearance_90d",
    "strategic_coverage_decline_probability",
    "future_training_effectiveness",
    "non_participation_probability",
]

ML_READINESS_REQUIREMENTS = [
    "dated_historical_snapshots",
    "future_labels",
    "temporal_train_val_test_split",
    "business_baseline",
    "leakage_audit",
    "variance_control",
    "dataset_version",
    "model_version",
    "sklearn_version_compatible",
    "documented_metrics",
    "explicability",
    "drift_monitoring",
]


@dataclass
class MLStatus:
    ml_status: str
    model_name: str | None = None
    model_version: str | None = None
    message: str = ""
    future_targets_available: bool = False
    future_targets: list[str] = field(default_factory=list)
    requirements_met: dict[str, bool] = field(default_factory=dict)

    def to_dict(self) -> dict[str, Any]:
        return {
            "ml_status": self.ml_status,
            "model_name": self.model_name,
            "model_version": self.model_version,
            "message": self.message,
            "future_targets_available": self.future_targets_available,
            "future_targets": self.future_targets,
            "requirements_met": self.requirements_met,
        }


def get_current_gap_prediction_status() -> MLStatus:
    """Return ML status indicating prediction is unavailable for current gaps.

    Current gaps are deterministic, not ML-predicted.
    """
    return MLStatus(
        ml_status="DATA_COLLECTION_REQUIRED",
        model_name=None,
        model_version=None,
        message=ML_DEPRECATION_REASON,
        future_targets_available=False,
        future_targets=FUTURE_ML_TARGETS,
        requirements_met={req: False for req in ML_READINESS_REQUIREMENTS},
    )


def check_future_ml_readiness(requirements_status: dict[str, bool]) -> MLStatus:
    """Check if all ML readiness requirements are met for future predictions."""
    all_met = all(requirements_status.values())
    return MLStatus(
        ml_status="READY" if all_met else "DATA_COLLECTION_REQUIRED",
        model_name="gap_future_predictor",
        model_version=None,
        message=(
            "All requirements met for future ML predictions."
            if all_met
            else "Some ML readiness requirements are not yet satisfied."
        ),
        future_targets_available=all_met,
        future_targets=FUTURE_ML_TARGETS if all_met else [],
        requirements_met=requirements_status,
    )