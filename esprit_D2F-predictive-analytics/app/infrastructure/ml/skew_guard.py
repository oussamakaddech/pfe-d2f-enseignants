"""Skew guard actif — test de Kolmogorov-Smirnov (KS) sur les features servies.

Complète la validation par plages (``feature_schema``) par un contrôle de
DÉRIVE DE DISTRIBUTION :

1. au chargement du modèle, un échantillon de référence par feature est
   capturé depuis le corpus d'entraînement (borné, sous-échantillonné de
   façon déterministe — graine 42) ;
2. au serving, les vecteurs de features réellement prédits sont accumulés
   dans une fenêtre glissante bornée ;
3. dès que la fenêtre atteint la taille minimale, un test KS à deux
   échantillons (``scipy.stats.ks_2samp``) compare chaque feature servie à
   sa référence d'entraînement.

Politique : ``p < 0,01`` (seuil configurable) sur au moins une feature =>
dérive détectée, le serving bascule en heuristique explicite (fail-closed)
avec une raison tracée dans ``ml_observability``. Si scipy est indisponible
ou si la référence est absente, le garde-fou est consultatif : il ne bloque
PAS le serving mais son statut honnête est exposé (jamais de dérive inventée).
"""
from __future__ import annotations

from collections import deque
from dataclasses import dataclass, field

import numpy as np

try:  # scipy est un transitif de scikit-learn ; garde-fou consultatif sinon.
    from scipy.stats import ks_2samp

    SCIPY_AVAILABLE = True
except ImportError:  # pragma: no cover - environnement minimal
    ks_2samp = None
    SCIPY_AVAILABLE = False

DEFAULT_P_THRESHOLD = 0.01
DEFAULT_WINDOW_SIZE = 30
DEFAULT_MIN_WINDOW = 10
DEFAULT_REF_CAP = 4000
_SUBSAMPLE_SEED = 42  # même graine canonique que le reste du pipeline


@dataclass
class SkewVerdict:
    """Résultat du dernier contrôle KS (exposé via /model-health)."""

    checked: bool = False
    skew_detected: bool = False
    features: list[str] = field(default_factory=list)
    min_p_value: float | None = None
    window_rows: int = 0
    reason: str | None = None

    def to_dict(self) -> dict:
        return {
            "checked": self.checked,
            "skew_detected": self.skew_detected,
            "features": list(self.features),
            "min_p_value": self.min_p_value,
            "window_rows": self.window_rows,
            "reason": self.reason,
        }


class SkewGuard:
    """Garde-fou de dérive de distribution (test KS, fail-closed)."""

    def __init__(
        self,
        feature_names: list[str],
        p_threshold: float = DEFAULT_P_THRESHOLD,
        window_size: int = DEFAULT_WINDOW_SIZE,
        min_window: int = DEFAULT_MIN_WINDOW,
        ref_cap: int = DEFAULT_REF_CAP,
        enabled: bool = True,
    ) -> None:
        self._feature_names = list(feature_names)
        self.p_threshold = float(p_threshold)
        self.window_size = int(max(1, window_size))
        self.min_window = int(max(1, min_window))
        self._ref_cap = int(max(1, ref_cap))
        self.enabled = bool(enabled)
        self._reference: dict[str, np.ndarray] = {}
        self._reference_rows = 0
        self._window: deque[np.ndarray] = deque(maxlen=self.window_size)
        self._last_verdict = SkewVerdict()

    # ------------------------------------------------------- Référence
    def set_reference_from_matrix(self, matrix: np.ndarray) -> int:
        """Capture l'échantillon de référence d'entraînement (une colonne par feature).

        ``matrix`` : (n_lignes, n_features) dans l'ordre canonique des features.
        Retourne le nombre de lignes effectivement retenues.
        """
        M = np.asarray(matrix, dtype=float)
        if M.ndim != 2 or M.shape[1] != len(self._feature_names) or M.shape[0] == 0:
            return 0
        if M.shape[0] > self._ref_cap:
            rng = np.random.default_rng(_SUBSAMPLE_SEED)
            idx = np.sort(rng.choice(M.shape[0], size=self._ref_cap, replace=False))
            M = M[idx]
        self._reference = {
            col: M[:, i] for i, col in enumerate(self._feature_names)
        }
        self._reference_rows = int(M.shape[0])
        self._last_verdict = SkewVerdict()  # invalide le verdict précédent
        return self._reference_rows

    def _window_matrix(self) -> np.ndarray | None:
        if not self._window:
            return None
        return np.vstack(list(self._window))

    # -------------------------------------------------------- Contrôle
    def evaluate(self) -> SkewVerdict:
        """Test KS par feature entre la fenêtre servie et la référence d'entraînement."""
        if not self.enabled:
            self._last_verdict = SkewVerdict(reason="skew guard désactivé (config)")
            return self._last_verdict
        if not SCIPY_AVAILABLE:  # pragma: no cover - environnement minimal
            self._last_verdict = SkewVerdict(
                reason="scipy indisponible — skew guard consultatif (non bloquant)"
            )
            return self._last_verdict
        if not self._reference:
            self._last_verdict = SkewVerdict(
                reason="référence d'entraînement indisponible — skew guard consultatif"
            )
            return self._last_verdict

        W = self._window_matrix()
        if W is None:
            self._last_verdict = SkewVerdict(reason="aucune feature servie encore accumulée")
            return self._last_verdict
        window_rows = int(W.shape[0])
        if window_rows < self.min_window:
            self._last_verdict = SkewVerdict(
                window_rows=window_rows,
                reason=(
                    f"fenêtre servie insuffisante : {window_rows} lignes "
                    f"< minimum {self.min_window}"
                ),
            )
            return self._last_verdict

        rng = np.random.default_rng(_SUBSAMPLE_SEED)
        if window_rows > self._ref_cap:
            idx = np.sort(rng.choice(window_rows, size=self._ref_cap, replace=False))
            W = W[idx]

        drifted: list[str] = []
        p_values: dict[str, float] = {}
        for i, col in enumerate(self._feature_names):
            ref = self._reference.get(col)
            if ref is None or ref.size < 2:
                continue
            p = float(ks_2samp(W[:, i], ref).pvalue)
            p_values[col] = p
            if p < self.p_threshold:
                drifted.append(col)

        min_p = min(p_values.values()) if p_values else None
        if drifted:
            reason = f"dérive KS détectée (p < {self.p_threshold:g}) sur : " + ", ".join(drifted)
        else:
            reason = "aucune dérive KS détectée"
        self._last_verdict = SkewVerdict(
            checked=True,
            skew_detected=bool(drifted),
            features=drifted,
            min_p_value=round(min_p, 6) if min_p is not None else None,
            window_rows=window_rows,
            reason=reason,
        )
        return self._last_verdict

    # ----------------------------------------------------------- Statut
    @property
    def last_verdict(self) -> SkewVerdict:
        return self._last_verdict

    def status(self) -> dict:
        """État honnête du garde-fou (exposé dans status() et /model-health)."""
        return {
            "enabled": self.enabled,
            "test": "kolmogorov_smirnov_2samp",
            "p_threshold": self.p_threshold,
            "window_size": self.window_size,
            "min_window": self.min_window,
            "reference_rows": self._reference_rows,
            "reference_captured": bool(self._reference),
            "window_rows": sum(a.shape[0] for a in self._window),
            "last_verdict": self._last_verdict.to_dict(),
        }

    # --------------------------------------------------------- Serving
    def record_serving(self, X: np.ndarray) -> None:
        """Accumule les vecteurs de features servis (fenêtre glissante bornée)."""
        arr = np.asarray(X, dtype=float)
        if arr.ndim != 2 or arr.shape[1] != len(self._feature_names) or arr.shape[0] == 0:
            return
        self._window.append(arr.copy())

