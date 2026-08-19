"""Observabilité du serving ML — compteurs, latence, raisons de fallback.

Ne logue jamais de données personnelles sensibles (identifiants enseignants
exclus des métriques ; seuls des compteurs agrégés sont exposés).
"""
from __future__ import annotations

import time
from collections import Counter
from dataclasses import dataclass, field
from threading import Lock

from app.core.logging import get_logger

logger = get_logger("ml_observability")


@dataclass
class MlMetrics:
    """Compteurs agrégés du serving ML."""

    predictions_count: int = 0
    fallback_count: int = 0
    demo_count: int = 0
    production_count: int = 0
    validation_errors: Counter = field(default_factory=Counter)
    fallback_reasons: Counter = field(default_factory=Counter)
    model_versions: Counter = field(default_factory=Counter)
    total_latency_ms: float = 0.0
    prediction_values: list[float] = field(default_factory=list)

    def to_dict(self) -> dict:
        return {
            "predictions_count": self.predictions_count,
            "fallback_count": self.fallback_count,
            "demo_count": self.demo_count,
            "production_count": self.production_count,
            "validation_errors": dict(self.validation_errors),
            "fallback_reasons": dict(self.fallback_reasons),
            "model_versions": dict(self.model_versions),
            "avg_latency_ms": round(self.total_latency_ms / max(1, self.predictions_count), 2),
            "prediction_distribution": self._prediction_distribution(),
        }

    def _prediction_distribution(self) -> dict[str, int]:
        if not self.prediction_values:
            return {}
        buckets = {"0-1": 0, "1-2": 0, "2-3": 0, "3-4": 0, "4-5": 0}
        for v in self.prediction_values:
            if v < 1:
                buckets["0-1"] += 1
            elif v < 2:
                buckets["1-2"] += 1
            elif v < 3:
                buckets["2-3"] += 1
            elif v < 4:
                buckets["3-4"] += 1
            else:
                buckets["4-5"] += 1
        return buckets


class MlObservability:
    """Registre thread-safe des métriques ML."""

    def __init__(self) -> None:
        self._metrics = MlMetrics()
        self._lock = Lock()

    def record_prediction(self, model_version: str | None, latency_ms: float, values: list[float]) -> None:
        with self._lock:
            self._metrics.predictions_count += 1
            self._metrics.total_latency_ms += latency_ms
            if model_version:
                self._metrics.model_versions[model_version] += 1
            self._metrics.prediction_values.extend(values)

    def record_fallback(self, reason: str | None) -> None:
        with self._lock:
            self._metrics.fallback_count += 1
            self._metrics.fallback_reasons[reason or "unknown"] += 1

    def record_mode(self, mode: str) -> None:
        with self._lock:
            if mode == "PRODUCTION_ML":
                self._metrics.production_count += 1
            elif mode == "DEMO_ML":
                self._metrics.demo_count += 1

    def record_validation_error(self, error: str) -> None:
        with self._lock:
            self._metrics.validation_errors[error] += 1

    def snapshot(self) -> dict:
        with self._lock:
            return self._metrics.to_dict()


# Instance globale partagée par le service.
ml_observability = MlObservability()


def timed_predict(func):
    """Décorateur : mesure la latence d'une prédiction et enregistre les métriques."""
    def wrapper(self, *args, **kwargs):
        start = time.perf_counter()
        result = func(self, *args, **kwargs)
        latency_ms = (time.perf_counter() - start) * 1000.0
        if result is not None:
            values = [g.gap_score for g in result] if hasattr(result, "__iter__") else []
            ml_observability.record_prediction(
                model_version=getattr(self, "_model_version", None),
                latency_ms=latency_ms,
                values=values,
            )
        return result
    return wrapper