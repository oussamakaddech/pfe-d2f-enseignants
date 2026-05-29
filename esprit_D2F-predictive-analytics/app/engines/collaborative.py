"""Filtrage collaboratif user-based (spec §2 — moteur hybride).

« Les enseignants au profil proche du vôtre ont aussi suivi ces formations. »

Principe :
1. On construit une matrice enseignant × compétence (niveau de maîtrise).
2. La similarité cosinus entre enseignants identifie les K plus proches voisins.
3. Pour une formation donnée, le `peer_success_rate` est la fraction —
   pondérée par la similarité — des voisins ayant complété cette formation.

Combiné au score de pertinence (content-based) déjà calculé par le
RecommendationEngine, cela forme un moteur de recommandation **hybride**.
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


class CollaborativeFilter:
    """Filtrage collaboratif basé sur la similarité des profils de compétences."""

    def __init__(
        self,
        competency_levels: list[dict[str, Any]],
        inscriptions: list[dict[str, Any]],
        k_neighbors: int = 10,
    ):
        self.k = max(1, k_neighbors)
        self._peers_cache: dict[str, list[tuple[str, float]]] = {}

        # enseignant → {competence_id: niveau max}
        profiles: dict[str, dict[int, int]] = defaultdict(dict)
        for cl in competency_levels:
            tid = str(cl.get("enseignant_id") or "")
            cid = cl.get("competence_id")
            if not tid or cid is None:
                continue
            cid = int(cid)
            lvl = int(cl.get("current_level") or 0)
            profiles[tid][cid] = max(profiles[tid].get(cid, 0), lvl)

        self.teachers: list[str] = list(profiles.keys())
        self._row: dict[str, int] = {t: i for i, t in enumerate(self.teachers)}
        comp_ids = sorted({c for d in profiles.values() for c in d})
        col = {c: i for i, c in enumerate(comp_ids)}

        if self.teachers and comp_ids:
            matrix = np.zeros((len(self.teachers), len(comp_ids)), dtype=float)
            for t, levels in profiles.items():
                r = self._row[t]
                for cid, lvl in levels.items():
                    matrix[r, col[cid]] = lvl
            # Lignes nulles → cosinus indéfini ; cosine_similarity renvoie 0, ce
            # qui exclut naturellement ces enseignants des voisinages.
            self._sim = cosine_similarity(matrix)
        else:
            self._sim = None

        # formation_id → ensemble d'enseignants l'ayant complétée
        self.completers: dict[int, set[str]] = defaultdict(set)
        for ins in inscriptions:
            if ins.get("etat") in _COMPLETED_STATES:
                fid = ins.get("formation_id")
                tid = str(ins.get("enseignant_id") or "")
                if fid is not None and tid:
                    self.completers[int(fid)].add(tid)

    def similar_teachers(self, teacher_id: str) -> list[tuple[str, float]]:
        """K plus proches voisins (id, similarité), similarité > 0, triés desc."""
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
        """Fraction pondérée des voisins ayant complété la formation (0-1)."""
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
        """Nombre de voisins ayant complété la formation (pour la justification)."""
        peers = self.similar_teachers(teacher_id)
        adopters = self.completers.get(int(formation_id), set())
        return sum(1 for pid, _ in peers if pid in adopters)
