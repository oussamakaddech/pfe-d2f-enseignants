"""Deep Learning — MLP (Multi-Layer Perceptron) pour prédiction de décrochage.

4ème candidat dans le model selection automatique. Compare :
    1. GradientBoosting (sklearn)
    2. XGBoost
    3. LightGBM
    4. MLP (sklearn.neural_network.MLPClassifier)

Le MLP est un réseau de neurones simple avec :
- 2 couches cachées (128 → 64 unités)
- Activation ReLU
- Optimiseur Adam
- Early stopping pour éviter le sur-apprentissage

Pas de PyTorch/TensorFlow requis — sklearn suffit pour les données
tabulaires de ce projet. Le deep learning apporte une non-linéarité
différente des modèles à base d'arbres.

Référence : "Deep Learning" (Goodfellow et al., 2016), Ch. 6 — MLP.
"""

from __future__ import annotations

import logging
import tempfile
import time
from typing import Any

import numpy as np
from joblib import Memory
from sklearn.neural_network import MLPClassifier
from sklearn.model_selection import cross_val_score
from sklearn.preprocessing import StandardScaler
from sklearn.pipeline import Pipeline

logger = logging.getLogger(__name__)

_pipeline_cache_dir = tempfile.mkdtemp(prefix="d2f_mlp_")
_pipeline_memory = Memory(_pipeline_cache_dir, verbose=0)


def build_mlp_pipeline(
    hidden_layer_sizes: tuple[int, ...] = (128, 64),
    max_iter: int = 500,
    early_stopping: bool = True,
    random_state: int = 42,
) -> Pipeline:
    """Construit un pipeline MLP avec scaling + classification.

    Args:
        hidden_layer_sizes: tuple des tailles de couches cachées
        max_iter: nombre maximum d'itérations
        early_stopping: arrêt anticipé si pas d'amélioration
        random_state: seed pour la reproductibilité

    Returns:
        Pipeline sklearn avec StandardScaler + MLPClassifier
    """
    mlp = MLPClassifier(
        hidden_layer_sizes=hidden_layer_sizes,
        activation="relu",
        solver="adam",
        alpha=1e-4,  # régularisation L2
        batch_size="auto",
        learning_rate="adaptive",
        learning_rate_init=1e-3,
        max_iter=max_iter,
        shuffle=True,
        random_state=random_state,
        early_stopping=early_stopping,
        validation_fraction=0.15,
        n_iter_no_change=20,
        tol=1e-4,
    )
    return Pipeline([
        ("scaler", StandardScaler()),
        ("mlp", mlp),
    ], memory=_pipeline_memory)


def cross_validate_mlp(
    X: np.ndarray,
    y: np.ndarray,
    cv: int = 5,
    hidden_layer_sizes: tuple[int, ...] = (128, 64),
    random_state: int = 42,
) -> dict[str, Any]:
    """Évalue le MLP par validation croisée.

    Returns:
        dict avec 'mean_score', 'std_score', 'cv_scores', 'fit_time'
    """
    pipeline = build_mlp_pipeline(
        hidden_layer_sizes=hidden_layer_sizes,
        random_state=random_state,
    )

    start = time.time()
    scores = cross_val_score(
        pipeline, X, y,
        cv=cv,
        scoring="neg_root_mean_squared_error",
        n_jobs=1,  # MLP non parallélisable en interne
    )
    fit_time = time.time() - start

    return {
        "mean_score": round(float(-scores.mean()), 4),
        "std_score": round(float(scores.std()), 4),
        "cv_scores": [round(float(-s), 4) for s in scores],
        "fit_time": round(fit_time, 2),
        "model_type": "MLP",
        "hidden_layer_sizes": list(hidden_layer_sizes),
    }


def build_mlp(
    X: np.ndarray,
    y: np.ndarray,
    hidden_layer_sizes: tuple[int, ...] = (128, 64),
    random_state: int = 42,
) -> Pipeline:
    """Entraîne et retourne un modèle MLP complet.

    Returns:
        Pipeline entraîné (scaler + MLP)
    """
    pipeline = build_mlp_pipeline(
        hidden_layer_sizes=hidden_layer_sizes,
        random_state=random_state,
    )
    pipeline.fit(X, y)
    return pipeline


def get_feature_importance(pipeline: Pipeline) -> dict[str, float] | None:
    """Extrait l'importance des features via les poids du premier layer.

    Pour un MLP, l'importance est approximée par la somme des valeurs
    absolues des poids d'entrée (première couche).
    """
    try:
        mlp = pipeline.named_steps["mlp"]
        coefs_first_layer = mlp.coefs_[0]  # shape: (n_features, 128)
        importance = np.abs(coefs_first_layer).mean(axis=1)
        return {f"feature_{i}": round(float(v), 6) for i, v in enumerate(importance)}
    except (AttributeError, IndexError):
        return None
