"""Moteur d'impact des formations — deux fonctionnalités métier :

1. **Suivi d'impact historique** (``TrainingImpactEngine``) : agrège l'effet réel
   des formations suivies à partir des ``training_path_items`` (gain de niveau
   avant/après) et des ``teacher_risk_profiles`` (réduction du risque entre
   l'état précédent et l'état courant). Complète ``dashboard/training-effectiveness``
   avec des agrégats paginés et typés.

2. **Simulation what-if** (``WhatIfEngine``) : à partir d'un plan de formations
   projeté (compétence cible + niveau visé), recalcule le score de risque et les
   gaps *comme si* les formations avaient été suivies. Réutilise exactement la
   chaîne de scoring existante (``build_factors_from_gaps`` + ``compute_risk_score``)
   pour rester cohérent avec le profil de risque réel.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Any

from app.config import settings
from app.engines.risk_scoring import build_factors_from_gaps, compute_risk_score
from app.models.db_models import (
    FeatureSnapshot,
    TeacherRiskProfile,
    TrainingPath,
    TrainingPathItem,
)


def _urgence_from_gap(gap: float) -> str:
    """Mappe un écart brut vers le niveau d'urgence utilisé en base."""
    if gap >= 3:
        return "CRITIQUE"
    if gap >= 2:
        return "HAUTE"
    if gap >= 1:
        return "MODEREE"
    return "FAIBLE"


@dataclass
class _GapView:
    """Vue légère d'un gap pour l'alimenter de façon synchrone au scoring."""

    niveau_urgence: str = "FAIBLE"
    mois_stagnation: int = 0
    en_regression: bool = False


class TrainingImpactEngine:
    """Agrégation de l'impact réel des formations suivies."""

    def __init__(self, db):
        self.db = db

    def _level_gain_rows(self) -> list[TrainingPathItem]:
        return (
            self.db.query(TrainingPathItem)
            .filter(TrainingPathItem.deja_suivie.is_(True))
            .all()
        )

    def _compute_formation_impact(
        self, page: int, size: int
    ) -> tuple[int, list[dict[str, Any]]]:
        items = self._level_gain_rows()
        by_formation: dict[int, dict[str, Any]] = {}
        for it in items:
            f = by_formation.setdefault(
                it.formation_id,
                {
                    "formation_id": it.formation_id,
                    "formation_titre": it.formation_titre,
                    "formation_type": it.formation_type,
                    "nb_enseignants": 0,
                    "somme_gain_niveau": 0.0,
                    "somme_apres": 0,
                    "somme_avant": 0,
                },
            )
            gain = float(it.niveau_apres - it.niveau_avant)
            f["nb_enseignants"] += 1
            f["somme_gain_niveau"] += gain
            f["somme_apres"] += int(it.niveau_apres)
            f["somme_avant"] += int(it.niveau_avant)

        rows = []
        for f in by_formation.values():
            n = f["nb_enseignants"]
            rows.append(
                {
                    "formation_id": f["formation_id"],
                    "formation_titre": f["formation_titre"],
                    "formation_type": f["formation_type"],
                    "nb_enseignants": n,
                    "gain_niveau_moyen": round(f["somme_gain_niveau"] / n, 3),
                    "niveau_moyen_avant": round(f["somme_avant"] / n, 2),
                    "niveau_moyen_apres": round(f["somme_apres"] / n, 2),
                }
            )
        rows.sort(key=lambda r: r["gain_niveau_moyen"], reverse=True)
        total = len(rows)
        start = page * size
        return total, rows[start : start + size]

    def compute_global_impact(self) -> dict[str, Any]:
        items = self._level_gain_rows()
        total_gain = sum(float(it.niveau_apres - it.niveau_avant) for it in items)
        nb_items = len(items)
        nb_chemins = (
            self.db.query(TrainingPath)
            .filter(TrainingPath.statut == "TERMINE")
            .count()
        )

        profiles = (
            self.db.query(TeacherRiskProfile)
            .filter(TeacherRiskProfile.precedent_score_risque.isnot(None))
            .all()
        )
        reductions = [
            float(p.score_risque - p.precedent_score_risque)
            for p in profiles
            if p.precedent_score_risque is not None
        ]
        reduction_moyenne = (
            round(sum(reductions) / len(reductions), 4) if reductions else 0.0
        )
        nb_en_hausse = sum(1 for r in reductions if r < 0)  # risque diminué
        nb_en_baisse = sum(1 for r in reductions if r > 0)  # risque augmenté

        return {
            "nb_enseignants_suivis": (
                self.db.query(TeacherRiskProfile).count()
            ),
            "nb_chemins_termines": nb_chemins,
            "nb_formations_suivies": nb_items,
            "gain_niveau_moyen": round(total_gain / nb_items, 3) if nb_items else 0.0,
            "reduction_risque_moyenne": reduction_moyenne,
            "nb_risque_reduit": nb_en_hausse,
            "nb_risque_augmente": nb_en_baisse,
        }

    def top_formations_by_impact(self, page: int = 0, size: int = 20) -> dict[str, Any]:
        total, rows = self._compute_formation_impact(page, size)
        return {"total": total, "page": page, "size": size, "formations": rows}


class WhatIfEngine:
    """Simulation « et si on formait X » à partir du profil de risque courant."""

    def __init__(self, db):
        self.db = db

    def _load_gaps(self, enseignant_id: str) -> list[Any]:
        from app.models.db_models import SkillGap

        return (
            self.db.query(SkillGap)
            .filter(SkillGap.enseignant_id == enseignant_id)
            .all()
        )

    def _taux_completion(self, enseignant_id: str) -> float:
        snap = (
            self.db.query(FeatureSnapshot)
            .filter(FeatureSnapshot.enseignant_id == enseignant_id)
            .order_by(FeatureSnapshot.snapshot_date.desc())
            .first()
        )
        if snap and snap.taux_completion_formations is not None:
            return float(snap.taux_completion_formations)
        return 0.0

    def _risk_from_gaps(
        self, gaps: list[_GapView], taux_completion: float
    ) -> dict[str, Any]:
        factors = build_factors_from_gaps(gaps, taux_completion=taux_completion)
        return compute_risk_score(factors)

    def simulate(
        self,
        enseignant_id: str,
        plan: list[dict[str, Any]],
        horizon_mois: int = 6,
    ) -> dict[str, Any]:
        """Projette l'impact d'un plan de formations.

        ``plan`` = liste de ``{"competence_id": int, "niveau_vise": int,
        "formation_id": int (optionnel)}``.
        """
        gaps = self._load_gaps(enseignant_id)
        taux_completion = self._taux_completion(enseignant_id)

        before = self._risk_from_gaps(
            [_GapView(
                niveau_urgence=g.niveau_urgence,
                mois_stagnation=g.mois_stagnation,
                en_regression=g.en_regression,
            ) for g in gaps],
            taux_completion,
        )

        # Index des gaps par compétence pour appliquer le plan.
        gaps_by_comp: dict[int, Any] = {int(g.competence_id): g for g in gaps}
        details: list[dict[str, Any]] = []
        gaps_after: list[_GapView] = []

        for g in gaps:
            view = _GapView(
                niveau_urgence=g.niveau_urgence,
                mois_stagnation=g.mois_stagnation,
                en_regression=g.en_regression,
            )
            gaps_after.append(view)

        for action in plan:
            cid = int(action.get("competence_id"))
            niveau_vise = int(action.get("niveau_vise", 3))
            niveau_requis = int(gaps_by_comp[cid].niveau_requis) if cid in gaps_by_comp else niveau_vise
            niveau_actuel = int(gaps_by_comp[cid].niveau_actuel) if cid in gaps_by_comp else 0
            gap_avant = max(0, niveau_requis - niveau_actuel)
            gap_apres = max(0, niveau_requis - niveau_vise)
            urgence_apres = _urgence_from_gap(gap_apres)

            # Mettre à jour la vue du gap correspondant.
            if cid in gaps_by_comp:
                idx = gaps.index(gaps_by_comp[cid])
                gaps_after[idx] = _GapView(
                    niveau_urgence=urgence_apres,
                    mois_stagnation=0,  # formation suivie => stagnation résolue
                    en_regression=False,
                )
            details.append({
                "competence_id": cid,
                "formation_id": action.get("formation_id"),
                "niveau_actuel": niveau_actuel,
                "niveau_requis": niveau_requis,
                "niveau_vise": niveau_vise,
                "gap_avant": gap_avant,
                "gap_apres": gap_apres,
                "urgence_apres": urgence_apres,
                "resolu": gap_apres == 0 and gap_avant > 0,
            })

        after = self._risk_from_gaps(gaps_after, taux_completion)

        affected = {int(a.get("competence_id")) for a in plan}
        nb_gaps_before = len(gaps)
        nb_gaps_after = sum(
            1 for g in gaps if int(g.competence_id) not in affected
        ) + sum(1 for d in details if d["gap_apres"] > 0)
        nb_resolus = sum(1 for d in details if d["resolu"])

        return {
            "enseignant_id": enseignant_id,
            "horizon_mois": horizon_mois,
            "risk_before": {
                "score": before["score_risque"],
                "niveau": before["niveau_risque"],
            },
            "risk_after": {
                "score": after["score_risque"],
                "niveau": after["niveau_risque"],
            },
            "risk_reduction": round(before["score_risque"] - after["score_risque"], 4),
            "nb_gaps_before": nb_gaps_before,
            "nb_gaps_after": nb_gaps_after,
            "nb_gaps_resolus": nb_resolus,
            "details": details,
        }
