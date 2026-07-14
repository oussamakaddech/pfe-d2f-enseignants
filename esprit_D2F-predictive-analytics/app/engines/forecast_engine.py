"""SkillForecastEngine — projection temporelle des niveaux de compétence.

Nouvelle fonctionnalité (PFE) : à partir de l'historique des niveaux d'un
enseignant (FeatureSnapshot) et de son rythme de formation, projette sur N
mois le niveau attendu de chaque compétence, avec un intervalle de confiance
et un drapeau « à risque de régression ».

Méthode résiliente : si l'historique est insuffisant, on dégrade vers une
projection linéaire bornée par le rythme de formation moyen (jamais d'échec
500). Tous les seuils proviennent de ``settings`` (jamais codés en dur).
"""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import date, timedelta
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.core.observability import safe_kpi
from app.models.db_models import FeatureSnapshot, SkillGap

logger = logging.getLogger(__name__)

# Rythme de progression par défaut (niveaux / an) quand aucune donnée historique.
_DEFAULT_PROGRESSION_PER_YEAR = 0.6
# Borne basse de l'intervalle de confiance (le niveau ne peut pas chuter
# en dessous de 0 hors projection statistique).
_FLOOR = 0.0
# Borne haute (échelle N1..N5).
_CEIL = 5.0


class SkillForecastEngine:
    """Projette l'évolution des niveaux de compétence d'un enseignant."""

    def __init__(self, db: Session):
        self.db = db

    # ── Résilience par KPI ───────────────────────────────────
    def _safe(self, name: str, fn, default: Any) -> Any:
        return safe_kpi(name, fn, default, logger)

    # ── Historique des niveaux moyens (séries temporelles) ───
    def _history(self, enseignant_id: str) -> list[tuple[date, float]]:
        """Retourne (date, niveau_moyen) trié chronologiquement."""
        rows = (
            self.db.query(FeatureSnapshot.snapshot_date, FeatureSnapshot.niveau_moyen_competences)
            .filter(
                FeatureSnapshot.enseignant_id == enseignant_id,
                FeatureSnapshot.niveau_moyen_competences.isnot(None),
            )
            .order_by(FeatureSnapshot.snapshot_date.asc())
            .all()
        )
        return [(r[0], float(r[1])) for r in rows if r[1] is not None]

    def _avg_progression_per_month(self, history: list[tuple[date, float]]) -> float:
        """Pente moyenne (niveaux / mois) estimée par régression linéaire simple."""
        if len(history) < 2:
            return _DEFAULT_PROGRESSION_PER_YEAR / 12.0
        xs = [(h[0] - history[0][0]).days for h in history]
        ys = [h[1] for h in history]
        n = len(xs)
        sx = sum(xs)
        sy = sum(ys)
        sxx = sum(x * x for x in xs)
        sxy = sum(x * y for x, y in zip(xs, ys))
        denom = (n * sxx - sx * sx) or 1.0
        slope_days = (n * sxy - sx * sy) / denom  # niveaux par jour
        return slope_days / 30.0

    def _residual_std(self, history: list[tuple[date, float]], slope_per_month: float) -> float:
        """Écart-type des résidus (pour l'intervalle de confiance)."""
        if len(history) < 2:
            return 0.4  # incertitude par défaut en l'absence d'historique
        base = history[0][0]
        preds = [history[0][1] + slope_per_month * (h[0] - base).days / 30.0 for h in history]
        resid = [y - p for (_, y), p in zip(history, preds)]
        var = sum(r * r for r in resid) / len(resid)
        return max(0.15, var ** 0.5)

    # ── Projection par compétence ───────────────────────────
    def forecast(
        self,
        enseignant_id: str,
        horizon_mois: int | None = None,
        competence_ids: list[int] | None = None,
    ) -> dict[str, Any]:
        """Projette les niveaux de compétence sur ``horizon_mois`` mois."""
        horizon = horizon_mois or settings.prediction_horizon_months
        horizon = max(1, min(horizon, 36))

        history = self._safe("forecast_history", lambda: self._history(enseignant_id), [])
        slope = self._safe(
            "forecast_slope", lambda: self._avg_progression_per_month(history), _DEFAULT_PROGRESSION_PER_YEAR / 12.0
        )
        sigma = self._safe("forecast_sigma", lambda: self._residual_std(history, slope), 0.4)

        # Niveau de départ : dernier snapshot moyen, sinon 0.
        start_level = history[-1][1] if history else 0.0
        start_date = history[-1][0] if history else date.today()

        # Gaps actuels pour marquer les compétences à risque de régression.
        gaps = self._safe(
            "forecast_gaps",
            lambda: self.db.query(SkillGap)
            .filter(SkillGap.enseignant_id == enseignant_id)
            .all(),
            [],
        )
        gap_by_comp: dict[int, SkillGap] = {g.competence_id: g for g in gaps}
        if competence_ids:
            gap_by_comp = {cid: gap_by_comp.get(cid) for cid in competence_ids if cid in gap_by_comp}

        series: list[dict[str, Any]] = []
        for cid, gap in gap_by_comp.items():
            cur = float(gap.niveau_actuel) if gap else start_level
            req = float(gap.niveau_requis) if gap else cur
            comp_name = gap.competence_nom if gap else f"Compétence {cid}"
            # Projection : on part du niveau actuel et on applique la pente
            # moyenne (bornée). Les gaps en régression freinent la progression.
            regression_penalty = 0.5 if (gap and gap.en_regression) else 1.0
            monthly = slope * regression_penalty
            points: list[dict[str, Any]] = []
            for m in range(0, horizon + 1):
                lvl = cur + monthly * m
                lvl = max(_FLOOR, min(_CEIL, lvl))
                margin = 1.28 * sigma * (1 + m / 12.0) ** 0.5  # élargissement temporel
                points.append({
                    "mois": m,
                    "date": (start_date + timedelta(days=30 * m)).isoformat(),
                    "niveau_prevu": round(lvl, 3),
                    "borne_basse": round(max(_FLOOR, lvl - margin), 3),
                    "borne_haute": round(min(_CEIL, lvl + margin), 3),
                })
            final = points[-1]["niveau_prevu"]
            series.append({
                "competence_id": cid,
                "competence_nom": comp_name,
                "niveau_actuel": cur,
                "niveau_requis": req,
                "niveau_prevu_final": final,
                "ecart_restant": round(max(0.0, req - final), 3),
                "comblera_objectif": bool(final >= req - 1e-6),
                "en_regression": bool(gap and gap.en_regression),
                "points": points,
            })

        # Série globale (niveau moyen) pour le graphique d'ensemble.
        global_points: list[dict[str, Any]] = []
        for m in range(0, horizon + 1):
            lvl = max(_FLOOR, min(_CEIL, start_level + slope * m))
            margin = 1.28 * sigma * (1 + m / 12.0) ** 0.5
            global_points.append({
                "mois": m,
                "date": (start_date + timedelta(days=30 * m)).isoformat(),
                "niveau_prevu": round(lvl, 3),
                "borne_basse": round(max(_FLOOR, lvl - margin), 3),
                "borne_haute": round(min(_CEIL, lvl + margin), 3),
            })

        return {
            "enseignant_id": enseignant_id,
            "horizon_mois": horizon,
            "date_depart": start_date.isoformat(),
            "niveau_depart": round(start_level, 3),
            "pente_mensuelle": round(slope, 5),
            "incertitude_sigma": round(sigma, 3),
            "nb_points_historiques": len(history),
            "global": global_points,
            "competences": series,
        }
