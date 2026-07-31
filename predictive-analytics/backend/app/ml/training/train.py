"""Entraînement et sélection de modèles (scikit-learn, reproductible)."""

from __future__ import annotations

import json
from dataclasses import dataclass, field
from datetime import datetime
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import (
    GradientBoostingClassifier,
    GradientBoostingRegressor,
    RandomForestClassifier,
    RandomForestRegressor,
)
from sklearn.linear_model import (
    LogisticRegression,
    Ridge,
)
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler

from app.ml.datasets.dataset_builder import SupervisedDataset
from app.ml.training.split import TemporalSplit, temporal_split

MODEL_FACTORIES_CLASSIFICATION: dict[str, Any] = {
    "logistic_regression": lambda: LogisticRegression(max_iter=1000, class_weight="balanced"),
    "random_forest": lambda: RandomForestClassifier(
        n_estimators=200, max_depth=5, random_state=42, class_weight="balanced"
    ),
    "gradient_boosting": lambda: GradientBoostingClassifier(
        n_estimators=200, max_depth=3, random_state=42
    ),
}

MODEL_FACTORIES_REGRESSION: dict[str, Any] = {
    "ridge": lambda: Ridge(alpha=1.0),
    "random_forest": lambda: RandomForestRegressor(
        n_estimators=200, max_depth=5, random_state=42
    ),
    "gradient_boosting": lambda: GradientBoostingRegressor(
        n_estimators=200, max_depth=3, random_state=42
    ),
}


@dataclass
class TrainingResult:
    target: str
    model_name: str
    pipeline: Pipeline | None = None
    metrics: dict[str, float] = field(default_factory=dict)
    model_version: str = ""
    trained_at: str = ""
    split_date: str = ""
    n_train: int = 0
    n_test: int = 0
    feature_importance: dict[str, float] = field(default_factory=dict)
    artifact_dir: Path | None = None
    status: str = "ok"
    message: str = ""

    def summary(self) -> dict[str, Any]:
        return {
            "target": self.target,
            "model_name": self.model_name,
            "model_version": self.model_version,
            "status": self.status,
            "message": self.message,
            "trained_at": self.trained_at,
            "split_date": self.split_date,
            "n_train": self.n_train,
            "n_test": self.n_test,
            "metrics": self.metrics,
        }


def build_pipeline(model_name: str, kind: str, scale: bool = True) -> Pipeline:
    if kind == "classification":
        factory = MODEL_FACTORIES_CLASSIFICATION[model_name]
    else:
        factory = MODEL_FACTORIES_REGRESSION[model_name]
    model = factory()
    steps: list[tuple[str, Any]] = []
    if scale and model_name in {"logistic_regression", "ridge"}:
        steps.append(("scaler", StandardScaler()))
    steps.append(("model", model))
    return Pipeline(steps)


def train(
    dataset: SupervisedDataset,
    target: str,
    *,
    model_names: list[str] | None = None,
    test_size: float = 0.2,
    min_train_rows: int = 10,
) -> TrainingResult:
    """Entraîne et sélectionne le meilleur modèle (split temporel)."""
    kind = "regression" if target == "training_effectiveness_score" else "classification"
    factories = (
        MODEL_FACTORIES_REGRESSION
        if kind == "regression"
        else MODEL_FACTORIES_CLASSIFICATION
    )
    candidates = model_names or list(factories.keys())

    if dataset.X.empty:
        return TrainingResult(
            target=target,
            model_name="",
            status="insufficient_data",
            message="INSUFFICIENT_HISTORICAL_DATA: dataset vide",
        )

    split: TemporalSplit
    try:
        split = temporal_split(dataset.event_dates, test_size=test_size, min_train_rows=min_train_rows)
    except ValueError as exc:
        return TrainingResult(
            target=target,
            model_name="",
            status="insufficient_data",
            message=f"INSUFFICIENT_HISTORICAL_DATA: {exc}",
        )

    X_train = dataset.X.iloc[split.train_indices]
    y_train = dataset.y.iloc[split.train_indices]
    X_test = dataset.X.iloc[split.test_indices]
    y_test = dataset.y.iloc[split.test_indices]

    if kind == "classification" and len(set(y_train)) < 2:
        return TrainingResult(
            target=target,
            model_name="",
            status="insufficient_data",
            message="INSUFFICIENT_HISTORICAL_DATA: classe unique dans le split d'entraînement",
        )

    best: TrainingResult | None = None
    for name in candidates:
        if name not in factories:
            continue
        pipeline = build_pipeline(name, kind)
        try:
            pipeline.fit(X_train, y_train)
            preds = pipeline.predict(X_test)
            proba = (
                pipeline.predict_proba(X_test)[:, 1]
                if kind == "classification" and hasattr(pipeline, "predict_proba")
                else None
            )
            metrics = compute_metrics(kind, y_test, preds, proba)
        except Exception as exc:  # noqa: BLE001
            metrics = {"error": str(exc)}
            preds = None

        result = TrainingResult(
            target=target,
            model_name=name,
            pipeline=pipeline,
            metrics=metrics,
            model_version=f"{target}-{name}-{datetime.now():%Y%m%d%H%M}",
            trained_at=datetime.now().isoformat(),
            split_date=str(split.split_date.date()),
            n_train=len(X_train),
            n_test=len(X_test),
        )
        if best is None or _better(result, best):
            best = result

    return best or TrainingResult(target=target, model_name="", status="failed", message="no model trained")


def _better(a: TrainingResult, b: TrainingResult) -> bool:
    a_ok = "error" not in a.metrics
    b_ok = "error" not in b.metrics
    if a_ok and not b_ok:
        return True
    if not a_ok and b_ok:
        return False
    if not a_ok and not b_ok:
        return False
    key_a = a.metrics.get("roc_auc") or a.metrics.get("rmse")
    key_b = b.metrics.get("roc_auc") or b.metrics.get("rmse")
    if key_a is None:
        return False
    if key_b is None:
        return True
    if "roc_auc" in a.metrics:
        return key_a > key_b
    return key_a < key_b


def compute_metrics(
    kind: str, y_true: pd.Series, y_pred: np.ndarray, y_proba: np.ndarray | None
) -> dict[str, float]:
    from sklearn.metrics import (
        accuracy_score,
        confusion_matrix,
        f1_score,
        mean_absolute_error,
        mean_squared_error,
        precision_score,
        r2_score,
        recall_score,
        roc_auc_score,
    )

    y_true = y_true.astype(float).values
    y_pred = y_pred.astype(float)
    if kind == "classification":
        metrics: dict[str, float] = {}
        if len(set(y_true)) > 1 and y_proba is not None:
            try:
                metrics["roc_auc"] = float(roc_auc_score(y_true, y_proba))
            except ValueError:
                pass
        metrics["f1"] = float(f1_score(y_true, (y_pred >= 0.5).astype(float), zero_division=0))
        metrics["precision"] = float(precision_score(y_true, (y_pred >= 0.5).astype(float), zero_division=0))
        metrics["recall"] = float(recall_score(y_true, (y_pred >= 0.5).astype(float), zero_division=0))
        metrics["accuracy"] = float(accuracy_score(y_true, (y_pred >= 0.5).astype(float)))
        try:
            cm = confusion_matrix(y_true, (y_pred >= 0.5).astype(float), labels=[0.0, 1.0])
            metrics["tn"] = int(cm[0][0])
            metrics["fp"] = int(cm[0][1])
            metrics["fn"] = int(cm[1][0])
            metrics["tp"] = int(cm[1][1])
        except Exception:
            pass
        return metrics
    # regression
    return {
        "rmse": float(np.sqrt(mean_squared_error(y_true, y_pred))),
        "mae": float(mean_absolute_error(y_true, y_pred)),
        "r2": float(r2_score(y_true, y_pred)),
    }


def export_artifacts(
    result: TrainingResult,
    *,
    out_dir: Path,
    feature_columns: list[str],
    drift_baseline: dict[str, float] | None = None,
    model_card: dict[str, Any] | None = None,
) -> Path:
    """Exporte model + preprocessor + feature schema + model card + metrics."""
    out_dir.mkdir(parents=True, exist_ok=True)
    if result.pipeline is not None:
        joblib.dump(result.pipeline, out_dir / f"{result.target}_model.joblib")
    (out_dir / f"{result.target}_feature_schema.json").write_text(
        json.dumps({"target": result.target, "feature_columns": feature_columns}, indent=2),
        encoding="utf-8",
    )
    (out_dir / f"{result.target}_metrics.json").write_text(
        json.dumps(result.summary(), indent=2, ensure_ascii=False), encoding="utf-8"
    )
    card = {
        "target": result.target,
        "model_name": result.model_name,
        "model_version": result.model_version,
        "trained_at": result.trained_at,
        "task": (
            "regression"
            if result.target == "training_effectiveness_score"
            else "classification"
        ),
        "temporal_split_date": result.split_date,
        "n_train": result.n_train,
        "n_test": result.n_test,
        "metrics": result.metrics,
        "feature_importance": result.feature_importance,
        "drift_baseline": drift_baseline or {},
        "intended_use": f"Prédiction de {result.target} pour le pilotage D2F.",
        "constraints": [
            "Entrée strictement ENSxxx",
            "Features calculées uniquement avec données <= date de scoring",
            "Réservé au pilotage, pas de décision individuelle automatique",
        ],
        **(model_card or {}),
    }
    (out_dir / f"{result.target}_model_card.json").write_text(
        json.dumps(card, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    result.artifact_dir = out_dir
    return out_dir
