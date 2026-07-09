"""InsightsEngine — KPIs avancés et données de graphiques riches pour le dashboard.

Complète `DashboardEngine` (les 10 KPIs existants) sans en modifier le contrat :
- `overview()`               — tuiles d'en-tête avec deltas vs snapshot précédent
- `demand_forecast(months)`  — série mensuelle de la demande + projection (EWMA + tendance)
- `supply_demand()`          — matrice offre/demande par compétence (quadrants)
- `risk_distribution()`      — histogramme du risque + répartition par niveau / département
- `heatmap_cell_drilldown()` — détail des enseignants d'une cellule de la heatmap

Toutes les méthodes sont résilientes : une source absente dégrade vers un défaut
neutre (`[]` / `{}`) plutôt que de faire échouer la requête (cf. `DashboardEngine._safe`).
"""

import logging
import math
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import Integer, func
from sqlalchemy.orm import Session

from app.engines.dashboard_engine import DashboardEngine
from app.models.db_models import (
    AlertEvent, DashboardSnapshot, SkillGap, TeacherCompetenceCoverage, TeacherRiskProfile,
)

logger = logging.getLogger(__name__)

# Fenêtre d'analyse "récente" partagée avec DashboardEngine (30 jours).
_RECENT_DAYS = 30
# Bornes des quadrants offre/demande.
_DEMAND_HIGH = 0.50
_SUPPLY_HIGH = 0.60


class InsightsEngine:
    """Calcule les indicateurs avancés alimentant les graphiques riches."""

    def __init__(self, db: Session):
        self.db = db
        self._dashboard = DashboardEngine(db)

    # ── Résilience par KPI ───────────────────────────────────
    def _safe(self, name: str, fn, default: Any) -> Any:
        try:
            return fn()
        except Exception as exc:  # noqa: BLE001 — résilience volontaire par KPI
            logger.warning("Insight '%s' indisponible : %s", name, exc)
            return default

    def _recent_cutoff(self) -> date:
        return date.today() - timedelta(days=_RECENT_DAYS)

    # ── Tuiles d'en-tête avec deltas ─────────────────────────
    def overview(self) -> dict[str, Any]:
        """KPIs de tête de tableau de bord avec variation vs le snapshot précédent."""
        current = {
            "nb_enseignants_suivis":  self._safe("nb_enseignants_suivis", self._nb_enseignants_suivis, 0),
            "score_risque_moyen":     self._safe("score_risque_moyen", self._score_risque_moyen, 0.0),
            "nb_gaps_critiques":      self._safe("nb_gaps_critiques", self._nb_gaps_critiques, 0),
            "nb_alertes_nouvelles":   self._safe("nb_alertes_nouvelles", self._nb_alertes_nouvelles, 0),
            "taux_couverture_global": self._safe("taux_couverture_global", self._taux_couverture_global, 0.0),
            "precision_modele":       self._safe("precision_modele", self._precision_modele, None),
        }

        previous = self._previous_overview_snapshot()
        deltas = self._compute_deltas(current, previous)

        # Tendance toujours disponible (sans historique) : moyenne des scores
        # précédents persistés dans teacher_risk_profiles.precedent_score_risque.
        score_precedent = self._safe("score_risque_moyen_precedent", self._score_risque_moyen_precedent, None)

        result = {
            **current,
            "deltas": deltas,
            "score_risque_moyen_precedent": score_precedent,
            "generated_at": datetime.now(timezone.utc).isoformat(),
        }
        self._persist_overview_snapshot(current)
        return result

    def _nb_enseignants_suivis(self) -> int:
        return int(self.db.query(func.count(TeacherRiskProfile.id)).scalar() or 0)

    def _score_risque_moyen(self) -> float:
        val = self.db.query(func.avg(TeacherRiskProfile.score_risque)).scalar()
        return round(float(val), 4) if val is not None else 0.0

    def _score_risque_moyen_precedent(self) -> float | None:
        val = (
            self.db.query(func.avg(TeacherRiskProfile.precedent_score_risque))
            .filter(TeacherRiskProfile.precedent_score_risque.isnot(None))
            .scalar()
        )
        return round(float(val), 4) if val is not None else None

    def _nb_gaps_critiques(self) -> int:
        return int(
            self.db.query(func.count(SkillGap.id))
            .filter(
                SkillGap.computed_at >= self._recent_cutoff(),
                SkillGap.niveau_urgence == "CRITIQUE",
            )
            .scalar() or 0
        )

    def _nb_alertes_nouvelles(self) -> int:
        return int(
            self.db.query(func.count(AlertEvent.id))
            .filter(AlertEvent.statut == "NOUVELLE")
            .scalar() or 0
        )

    def _taux_couverture_global(self) -> float:
        """% de couples (enseignant, compétence) au niveau requis.

        Calculé depuis ``teacher_competence_coverage`` (snapshot des niveaux réels),
        et NON depuis ``skill_gaps`` qui ne contient que les écarts — sinon la
        couverture serait structurellement ~0 %.
        """
        row = (
            self.db.query(
                func.count(TeacherCompetenceCoverage.id).label("total"),
                func.sum(
                    func.cast(TeacherCompetenceCoverage.covered, Integer)
                ).label("couverts"),
            )
            .first()
        )
        total = int(getattr(row, "total", 0) or 0)
        couverts = int(getattr(row, "couverts", 0) or 0)
        return round(couverts / total * 100, 1) if total else 0.0

    def _precision_modele(self) -> float | None:
        from app.services.model_trainer import read_current_accuracy
        acc = read_current_accuracy()
        return round(float(acc), 3) if acc is not None else None

    def _previous_overview_snapshot(self) -> dict[str, Any] | None:
        snap = (
            self.db.query(DashboardSnapshot)
            .filter(
                DashboardSnapshot.scope == "OVERVIEW",
                DashboardSnapshot.snapshot_date < date.today(),
            )
            .order_by(DashboardSnapshot.snapshot_date.desc())
            .first()
        )
        return snap.kpis_json if snap and snap.kpis_json else None

    @staticmethod
    def _compute_deltas(current: dict[str, Any], previous: dict[str, Any] | None) -> dict[str, Any]:
        if not previous:
            return {k: None for k in current}
        deltas: dict[str, Any] = {}
        for key, val in current.items():
            prev = previous.get(key)
            if isinstance(val, (int, float)) and isinstance(prev, (int, float)):
                deltas[key] = round(float(val) - float(prev), 4)
            else:
                deltas[key] = None
        return deltas

    def _persist_overview_snapshot(self, current: dict[str, Any]) -> None:
        """Persistance best-effort du snapshot du jour (pour le calcul des deltas)."""
        try:
            existing = (
                self.db.query(DashboardSnapshot)
                .filter_by(scope="OVERVIEW", scope_id=None, snapshot_date=date.today())
                .first()
            )
            if existing:
                existing.kpis_json = current
            else:
                self.db.add(DashboardSnapshot(
                    scope="OVERVIEW", scope_id=None,
                    snapshot_date=date.today(), kpis_json=current,
                ))
            self.db.flush()
        except Exception as exc:  # noqa: BLE001 — cache best-effort
            logger.warning("Persistance du snapshot overview échouée : %s", exc)

    # ── Prévision de la demande (série + projection) ─────────
    def demand_forecast(self, months: int = 6, history_months: int = 12) -> dict[str, Any]:
        """Série mensuelle des gaps détectés + projection sur `months` mois.

        Méthode : régression linéaire des moindres carrés sur l'historique,
        lissée par une moyenne mobile exponentielle (EWMA), avec une bande de
        confiance basée sur l'écart-type des résidus. Aucune dépendance externe.
        """
        history = self._safe("demand_history", lambda: self._demand_history(history_months), [])
        if len(history) < 2:
            return {
                "method": "ewma+linear",
                "history": history,
                "forecast": [],
                "note": "Historique insuffisant pour une projection fiable.",
            }

        values = [pt["value"] for pt in history]
        slope, intercept = _linear_fit(values)
        residual_std = _residual_std(values, slope, intercept)
        ewma_last = _ewma(values, alpha=0.5)

        forecast = []
        last_month = history[-1]["month"]
        n = len(values)
        for step in range(1, months + 1):
            trend = slope * (n - 1 + step) + intercept
            # Pondération : tendance + ancrage sur la dernière valeur lissée.
            projected = max(0.0, 0.6 * trend + 0.4 * ewma_last)
            band = round(1.96 * residual_std * math.sqrt(step), 2)
            forecast.append({
                "month": _add_months(last_month, step),
                "value": round(projected, 2),
                "lower": round(max(0.0, projected - band), 2),
                "upper": round(projected + band, 2),
            })

        return {
            "method": "ewma+linear",
            "slope_par_mois": round(slope, 3),
            "history": history,
            "forecast": forecast,
        }

    def _demand_history(self, history_months: int) -> list[dict[str, Any]]:
        cutoff = date.today() - timedelta(days=history_months * 31)
        month_expr = func.to_char(SkillGap.computed_at, "YYYY-MM")
        rows = (
            self.db.query(
                month_expr.label("mois"),
                func.count(SkillGap.id).label("nb"),
            )
            .filter(SkillGap.computed_at >= cutoff)
            .group_by(month_expr)
            .order_by(month_expr)
            .all()
        )
        return [{"month": r.mois, "value": int(r.nb or 0)} for r in rows]

    # ── Matrice offre / demande par compétence ───────────────
    def supply_demand(self) -> list[dict[str, Any]]:
        rows = (
            self.db.query(
                SkillGap.competence_id,
                SkillGap.competence_nom,
                SkillGap.domaine_nom,
                func.count(SkillGap.id).label("nb"),
                func.sum(
                    func.cast(SkillGap.niveau_actuel >= SkillGap.niveau_requis, Integer)
                ).label("couverts"),
                func.avg(SkillGap.gap_score).label("gap_moy"),
                func.avg(SkillGap.nb_besoins_exprimes).label("besoins_moy"),
                func.sum(
                    func.cast(SkillGap.niveau_urgence == "CRITIQUE", Integer)
                ).label("nb_critiques"),
            )
            .filter(SkillGap.computed_at >= self._recent_cutoff())
            .group_by(SkillGap.competence_id, SkillGap.competence_nom, SkillGap.domaine_nom)
            .all()
        )

        result = []
        for r in rows:
            nb = int(r.nb or 0)
            couverts = int(r.couverts or 0)
            supply_ratio = round(couverts / nb, 3) if nb else 0.0
            gap_moy = float(r.gap_moy or 0.0)
            besoins_moy = float(r.besoins_moy or 0.0)
            # Demande = écart moyen normalisé + pression des besoins exprimés.
            demand_score = round(min(1.0, gap_moy * 0.7 + min(besoins_moy / 5.0, 1.0) * 0.3), 3)
            result.append({
                "competence_id":   r.competence_id,
                "competence_nom":  r.competence_nom,
                "domaine_nom":     r.domaine_nom,
                "demand_score":    demand_score,
                "supply_ratio":    supply_ratio,
                "nb_enseignants":  nb,
                "nb_critiques":    int(r.nb_critiques or 0),
                "quadrant":        _quadrant(demand_score, supply_ratio),
            })
        result.sort(key=lambda x: (x["demand_score"], -x["supply_ratio"]), reverse=True)
        return result

    # ── Distribution du risque ───────────────────────────────
    def risk_distribution(self) -> dict[str, Any]:
        rows = (
            self.db.query(
                TeacherRiskProfile.enseignant_id,
                TeacherRiskProfile.score_risque,
                TeacherRiskProfile.niveau_risque,
            )
            .all()
        )

        # Histogramme par tranche de 0.2 sur [0, 1].
        buckets = [
            {"range": "0.0-0.2", "min": 0.0, "max": 0.2, "count": 0},
            {"range": "0.2-0.4", "min": 0.2, "max": 0.4, "count": 0},
            {"range": "0.4-0.6", "min": 0.4, "max": 0.6, "count": 0},
            {"range": "0.6-0.8", "min": 0.6, "max": 0.8, "count": 0},
            {"range": "0.8-1.0", "min": 0.8, "max": 1.01, "count": 0},
        ]
        by_level: dict[str, int] = defaultdict(int)
        ens_dept_map = self._dashboard._ens_dept_map()
        by_dept: dict[str, dict[str, float]] = {}

        for r in rows:
            score = float(r.score_risque or 0.0)
            for b in buckets:
                if b["min"] <= score < b["max"]:
                    b["count"] += 1
                    break
            by_level[r.niveau_risque or "FAIBLE"] += 1
            dept = ens_dept_map.get(str(r.enseignant_id), "non_affecte")
            agg = by_dept.setdefault(dept, {"_sum": 0.0, "_n": 0})
            agg["_sum"] += score
            agg["_n"] += 1

        dept_rows = [
            {
                "departement": dept,
                "score_risque_moyen": round(agg["_sum"] / agg["_n"], 4) if agg["_n"] else 0.0,
                "nb_enseignants": int(agg["_n"]),
            }
            for dept, agg in by_dept.items()
        ]
        dept_rows.sort(key=lambda x: x["score_risque_moyen"], reverse=True)

        return {
            "histogram": [{"range": b["range"], "count": b["count"]} for b in buckets],
            "by_level": dict(by_level),
            "by_department": dept_rows,
            "total": len(rows),
        }

    # ── Drill-down d'une cellule de heatmap ──────────────────
    def heatmap_cell_drilldown(self, departement: str, competence_id: int) -> dict[str, Any]:
        gap_rows = (
            self.db.query(SkillGap)
            .filter(
                SkillGap.competence_id == competence_id,
                SkillGap.computed_at >= self._recent_cutoff(),
            )
            .all()
        )
        ens_dept_map = self._dashboard._ens_dept_map()

        # Index des profils de risque pour enrichir chaque enseignant de la cellule.
        risk_rows = self.db.query(TeacherRiskProfile).all()
        risk_index = {str(r.enseignant_id): r for r in risk_rows}

        teachers = []
        for g in gap_rows:
            if ens_dept_map.get(str(g.enseignant_id), "non_affecte") != departement:
                continue
            risk = risk_index.get(str(g.enseignant_id))
            teachers.append({
                "enseignant_id":  g.enseignant_id,
                "niveau_actuel":  g.niveau_actuel,
                "niveau_requis":  g.niveau_requis,
                "gap_score":      float(g.gap_score or 0.0),
                "niveau_urgence": g.niveau_urgence,
                "mois_stagnation": g.mois_stagnation,
                "score_risque":   float(risk.score_risque) if risk else None,
                "niveau_risque":  risk.niveau_risque if risk else None,
            })
        teachers.sort(key=lambda t: t["gap_score"], reverse=True)

        competence_nom = gap_rows[0].competence_nom if gap_rows else None
        avg_gap = round(sum(t["gap_score"] for t in teachers) / len(teachers), 3) if teachers else 0.0
        return {
            "departement":     departement,
            "competence_id":   competence_id,
            "competence_nom":  competence_nom,
            "nb_enseignants":  len(teachers),
            "avg_gap":         avg_gap,
            "enseignants":     teachers,
        }


# ── Helpers numériques (sans dépendance externe) ─────────────

def _linear_fit(values: list[float]) -> tuple[float, float]:
    """Régression linéaire des moindres carrés y = slope*x + intercept (x = index)."""
    n = len(values)
    xs = list(range(n))
    mean_x = sum(xs) / n
    mean_y = sum(values) / n
    denom = sum((x - mean_x) ** 2 for x in xs)
    if denom == 0:
        return 0.0, mean_y
    slope = sum((x - mean_x) * (y - mean_y) for x, y in zip(xs, values)) / denom
    intercept = mean_y - slope * mean_x
    return slope, intercept


def _residual_std(values: list[float], slope: float, intercept: float) -> float:
    n = len(values)
    if n < 2:
        return 0.0
    residuals = [y - (slope * x + intercept) for x, y in enumerate(values)]
    var = sum(r ** 2 for r in residuals) / max(n - 1, 1)
    return math.sqrt(var)


def _ewma(values: list[float], alpha: float = 0.5) -> float:
    """Dernière valeur d'une moyenne mobile exponentielle."""
    acc = values[0]
    for v in values[1:]:
        acc = alpha * v + (1 - alpha) * acc
    return acc


def _add_months(month_str: str, step: int) -> str:
    """Ajoute `step` mois à un libellé 'YYYY-MM'."""
    try:
        year, month = (int(p) for p in month_str.split("-"))
    except (ValueError, AttributeError):
        return f"+{step}"
    idx = (year * 12 + (month - 1)) + step
    return f"{idx // 12:04d}-{idx % 12 + 1:02d}"


def _quadrant(demand: float, supply: float) -> str:
    """Quadrant offre/demande : priorité d'action stratégique."""
    if demand >= _DEMAND_HIGH and supply < _SUPPLY_HIGH:
        return "INVESTIR"        # forte demande, faible couverture
    if demand >= _DEMAND_HIGH and supply >= _SUPPLY_HIGH:
        return "MAINTENIR"       # forte demande, bien couverte
    if demand < _DEMAND_HIGH and supply >= _SUPPLY_HIGH:
        return "SURPLUS"         # faible demande, sur-couverte
    return "SURVEILLER"          # faible demande, faible couverture
