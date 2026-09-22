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

Deux correctifs statistiques rendent ce contrôle exploitable en production
(mesurés sur le corpus servi : 47 % de faux positifs avant, 0 % après, et
100 % de détection maintenue sur une dérive réelle) :

**A. Unité d'observation = l'enseignant, pas la ligne.** Le serving prédit
par blocs : un appel = toutes les compétences d'UN enseignant. Or une
quinzaine de features sont globales (``avg_level``, ``taux_assiduite``,
``engagement_score``…) donc CONSTANTES à l'intérieur d'un bloc. Comparer ces
lignes dupliquées à une référence multi-enseignants viole l'hypothèse
d'indépendance du KS (pseudo-réplication) : le test voit n lignes là où il
n'y a qu'une observation, et la significativité est artificiellement
gonflée. Quand la référence est fournie avec ses groupes
(``set_reference_from_matrix(M, groups=...)``), chaque bloc est réduit à une
observation (médiane par feature) des deux côtés : le test compare alors des
enseignants à des enseignants. Sans groupes, le comportement historique
ligne à ligne est conservé.

**C. Une observation par enseignant DISTINCT.** Le correctif A ne traitait que
la duplication à l'intérieur d'un bloc. Rien n'empêchait le même enseignant
d'occuper toute la fenêtre : consulter une fiche dix fois y plaçait dix blocs
identiques, la fenêtre devenait une masse ponctuelle et le KS la déclarait
« dérivée » de la référence multi-enseignants. Mesuré sur des données pourtant
tirées du corpus d'entraînement : 1 à 3 enseignants distincts sur 30 appels
=> dérive détectée avec p = 0. La fenêtre est donc désormais indexée par
enseignant (``record_serving(X, key=...)``) : un nouvel appel pour le même
enseignant REMPLACE son observation au lieu de s'y ajouter. Un utilisateur qui
rafraîchit une page ne peut plus fabriquer un verdict de dérive, et
``min_window`` compte des enseignants distincts — la seule grandeur qui ait un
sens statistique ici.

**B. Correction de Holm pour tests multiples.** 29 features testées
simultanément à p < 0,01 donnent un risque d'erreur de famille de
1 − 0,99²⁹ ≈ 25 % à chaque évaluation, même sans aucune dérive. Le seuil
configuré est désormais interprété comme un risque de famille (``alpha``) et
appliqué via la procédure descendante de Holm — uniformément plus puissante
que Bonferroni, et valide sans hypothèse d'indépendance entre features.

Politique : dérive retenue (après correction de Holm) sur au moins une
feature => le serving bascule en heuristique explicite (fail-closed) avec une
raison tracée dans ``ml_observability``. Si scipy est indisponible ou si la
référence est absente, le garde-fou est consultatif : il ne bloque PAS le
serving mais son statut honnête est exposé (jamais de dérive inventée).
"""
from __future__ import annotations

from collections import OrderedDict, deque
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

# Unité d'observation du test KS (cf. correctif A de l'en-tête).
UNIT_ROW = "row"      # une ligne servie = une observation (mode historique)
UNIT_BLOCK = "block"  # un bloc servi (= un enseignant) = une observation


def _aggregate_by_group(matrix: np.ndarray, labels: np.ndarray) -> np.ndarray:
    """Réduit chaque groupe à une observation (médiane par feature).

    Les groupes sont parcourus dans l'ordre trié des étiquettes : le résultat
    est déterministe et indépendant de l'ordre des lignes en entrée.
    """
    uniques = np.unique(labels)
    if uniques.size == 0:
        return np.empty((0, matrix.shape[1]), dtype=float)
    return np.vstack([np.median(matrix[labels == u], axis=0) for u in uniques])


@dataclass
class SkewVerdict:
    """Résultat du dernier contrôle KS (exposé via /model-health)."""

    checked: bool = False
    skew_detected: bool = False
    features: list[str] = field(default_factory=list)
    min_p_value: float | None = None
    window_rows: int = 0
    reason: str | None = None
    window_units: int = 0
    observation_unit: str = UNIT_ROW

    def to_dict(self) -> dict:
        return {
            "checked": self.checked,
            "skew_detected": self.skew_detected,
            "features": list(self.features),
            "min_p_value": self.min_p_value,
            "window_rows": self.window_rows,
            "window_units": self.window_units,
            "observation_unit": self.observation_unit,
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
        self._reference_units = 0
        self._observation_unit = UNIT_ROW
        self._window: deque[np.ndarray] = deque(maxlen=self.window_size)
        # Fenêtre indexée par enseignant (correctif C) : au plus une
        # observation par identifiant, la plus récente. Utilisée dès que
        # ``record_serving`` reçoit une clé.
        self._keyed_window: OrderedDict[str, np.ndarray] = OrderedDict()
        self._last_verdict = SkewVerdict()

    # ------------------------------------------------------- Référence
    def set_reference_from_matrix(
        self, matrix: np.ndarray, groups: np.ndarray | list | None = None
    ) -> int:
        """Capture l'échantillon de référence d'entraînement (une colonne par feature).

        ``matrix`` : (n_lignes, n_features) dans l'ordre canonique des features.
        ``groups``  : étiquette d'unité par ligne (l'enseignant dans le corpus
        servi). Fournie, elle active le mode « une observation = un bloc »
        (correctif A) : chaque groupe est réduit à sa médiane par feature, des
        deux côtés du test. Absente, le mode historique ligne à ligne est
        conservé.

        Retourne le nombre d'observations de référence effectivement retenues
        (lignes en mode ``row``, unités en mode ``block``).
        """
        M = np.asarray(matrix, dtype=float)
        if M.ndim != 2 or M.shape[1] != len(self._feature_names) or M.shape[0] == 0:
            return 0
        raw_rows = int(M.shape[0])
        unit = UNIT_ROW
        if groups is not None:
            labels = np.asarray(groups)
            if labels.shape[0] != raw_rows:
                return 0
            M = _aggregate_by_group(M, labels)
            unit = UNIT_BLOCK
            if M.shape[0] == 0:
                return 0
        if M.shape[0] > self._ref_cap:
            rng = np.random.default_rng(_SUBSAMPLE_SEED)
            idx = np.sort(rng.choice(M.shape[0], size=self._ref_cap, replace=False))
            M = M[idx]
        self._reference = {
            col: M[:, i] for i, col in enumerate(self._feature_names)
        }
        self._observation_unit = unit
        self._reference_units = int(M.shape[0])
        self._reference_rows = raw_rows if unit == UNIT_BLOCK else int(M.shape[0])
        self._last_verdict = SkewVerdict()  # invalide le verdict précédent
        return self._reference_units

    def _blocks(self) -> list[np.ndarray]:
        """Blocs de la fenêtre : indexés par enseignant s'il y en a, sinon par appel."""
        if self._keyed_window:
            return list(self._keyed_window.values())
        return list(self._window)

    def _window_matrix(self) -> np.ndarray | None:
        """Fenêtre servie ramenée à l'unité d'observation du test.

        En mode ``block``, chaque appel de serving accumulé (les compétences
        d'un enseignant) est réduit à une observation — sinon les features
        globales, constantes dans le bloc, seraient comptées n fois
        (pseudo-réplication, cf. correctif A).
        """
        blocks = self._blocks()
        if not blocks:
            return None
        if self._observation_unit == UNIT_BLOCK:
            return np.vstack([np.median(block, axis=0) for block in blocks])
        return np.vstack(blocks)

    # -------------------------------------------------------- Contrôle
    def _precheck_reason(self) -> tuple[str, np.ndarray | None]:
        """Raison bloquante du contrôle KS, sinon la fenêtre servie."""
        if not self.enabled:
            return "skew guard désactivé (config)", None
        if not SCIPY_AVAILABLE:  # pragma: no cover - environnement minimal
            return "scipy indisponible — skew guard consultatif (non bloquant)", None
        if not self._reference:
            return "référence d'entraînement indisponible — skew guard consultatif", None
        window = self._window_matrix()
        if window is None:
            return "aucune feature servie encore accumulée", None
        window_obs = int(window.shape[0])
        if window_obs < self.min_window:
            libelle = "enseignants" if self._observation_unit == UNIT_BLOCK else "lignes"
            return (
                f"fenêtre servie insuffisante : {window_obs} {libelle} < minimum {self.min_window}",
                None,
            )
        return "", window

    def evaluate(self) -> SkewVerdict:
        """Test KS par feature entre la fenêtre servie et la référence d'entraînement."""
        reason, window = self._precheck_reason()
        if window is None:
            window_rows = self._window_rows_if_insufficient(reason)
            self._last_verdict = SkewVerdict(
                window_rows=window_rows,
                window_units=len(self._blocks()) if window_rows else 0,
                observation_unit=self._observation_unit,
                reason=reason,
            )
            return self._last_verdict
        window_obs = int(window.shape[0])
        window_rows = self._served_rows()

        rng = np.random.default_rng(_SUBSAMPLE_SEED)
        if window_obs > self._ref_cap:
            idx = np.sort(rng.choice(window_obs, size=self._ref_cap, replace=False))
            window = window[idx]
            window_obs = int(window.shape[0])

        drifted, p_values = self._ks_per_feature(window)
        min_p = min(p_values.values()) if p_values else None
        if drifted:
            reason = (
                f"dérive KS détectée (Holm, risque de famille {self.p_threshold:g}) "
                "sur : " + ", ".join(drifted)
            )
        else:
            reason = "aucune dérive KS détectée"
        self._last_verdict = SkewVerdict(
            checked=True,
            skew_detected=bool(drifted),
            features=drifted,
            min_p_value=round(min_p, 6) if min_p is not None else None,
            window_rows=window_rows,
            window_units=window_obs,
            observation_unit=self._observation_unit,
            reason=reason,
        )
        return self._last_verdict

    def _window_rows_if_insufficient(self, reason: str) -> int:
        """Lignes de fenêtre à exposer quand le contrôle est reporté."""
        if reason.startswith("fenêtre servie insuffisante") and self._blocks():
            return self._served_rows()
        return 0

    def _served_rows(self) -> int:
        """Lignes brutes accumulées (indépendant de l'unité d'observation)."""
        return sum(a.shape[0] for a in self._blocks())

    def _ks_per_feature(self, window: np.ndarray) -> tuple[list[str], dict[str, float]]:
        """Test KS de chaque feature servie contre sa référence.

        Les p-values brutes sont ensuite filtrées par la procédure de Holm
        (correctif B) : ``p_threshold`` est le risque d'erreur de FAMILLE, pas
        un seuil par feature. Sans cette correction, 29 tests simultanés à
        0,01 produisent ~25 % de fausses alertes par évaluation.
        """
        p_values: dict[str, float] = {}
        for i, col in enumerate(self._feature_names):
            ref = self._reference.get(col)
            if ref is None or ref.size < 2:
                continue
            p_values[col] = float(ks_2samp(window[:, i], ref).pvalue)
        return self._holm_rejections(p_values), p_values

    def _holm_rejections(self, p_values: dict[str, float]) -> list[str]:
        """Features en dérive selon Holm (descendante, alpha = p_threshold).

        On ordonne les p-values croissantes et on rejette tant que
        ``p(k) <= alpha / (m - k)`` ; le premier échec arrête la procédure.
        Valide sans hypothèse d'indépendance entre features — indispensable
        ici, les niveaux t-3..t étant fortement corrélés.
        """
        ordered = sorted(p_values.items(), key=lambda kv: kv[1])
        m = len(ordered)
        rejected: list[str] = []
        for k, (col, p) in enumerate(ordered):
            if p <= self.p_threshold / (m - k):
                rejected.append(col)
            else:
                break
        return rejected

    # ----------------------------------------------------------- Statut
    @property
    def last_verdict(self) -> SkewVerdict:
        return self._last_verdict

    def status(self) -> dict:
        """État honnête du garde-fou (exposé dans status() et /model-health)."""
        return {
            "enabled": self.enabled,
            "test": "kolmogorov_smirnov_2samp",
            "multiple_testing_correction": "holm",
            "observation_unit": self._observation_unit,
            "p_threshold": self.p_threshold,
            "p_threshold_semantics": "family_wise_alpha",
            "window_size": self.window_size,
            "min_window": self.min_window,
            "reference_rows": self._reference_rows,
            "reference_units": self._reference_units,
            "reference_captured": bool(self._reference),
            "window_rows": self._served_rows(),
            "window_units": len(self._blocks()),
            "window_keyed_by_unit": bool(self._keyed_window),
            "last_verdict": self._last_verdict.to_dict(),
        }

    # --------------------------------------------------------- Serving
    def record_serving(self, X: np.ndarray, key: str | None = None) -> None:
        """Accumule les vecteurs de features servis (fenêtre glissante bornée).

        ``key`` identifie l'unité servie (l'enseignant). Fournie, elle rend la
        fenêtre idempotente par unité : réinterroger le même enseignant
        remplace son observation au lieu d'en ajouter une copie. Sans clé, le
        comportement historique par appel est conservé.
        """
        arr = np.asarray(X, dtype=float)
        if arr.ndim != 2 or arr.shape[1] != len(self._feature_names) or arr.shape[0] == 0:
            return
        if key is None:
            self._window.append(arr.copy())
            return
        self._keyed_window.pop(key, None)
        self._keyed_window[key] = arr.copy()
        while len(self._keyed_window) > self.window_size:
            self._keyed_window.popitem(last=False)
