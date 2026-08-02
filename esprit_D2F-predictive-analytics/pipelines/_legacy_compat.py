"""Compat shim: expose the legacy `app.*` namespace for ML pipeline scripts.

During the Sprint 2 refactor the legacy application was moved from `app/`
to `app_legacy/`, but the ML modules still import from the old `app.*`
namespace (e.g. `app.config`, `app.core.exceptions`, `app.ml.*`).

This module registers the corresponding legacy modules under their old
names in `sys.modules` so the pipelines can run unchanged.
"""

import sys


def setup() -> None:
    """Import legacy modules and alias them under their old `app.*` names."""
    if sys.modules.get("app.config") is not None:
        return

    import app_legacy.config
    sys.modules["app.config"] = app_legacy.config

    import app_legacy.core.observability
    sys.modules["app.core.observability"] = app_legacy.core.observability

    import app_legacy.core.exceptions
    sys.modules["app.core.exceptions"] = app_legacy.core.exceptions

    import app_legacy.ml
    sys.modules["app.ml"] = app_legacy.ml

    import app_legacy.ml.artifact_integrity
    sys.modules["app.ml.artifact_integrity"] = app_legacy.ml.artifact_integrity

    import app_legacy.ml.deep_learning
    sys.modules["app.ml.deep_learning"] = app_legacy.ml.deep_learning

    import app_legacy.ml.explainability
    sys.modules["app.ml.explainability"] = app_legacy.ml.explainability

    import app_legacy.ml.feature_engineering
    sys.modules["app.ml.feature_engineering"] = app_legacy.ml.feature_engineering

    import app_legacy.ml.governance
    sys.modules["app.ml.governance"] = app_legacy.ml.governance

    import app_legacy.ml.gap_predictor
    sys.modules["app.ml.gap_predictor"] = app_legacy.ml.gap_predictor
