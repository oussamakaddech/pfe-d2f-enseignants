"""Service d'inférence: chargement des modèles + scoring + explication."""

from __future__ import annotations

from dataclasses import dataclass, field
from datetime import date, datetime
from pathlib import Path
from typing import Any

import joblib
import pandas as pd

from app.ml.datasets.leakage import LeakageGuard
from app.ml.features.feature_engineering import FeatureVectorBuilder
from app.ml.features.feature_schema import FEATURE_COLUMNS
from app.infrastructure.repositories.curated_repository import CuratedRepository


@dataclass
class ScoreResponse:
    teacher_id: str
    target: str
    score: float
    status: str = "OK"  # OK | INSUFFICIENT_HISTORICAL_DATA | MODEL_UNAVAILABLE
    explanation: str = ""
    feature_contributions: dict[str, float] = field(default_factory=dict)
    model_version: str = ""
    trained_at: str = ""
    scored_at: str = ""


class InferenceService:
    def __init__(self, repository: CuratedRepository, model_dir: str | Path) -> None:
        self.repo = repository
        self.model_dir = Path(model_dir)
        self._models: dict[str, Any] = {}
        self._registry: dict[str, dict] = {}
        self._load_registry()

    def _load_registry(self) -> None:
        if not self.model_dir.exists():
            return
        # artefacts exportés sous data/models/<target>/<target>_model_card.json
        # (support aussi l'ancienne disposition à plat: <target>_model_card.json)
        candidates = list(self.model_dir.glob("*_model_card.json")) + list(
            self.model_dir.glob("*/*_model_card.json")
        )
        for path in candidates:
            target = path.name.replace("_model_card.json", "")
            self._registry[target] = {
                "model_card": path,
                "model_path": path.with_name(f"{target}_model.joblib"),
            }

    def available_targets(self) -> list[str]:
        return sorted(self._registry.keys())

    def load(self, target: str):
        if target in self._models:
            return self._models[target]
        entry = self._registry.get(target)
        if entry is None or not entry["model_path"].exists():
            raise FileNotFoundError(f"modèle indisponible: {target}")
        pipeline = joblib.load(entry["model_path"])
        card = _read_json(entry["model_card"])
        self._models[target] = (pipeline, card)
        return self._models[target]

    def score(self, target: str, teacher_id: str, as_of: date | None = None) -> ScoreResponse:
        try:
            pipeline, card = self.load(target)
        except FileNotFoundError:
            return ScoreResponse(
                teacher_id=teacher_id,
                target=target,
                score=0.0,
                status="MODEL_UNAVAILABLE",
                explanation="Modèle non entraîné: lancez POST /api/v1/ml/train/{target}.",
            )

        as_of = as_of or self.repo.reference_date
        builder = FeatureVectorBuilder(self.repo)
        context = self.repo.build_context(teacher_id, as_of)
        if context is None:
            return ScoreResponse(
                teacher_id=teacher_id,
                target=target,
                score=0.0,
                status="INSUFFICIENT_HISTORICAL_DATA",
                explanation="Enseignant inconnu dans les datasets curated.",
            )
        vector = builder.vector(teacher_id, as_of)
        if vector is None:
            return ScoreResponse(
                teacher_id=teacher_id,
                target=target,
                score=0.0,
                status="INSUFFICIENT_HISTORICAL_DATA",
                explanation="Historique insuffisant pour construire les features.",
            )

        X = pd.DataFrame([{col: vector.get(col, 0.0) for col in FEATURE_COLUMNS}])
        task = card.get("task", "classification")
        if task == "regression":
            value = float(pipeline.predict(X)[0])
            value = max(0.0, min(1.0, value))
        else:
            value = float(pipeline.predict_proba(X)[:, 1][0])

        contributions = self._contributions(pipeline, X)

        return ScoreResponse(
            teacher_id=teacher_id,
            target=target,
            score=round(value, 4),
            status="OK",
            explanation=(
                f"Probabilité estimée de {target}: {value:.2f}. "
                "Score indicatif de pilotage basé sur l'historique temporel."
            ),
            feature_contributions=contributions,
            model_version=card.get("model_version", "unknown"),
            trained_at=card.get("trained_at", ""),
            scored_at=datetime.now().isoformat(),
        )

    def _contributions(self, pipeline, X: pd.DataFrame) -> dict[str, float]:
        try:
            model = pipeline.named_steps["model"]
            if hasattr(model, "coef_"):
                coefs = model.coef_
                if len(coefs.shape) == 1:
                    return {col: float(c) for col, c in zip(FEATURE_COLUMNS, coefs)}
            return {}
        except Exception:
            return {}


def _read_json(path: Path) -> dict:
    import json

    return json.loads(path.read_text(encoding="utf-8"))
