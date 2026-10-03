"""Observabilité du serving ML — journal par appel, compteurs, latence, fallback.

GOUVERNANCE 7.6 (limite 4) : chaque appel est journalisé avec l'identifiant
enseignant, le mode effectif (PRODUCTION_ML / HEURISTIC_FALLBACK), la raison
de repli et les features hors plage. Le journal est conservé en mémoire
(fenêtre bornée) ET propagé vers la table ``analyse.ml_observability`` si une
base est attachée. Aucune donnée personnelle sensible au-delà de l'identifiant
enseignant (déjà présent dans les snapshots d'analyse) n'est journalisée.
"""
from __future__ import annotations

import time
from collections import Counter, deque
from dataclasses import dataclass, field
from datetime import date, datetime, timezone
from threading import Lock
from typing import Any

from app.core.logging import get_logger

logger = get_logger("ml_observability")

MAX_CALL_LOG = 5000


@dataclass
class ServingCallRecord:
    """Une ligne de journal par appel de serving."""

    call_date: str
    teacher_id: str | None
    mode: str
    fallback_reason: str | None
    out_of_range_features: list[str]

    def to_dict(self) -> dict:
        return {
            "call_date": self.call_date,
            "teacher_id": self.teacher_id,
            "mode": self.mode,
            "fallback_reason": self.fallback_reason,
            "out_of_range_features": self.out_of_range_features,
        }


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
    """Registre thread-safe des métriques ML + journal par appel."""

    def __init__(self) -> None:
        self._metrics = MlMetrics()
        self._lock = Lock()
        # Journal par appel (fenêtre bornée) — gouvernance 7.6 limite 4.
        self._calls: deque[ServingCallRecord] = deque(maxlen=MAX_CALL_LOG)
        # Sink optionnel vers analyse.ml_observability (posé au démarrage).
        self._db_sink: Any | None = None

    # ── Attachement du sink base (fail-safe : le journal reste en mémoire) ──
    def attach_db_sink(self, database: Any) -> None:
        """Attache une base de données pour persister chaque appel (best-effort)."""
        self._db_sink = database

    def _persist_call(self, record: ServingCallRecord) -> None:
        if self._db_sink is None:
            return
        try:
            from sqlalchemy import text

            with self._db_sink.session() as session:
                session.execute(
                    text(
                        'INSERT INTO "analyse".ml_observability '
                        "(call_date, teacher_id, mode, fallback_reason, out_of_range_features) "
                        "VALUES (:call_date, :teacher_id, :mode, :fallback_reason, :out_of_range_features)"
                    ),
                    {
                        "call_date": record.call_date,
                        "teacher_id": record.teacher_id,
                        "mode": record.mode,
                        "fallback_reason": record.fallback_reason,
                        "out_of_range_features": (
                            ", ".join(record.out_of_range_features)
                            if record.out_of_range_features
                            else None
                        ),
                    },
                )
        except Exception as exc:  # pragma: no cover - persistance best-effort
            logger.warning("persistance ml_observability impossible (table absente ?)", error=str(exc))

    # ── Enregistrement par appel (gouvernance 7.6, limite 4.1) ──
    def record_serving_call(
        self,
        teacher_id: str | None,
        mode: str,
        fallback_reason: str | None = None,
        out_of_range_features: list[str] | None = None,
    ) -> None:
        """Journalise UN appel : teacher_id, mode effectif, raison si repli,
        features hors plage le cas échéant."""
        record = ServingCallRecord(
            call_date=date.today().isoformat(),
            teacher_id=teacher_id,
            mode=mode,
            fallback_reason=fallback_reason,
            out_of_range_features=list(out_of_range_features or []),
        )
        with self._lock:
            self._calls.append(record)
        logger.info(
            "serving ml",
            teacher_id=teacher_id,
            mode=mode,
            fallback_reason=fallback_reason,
            out_of_range_features=record.out_of_range_features or None,
        )
        self._persist_call(record)

    # ── Taux de fallback par jour (gouvernance 7.6, limite 4.1) ──
    def fallback_rate_per_day(self, last_days: int = 30) -> list[dict]:
        """Taux de fallback agrégé par jour (sur la fenêtre mémoire)."""
        with self._lock:
            calls = list(self._calls)
        per_day: dict[str, Counter] = {}
        for call in calls:
            bucket = per_day.setdefault(call.call_date, Counter())
            bucket["total"] += 1
            if call.mode == "HEURISTIC_FALLBACK":
                bucket["fallback"] += 1
        days = sorted(per_day.keys())[-last_days:]
        return [
            {
                "date": d,
                "total_calls": per_day[d]["total"],
                "fallback_calls": per_day[d]["fallback"],
                "fallback_rate": round(per_day[d]["fallback"] / max(1, per_day[d]["total"]), 4),
            }
            for d in days
        ]

    # ── API historique (compteurs) ──
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
            base = self._metrics.to_dict()
            calls = list(self._calls)
        fallback_today = date.today().isoformat()
        today_calls = [c for c in calls if c.call_date == fallback_today]
        base["daily_fallback_rate"] = {
            "date": fallback_today,
            "total_calls": len(today_calls),
            "fallback_calls": sum(1 for c in today_calls if c.mode == "HEURISTIC_FALLBACK"),
        }
        base["daily_fallback_rate"]["fallback_rate"] = round(
            base["daily_fallback_rate"]["fallback_calls"] / max(1, base["daily_fallback_rate"]["total_calls"]),
            4,
        )
        return base

    def recent_calls(self, limit: int = 100) -> list[dict]:
        """Derniers appels journalisés (le plus récent d'abord)."""
        with self._lock:
            calls = list(self._calls)
        return [c.to_dict() for c in reversed(calls[-limit:])]


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
