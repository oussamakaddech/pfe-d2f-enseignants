"""Filtrage collaboratif hybride — cosine-KNN + SVD (matrix factorization).

« Les enseignants au profil proche du vôtre ont aussi suivi ces formations. »

Deux méthodes complémentaires :
1. **Cosine-KNN** (user-based) : similarité cosinus sur la matrice enseignant ×
   compétence, K plus proches voisins.
2. **SVD** (matrix factorization) : factorisation de la matrice en latents
   factors, reconstruction lissée, prédiction par produit scalaire.

L'approche hybride combine les deux scores par moyenne pondérée
(configurable via ``svd_weight``), ce qui améliore la robustesse par
rapport à chaque méthode isolée — particularly when the user-item matrix
is sparse.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from typing import Any

import numpy as np
from sklearn.metrics.pairwise import cosine_similarity

logger = logging.getLogger(__name__)

# Etats d'inscription considérés comme « formation suivie/complétée ».
_COMPLETED_STATES = {"APPROVED"}

# Score neutre renvoyé quand aucun signal collaboratif n'est disponible
# (pas de voisins, profil inconnu) : ni bonus, ni pénalité.
NEUTRAL_PEER_SCORE = 0.5

# Nombre de composantes latentes SVD (régule le underfitting/overfitting).
_SVD_N_COMPONENTS = 20


def _build_profiles(competency_levels: list[dict[str, Any]]) -> dict[str, dict[int, int]]:
    profiles: dict[str, dict[int, int]] = defaultdict(dict)
    for cl in competency_levels:
        tid = str(cl.get("enseignant_id") or "")
        cid = cl.get("competence_id")
        if not tid or cid is None:
            continue
        cid = int(cid)
        lvl = int(cl.get("current_level") or 0)
        profiles[tid][cid] = max(profiles[tid].get(cid, 0), lvl)
    return profiles


def _build_similarity_matrix(
    teachers: list[str], profiles: dict[str, dict[int, int]]
) -> np.ndarray | None:
    if not teachers:
        return None
    comp_ids = sorted({c for d in profiles.values() for c in d})
    if not comp_ids:
        return None
    col = {c: i for i, c in enumerate(comp_ids)}
    row = {t: i for i, t in enumerate(teachers)}
    matrix = np.zeros((len(teachers), len(comp_ids)), dtype=float)
    for t, levels in profiles.items():
        r = row[t]
        for cid, lvl in levels.items():
            matrix[r, col[cid]] = lvl
    return cosine_similarity(matrix)


def _build_completers(inscriptions: list[dict[str, Any]]) -> dict[int, set[str]]:
    completers: dict[int, set[str]] = defaultdict(set)
    for ins in inscriptions:
        if ins.get("etat") in _COMPLETED_STATES:
            fid = ins.get("formation_id")
            tid = str(ins.get("enseignant_id") or "")
            if fid is not None and tid:
                completers[int(fid)].add(tid)
    return completers


class SVDCollaborativeFilter:
    """Filtrage collaboratif par matrix factorization (SVD tronqué).

    Décompose la matrice enseignant × compétence en composantes latentes
    (dimensions cachées), puis utilise la similarité cosinus dans cet
    espace réduit pour identifier les pairs similaires.

    Avantages par rapport au cosine-KNN brut :
    - Robuste au sparse data (la plupart des cellules sont vides).
    - Capture les patterns latents (ex: deux enseignants ayant des profils
      différents mais complémentaires sont plus proches en latents factors).
    - Moins sensible au bruit des évaluations individuelles.
    """

    def __init__(
        self,
        competency_levels: list[dict[str, Any]],
        inscriptions: list[dict[str, Any]],
        n_components: int = _SVD_N_COMPONENTS,
        k_neighbors: int = 10,
    ):
        self.k = max(1, k_neighbors)
        self.n_components = n_components
        self._peers_cache: dict[str, list[tuple[str, float]]] = {}

        profiles = _build_profiles(competency_levels)
        self.teachers: list[str] = list(profiles.keys())
        self._row: dict[str, int] = {t: i for i, t in enumerate(self.teachers)}
        self.completers = _build_completers(inscriptions)

        # Build user-item matrix
        comp_ids = sorted({c for d in profiles.values() for c in d})
        self._comp_col: dict[int, int] = {c: i for i, c in enumerate(comp_ids)}
        self._comp_ids = comp_ids

        if not self.teachers or not comp_ids:
            self._latent_matrix = None
            self._sim = None
            return

        matrix = np.zeros((len(self.teachers), len(comp_ids)), dtype=float)
        for t, levels in profiles.items():
            r = self._row[t]
            for cid, lvl in levels.items():
                matrix[r, self._comp_col[cid]] = lvl

        # Center the matrix (mean per teacher, ignoring zeros)
        self._means = np.zeros(len(self.teachers))
        for i in range(len(self.teachers)):
            nonzero = matrix[i] > 0
            if nonzero.any():
                self._means[i] = matrix[i, nonzero].mean()
            matrix[i, nonzero] -= self._means[i]

        # SVD truncation
        n_comp = min(self.n_components, len(self.teachers) - 1, len(comp_ids) - 1)
        if n_comp < 1:
            self._latent_matrix = None
            self._sim = None
            return

        try:
            U, S, _ = np.linalg.svd(matrix, full_matrices=False)
            # Truncate to n_components latent dimensions
            self._latent_matrix = U[:, :n_comp] * S[:n_comp]
            self._sim = cosine_similarity(self._latent_matrix)
            logger.info(
                "SVD collaborative filter: %d teachers × %d competences → %d latent dims",
                len(self.teachers), len(comp_ids), n_comp,
            )
        except np.linalg.LinAlgError:
            logger.warning("SVD decomposition failed, falling back to cosine-KNN")
            self._latent_matrix = None
            self._sim = _build_similarity_matrix(self.teachers, profiles)

    def similar_teachers(self, teacher_id: str) -> list[tuple[str, float]]:
        """K plus proches voisins dans l'espace latents SVD."""
        teacher_id = str(teacher_id)
        if self._sim is None or teacher_id not in self._row:
            return []
        if teacher_id in self._peers_cache:
            return self._peers_cache[teacher_id]

        row = self._row[teacher_id]
        peers = [
            (self.teachers[i], float(s))
            for i, s in enumerate(self._sim[row])
            if self.teachers[i] != teacher_id and s > 0
        ]
        peers.sort(key=lambda x: x[1], reverse=True)
        peers = peers[: self.k]
        self._peers_cache[teacher_id] = peers
        return peers

    def peer_success_rate(self, teacher_id: str, formation_id: int) -> float:
        """Fraction pondérée des voisins SVD ayant complété la formation (0-1)."""
        peers = self.similar_teachers(teacher_id)
        if not peers:
            return NEUTRAL_PEER_SCORE
        adopters = self.completers.get(int(formation_id), set())
        if not adopters:
            return 0.0
        num = sum(sim for pid, sim in peers if pid in adopters)
        den = sum(sim for _pid, sim in peers) or 1.0
        return round(num / den, 4)

    def peer_adoption_count(self, teacher_id: str, formation_id: int) -> int:
        """Nombre de voisins SVD ayant complété la formation."""
        peers = self.similar_teachers(teacher_id)
        adopters = self.completers.get(int(formation_id), set())
        return sum(1 for pid, _ in peers if pid in adopters)


class CollaborativeFilter:
    """Filtrage collaboratif hybride : cosine-KNN + SVD.

    Combine les scores des deux méthodes par moyenne pondérée :
    ``score = (1 - svd_weight) × knn_score + svd_weight × svd_score``

    Par défaut svd_weight=0.5 (poids égal). Augmenter svd_weight quand
    la matrice est très sparse (peu d'inscriptions par enseignant).
    """

    def __init__(
        self,
        competency_levels: list[dict[str, Any]],
        inscriptions: list[dict[str, Any]],
        k_neighbors: int = 10,
        svd_weight: float = 0.5,
    ):
        self.svd_weight = max(0.0, min(1.0, svd_weight))

        # Cosine-KNN filter
        self.k = max(1, k_neighbors)
        self._peers_cache: dict[str, list[tuple[str, float]]] = {}

        profiles = _build_profiles(competency_levels)
        self.teachers: list[str] = list(profiles.keys())
        self._row: dict[str, int] = {t: i for i, t in enumerate(self.teachers)}
        self._sim = _build_similarity_matrix(self.teachers, profiles)
        self.completers = _build_completers(inscriptions)

        # SVD filter
        self._svd = SVDCollaborativeFilter(
            competency_levels, inscriptions,
            n_components=_SVD_N_COMPONENTS, k_neighbors=k_neighbors,
        )

    def similar_teachers(self, teacher_id: str) -> list[tuple[str, float]]:
        """K plus proches voisins (cosine-KNN), utilisé pour le path legacy."""
        teacher_id = str(teacher_id)
        if self._sim is None or teacher_id not in self._row:
            return []
        if teacher_id in self._peers_cache:
            return self._peers_cache[teacher_id]

        row = self._row[teacher_id]
        peers = [
            (self.teachers[i], float(s))
            for i, s in enumerate(self._sim[row])
            if self.teachers[i] != teacher_id and s > 0
        ]
        peers.sort(key=lambda x: x[1], reverse=True)
        peers = peers[: self.k]
        self._peers_cache[teacher_id] = peers
        return peers

    def peer_success_rate(self, teacher_id: str, formation_id: int) -> float:
        """Score hybride cosine-KNN + SVD de taux de réussite par les pairs."""
        knn_score = self._knn_peer_success_rate(teacher_id, formation_id)
        svd_score = self._svd.peer_success_rate(teacher_id, formation_id)
        w = self.svd_weight
        return round((1.0 - w) * knn_score + w * svd_score, 4)

    def peer_adoption_count(self, teacher_id: str, formation_id: int) -> int:
        """Nombre de voisins ayant complété la formation (cosine-KNN)."""
        peers = self.similar_teachers(teacher_id)
        adopters = self.completers.get(int(formation_id), set())
        return sum(1 for pid, _ in peers if pid in adopters)

    def _knn_peer_success_rate(self, teacher_id: str, formation_id: int) -> float:
        """Score KNN pur (sans SVD)."""
        peers = self.similar_teachers(teacher_id)
        if not peers:
            return NEUTRAL_PEER_SCORE
        adopters = self.completers.get(int(formation_id), set())
        if not adopters:
            return 0.0
        num = sum(sim for pid, sim in peers if pid in adopters)
        den = sum(sim for _pid, sim in peers) or 1.0
        return round(num / den, 4)
