"""PeerBenchmarkEngine — comparaison du profil d'un enseignant vs ses pairs.

Nouvelle fonctionnalité (PFE) : positionne un enseignant par rapport aux pairs
du même département (et optionnellement de la même UP) sur :
- niveau moyen de compétence (percentile + radar par domaine)
- taux de complétion de formations
- score de risque
- nb de gaps critiques

Toutes les agrégations sont calculées côté SQL (paramétré) ; le périmètre est
limité au département de l'enseignant (BOLA : un CUP ne voit que son département).
"""

from __future__ import annotations

import logging
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.observability import safe_kpi
from app.models.db_models import FeatureSnapshot, SkillGap, TeacherRiskProfile
from app.services.data_service import DataService

logger = logging.getLogger(__name__)


class PeerBenchmarkEngine:
    """Compare un enseignant à la cohorte de ses pairs."""

    def __init__(self, db: Session):
        self.db = db
        self._svc = DataService(db)

    def _safe(self, name: str, fn, default: Any) -> Any:
        return safe_kpi(name, fn, default, logger)

    def _peer_scope(self, enseignant_id: str) -> tuple[str | None, str | None, list[str]]:
        """Retourne (departement_id, up_id, liste des enseignant_id pairs)."""
        profil = self._svc.get_teacher_profile(enseignant_id)
        if not profil:
            return None, None, []
        p = profil[0]
        dept = p.get("departement_id")
        up = p.get("up_id")
        if dept is None:
            return None, None, []
        rows = self.db.execute(
            __import__("sqlalchemy").text(
                "SELECT id FROM enseignants WHERE dept_id = :d AND deleted_at IS NULL"
            ),
            {"d": dept},
        ).fetchall()
        peers = [str(r[0]) for r in rows if str(r[0]) != enseignant_id]
        return str(dept), (str(up) if up is not None else None), peers

    # ── Agrégations SQL (paramétrées) ──────────────────────
    def _avg_competence_levels(self, ids: list[str]) -> list[float]:
        """Niveau moyen de compétence le plus récent par enseignant."""
        if not ids:
            return []
        subq = (
            self.db.query(func.max(FeatureSnapshot.id).label("max_id"))
            .filter(FeatureSnapshot.enseignant_id.in_(ids))
            .group_by(FeatureSnapshot.enseignant_id)
            .subquery()
        )
        vals = (
            self.db.query(FeatureSnapshot.niveau_moyen_competences)
            .join(subq, FeatureSnapshot.id == subq.c.max_id)
            .all()
        )
        return [float(v[0]) for v in vals if v[0] is not None]

    def _completion_rates(self, ids: list[str]) -> list[float]:
        if not ids:
            return []
        rows = (
            self.db.query(TeacherRiskProfile.taux_completion_formations)
            .filter(TeacherRiskProfile.enseignant_id.in_(ids))
            .all()
        )
        return [float(r[0]) for r in rows if r[0] is not None]

    def _risk_scores(self, ids: list[str]) -> list[float]:
        if not ids:
            return []
        rows = (
            self.db.query(TeacherRiskProfile.score_risque)
            .filter(TeacherRiskProfile.enseignant_id.in_(ids))
            .all()
        )
        return [float(r[0]) for r in rows if r[0] is not None]

    def _crit_gaps(self, ids: list[str]) -> list[int]:
        if not ids:
            return []
        rows = (
            self.db.query(SkillGap.enseignant_id, func.count(SkillGap.id))
            .filter(
                SkillGap.enseignant_id.in_(ids),
                SkillGap.niveau_urgence == "CRITIQUE",
            )
            .group_by(SkillGap.enseignant_id)
            .all()
        )
        return [int(r[1]) for r in rows]

    def _percentile(self, value: float, values: list[float]) -> float:
        """Percentile (0-100) de ``value`` dans ``values`` (tri croissant)."""
        if not values:
            return 50.0
        below = sum(1 for v in values if v < value)
        return round(100.0 * below / len(values), 1)

    def benchmark(
        self,
        enseignant_id: str,
        par_up: bool = False,
    ) -> dict[str, Any]:
        """Calcule le benchmark de l'enseignant vs ses pairs."""
        dept, up, peers = self._safe(
            "benchmark_scope", lambda: self._peer_scope(enseignant_id), (None, None, [])
        )
        if dept is None:
            return {
                "enseignant_id": enseignant_id,
                "disponible": False,
                "raison": "Profil ou département introuvable.",
                "pairs": 0,
            }
        if not peers:
            return {
                "enseignant_id": enseignant_id,
                "disponible": False,
                "raison": "Aucun pair dans le département.",
                "pairs": 0,
            }

        # Restreindre aux pairs de la même UP si demandé.
        if par_up and up is not None:
            profils_up = self._svc.get_teacher_profile()  # tous, filtrés ensuite
            up_set = {
                str(p["enseignant_id"])
                for p in profils_up
                if str(p.get("up_id")) == up
            }
            peers = [pid for pid in peers if pid in up_set]

        # ── Niveaux moyens (self vs pairs) ──────────────────
        self_levels = self._safe(
            "benchmark_self_levels",
            lambda: self._avg_competence_levels([enseignant_id]),
            [],
        )
        peer_levels = self._safe(
            "benchmark_peer_levels", lambda: self._avg_competence_levels(peers), []
        )
        self_avg = self_levels[0] if self_levels else 0.0
        peer_avg = (sum(peer_levels) / len(peer_levels)) if peer_levels else 0.0

        # ── Taux de complétion (self vs pairs) ─────────────
        self_comp = self._safe(
            "benchmark_self_comp",
            lambda: self._completion_rates([enseignant_id]),
            [0.0],
        )
        peer_comp = self._safe("benchmark_peer_comp", lambda: self._completion_rates(peers), [])
        self_comp_rate = self_comp[0] if self_comp else 0.0
        peer_comp_rate = (sum(peer_comp) / len(peer_comp)) if peer_comp else 0.0

        # ── Score de risque (self vs pairs) ────────────────
        self_risk = self._safe("benchmark_self_risk", lambda: self._risk_scores([enseignant_id]), [0.0])
        peer_risk = self._safe("benchmark_peer_risk", lambda: self._risk_scores(peers), [])
        self_risk_score = self_risk[0] if self_risk else 0.0
        peer_risk_score = (sum(peer_risk) / len(peer_risk)) if peer_risk else 0.0

        # ── Gaps critiques (self vs pairs) ─────────────────
        self_crit = self._safe("benchmark_self_crit", lambda: self._crit_gaps([enseignant_id]), [0])
        peer_crit = self._safe("benchmark_peer_crit", lambda: self._crit_gaps(peers), [])
        self_crit_nb = self_crit[0] if self_crit else 0
        peer_crit_avg = (sum(peer_crit) / len(peer_crit)) if peer_crit else 0.0

        return {
            "enseignant_id": enseignant_id,
            "disponible": True,
            "scope": "UP" if (par_up and up is not None) else "DEPARTEMENT",
            "departement_id": dept,
            "up_id": up,
            "pairs": len(peers),
            "niveau_moyen": {
                "self": round(self_avg, 3),
                "pairs_moyen": round(peer_avg, 3),
                "percentile": self._percentile(self_avg, peer_levels + [self_avg]),
            },
            "taux_completion": {
                "self": round(self_comp_rate, 2),
                "pairs_moyen": round(peer_comp_rate, 2),
                "percentile": self._percentile(self_comp_rate, peer_comp + [self_comp_rate]),
            },
            "score_risque": {
                "self": round(self_risk_score, 4),
                "pairs_moyen": round(peer_risk_score, 4),
                # Risque : percentile inversé (plus de risque = mauvais).
                "percentile": round(
                    100.0 - self._percentile(self_risk_score, peer_risk + [self_risk_score]), 1
                ),
            },
            "gaps_critiques": {
                "self": self_crit_nb,
                "pairs_moyen": round(peer_crit_avg, 2),
                "percentile": self._percentile(float(self_crit_nb), [float(c) for c in peer_crit] + [float(self_crit_nb)]),
            },
        }
