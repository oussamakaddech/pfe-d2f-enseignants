"""PilotageDashboardEngine — nouveau tableau de bord de pilotage (PFE).

Agrège 4 modules inédits pour le pilotage D2F, construits à partir des
nouveaux moteurs (forecast / benchmark / anomaly) et d'une corrélation
besoins ↔ gaps :

1. ``forecast_kpis``      — synthèse prévisionnelle (niveau projeté moyen,
   % d'objectifs de compétence atteignables à l'horizon, nb de compétences
   en régression).
2. ``benchmark_departements`` — classement des départements par écart moyen
   de niveau vs la cohorte globale (benchmark agrégé).
3. ``anomalies_live``     — compteur d'anomalies récentes + dernières alertes
   de type ANOMALIE ouvertes.
4. ``correlation_besoins_gaps`` — lien entre besoins exprimés non couverts et
   gaps de compétence (force de corrélation + top paires).

Tout est résilient (safe_kpi) : une source absente dégrade vers un défaut
neutre. Les seuils proviennent de ``settings``.
"""

from __future__ import annotations

import logging
from collections import defaultdict
from datetime import date, datetime, timedelta, timezone
from typing import Any

from sqlalchemy import func
from sqlalchemy.orm import Session

from app.config import settings
from app.core.observability import safe_kpi
from app.engines.anomaly_engine import ANOMALY_TYPE, AnomalyEngine
from app.engines.benchmark_engine import PeerBenchmarkEngine
from app.engines.forecast_engine import SkillForecastEngine
from app.models.db_models import AlertEvent, SkillGap, TeacherRiskProfile
from app.services.data_service import DataService

logger = logging.getLogger(__name__)

# Fenêtre de récence des anomalies (jours).
_ANOMALY_RECENT_DAYS = 30


class PilotageDashboardEngine:
    """Calcule les 4 modules du dashboard de pilotage."""

    def __init__(self, db: Session):
        self.db = db
        self._svc = DataService(db)

    def _safe(self, name: str, fn, default: Any) -> Any:
        return safe_kpi(name, fn, default, logger)

    # ── Module 1 : KPIs de prévision ─────────────────────────
    def forecast_kpis(self, horizon_mois: int | None = None) -> dict[str, Any]:
        """Synthèse prévisionnelle agrégée sur tous les enseignants suivis."""
        horizon = horizon_mois or settings.prediction_horizon_months
        # Enseignants ayant un profil de risque (≈ suivis).
        ens_rows = (
            self.db.query(TeacherRiskProfile.enseignant_id)
            .filter(TeacherRiskProfile.enseignant_id.isnot(None))
            .distinct()
            .limit(200)
            .all()
        )
        enseignants = [r[0] for r in ens_rows]
        if not enseignants:
            return {
                "horizon_mois": horizon,
                "nb_enseignants": 0,
                "niveau_projet_moyen": 0.0,
                "pct_objectifs_atteignables": 0.0,
                "nb_competences_regression": 0,
                "nb_competences_suivies": 0,
            }

        niveaux: list[float] = []
        nb_atteignables = 0
        nb_total = 0
        nb_regression = 0
        for eid in enseignants:
            try:
                fc = SkillForecastEngine(self.db).forecast(eid, horizon_mois=horizon)
            except Exception as exc:  # noqa: BLE001 — un enseignant ne doit pas bloquer
                logger.warning("forecast KPI échoué pour %s : %s", eid, exc)
                continue
            for c in fc.get("competences", []):
                nb_total += 1
                niveaux.append(c["niveau_prevu_final"])
                if c["comblera_objectif"]:
                    nb_atteignables += 1
                if c["en_regression"]:
                    nb_regression += 1

        moy = round(sum(niveaux) / len(niveaux), 3) if niveaux else 0.0
        pct = round(100.0 * nb_atteignables / nb_total, 1) if nb_total else 0.0
        return {
            "horizon_mois": horizon,
            "nb_enseignants": len(enseignants),
            "niveau_projet_moyen": moy,
            "pct_objectifs_atteignables": pct,
            "nb_competences_regression": nb_regression,
            "nb_competences_suivies": nb_total,
        }

    # ── Module 2 : Benchmark par département ─────────────────
    def benchmark_departements(self) -> list[dict[str, Any]]:
        """Classe les départements par écart moyen de niveau vs cohorte globale."""
        # Niveau moyen global de référence (tous enseignants).
        global_avg_row = (
            self.db.query(func.avg(TeacherRiskProfile.score_risque))
            .filter(TeacherRiskProfile.enseignant_id.isnot(None))
            .scalar()
        )
        # On utilise le niveau moyen de compétence via FeatureSnapshot agrégé.
        from app.models.db_models import FeatureSnapshot
        global_level = (
            self.db.query(func.avg(FeatureSnapshot.niveau_moyen_competences))
            .filter(FeatureSnapshot.niveau_moyen_competences.isnot(None))
            .scalar()
        )
        ref = float(global_level) if global_level is not None else 0.0

        # Niveau moyen par département (dept_id depuis enseignants).
        rows = self.db.execute(
            __import__("sqlalchemy").text(
                """
                SELECT e.dept_id AS dept,
                       AVG(fs.niveau_moyen_competences) AS moy,
                       COUNT(DISTINCT e.id) AS nb
                FROM enseignants e
                JOIN feature_snapshots fs ON fs.enseignant_id = e.id
                WHERE e.deleted_at IS NULL AND e.dept_id IS NOT NULL
                  AND fs.niveau_moyen_competences IS NOT NULL
                GROUP BY e.dept_id
                """
            )
        ).fetchall()

        result: list[dict[str, Any]] = []
        for r in rows:
            dept, moy, nb = r[0], float(r[1] or 0.0), int(r[2] or 0)
            ecart = round(moy - ref, 3)
            result.append({
                "departement_id": str(dept),
                "niveau_moyen": round(moy, 3),
                "ecart_vs_cohorte": ecart,
                "nb_enseignants": nb,
                "position": "AU_DESSUS" if ecart >= 0 else "EN_DECA",
            })
        result.sort(key=lambda x: x["ecart_vs_cohorte"], reverse=True)
        return result

    # ── Module 3 : Anomalies live ────────────────────────────
    def anomalies_live(self) -> dict[str, Any]:
        """Compteur d'anomalies récentes + dernières alertes ouvertes."""
        cutoff = datetime.now(timezone.utc) - timedelta(days=_ANOMALY_RECENT_DAYS)
        total = (
            self.db.query(func.count(AlertEvent.id))
            .filter(
                AlertEvent.type_alerte == ANOMALY_TYPE,
                AlertEvent.created_at >= cutoff,
            )
            .scalar()
        )
        nb = int(total or 0)
        recent = (
            self.db.query(AlertEvent)
            .filter(
                AlertEvent.type_alerte == ANOMALY_TYPE,
                AlertEvent.statut == "NOUVELLE",
            )
            .order_by(AlertEvent.created_at.desc())
            .limit(10)
            .all()
        )
        items = [
            {
                "id": a.id,
                "severite": a.severite,
                "titre": a.titre,
                "message": a.message,
                "enseignant_id": a.enseignant_id,
                "created_at": a.created_at.isoformat() if a.created_at else None,
            }
            for a in recent
        ]
        return {
            "nb_anomalies_recentes": nb,
            "fenetre_jours": _ANOMALY_RECENT_DAYS,
            "nb_nouvelles": len(items),
            "alertes": items,
        }

    # ── Module 4 : Corrélation besoins ↔ gaps ───────────────
    def correlation_besoins_gaps(self) -> dict[str, Any]:
        """Force de corrélation entre besoins exprimés et gaps de compétence.

        Calcule, par compétence, le nb de besoins exprimés et le nb de gaps,
        puis le coefficient de corrélation de Pearson entre les deux séries.
        Renvoie aussi le top des paires les plus corrélées.
        """
        # Besoins exprimés par compétence (via besoin_formation ↔ compétence).
        besoins = self.db.execute(
            __import__("sqlalchemy").text(
                """
                SELECT bf.competence_id AS cid, COUNT(*) AS nb
                FROM besoin_formation bf
                WHERE bf.competence_id IS NOT NULL
                  AND bf.deleted_at IS NULL
                GROUP BY bf.competence_id
                """
            )
        ).fetchall()
        gaps = (
            self.db.query(
                SkillGap.competence_id,
                func.count(SkillGap.id).label("nb"),
            )
            .group_by(SkillGap.competence_id)
            .all()
        )

        besoin_map = {int(r[0]): int(r[1]) for r in besoins}
        gap_map = {int(r[0]): int(r[1]) for r in gaps}
        cids = sorted(set(besoin_map) | set(gap_map))

        if len(cids) < 2:
            return {
                "coefficient_pearson": None,
                "nb_competences": len(cids),
                "top_paires": [],
                "interpretation": "Données insuffisantes pour une corrélation.",
            }

        xs = [float(besoin_map.get(c, 0)) for c in cids]
        ys = [float(gap_map.get(c, 0)) for c in cids]
        n = len(xs)
        mx = sum(xs) / n
        my = sum(ys) / n
        cov = sum((x - mx) * (y - my) for x, y in zip(xs, ys))
        vx = sum((x - mx) ** 2 for x in xs) or 1.0
        vy = sum((y - my) ** 2 for y in ys) or 1.0
        pearson = cov / (vx ** 0.5 * vy ** 0.5)
        pearson = max(-1.0, min(1.0, pearson))

        # Top paires (besoins élevés + gaps élevés).
        pairs = [
            {
                "competence_id": c,
                "nb_besoins": besoin_map.get(c, 0),
                "nb_gaps": gap_map.get(c, 0),
            }
            for c in cids
        ]
        pairs.sort(key=lambda p: p["nb_besoins"] + p["nb_gaps"], reverse=True)
        top = pairs[:10]

        if pearson >= 0.5:
            interp = "Corrélation forte : les besoins exprimés reflètent bien les gaps."
        elif pearson >= 0.2:
            interp = "Corrélation modérée entre besoins et gaps."
        elif pearson > -0.2:
            interp = "Corrélation faible : besoins et gaps peu liés."
        else:
            interp = "Corrélation négative : besoins et gaps semblent découplés."

        return {
            "coefficient_pearson": round(pearson, 3),
            "nb_competences": n,
            "top_paires": top,
            "interpretation": interp,
        }

    # ── Agrégat complet ─────────────────────────────────────
    def compute_all(self, horizon_mois: int | None = None) -> dict[str, Any]:
        return {
            "forecast_kpis": self._safe("pilotage_forecast", lambda: self.forecast_kpis(horizon_mois), {}),
            "benchmark_departements": self._safe("pilotage_benchmark", self.benchmark_departements, []),
            "anomalies_live": self._safe("pilotage_anomalies", self.anomalies_live, {}),
            "correlation_besoins_gaps": self._safe("pilotage_correlation", self.correlation_besoins_gaps, {}),
            "generated_at": date.today().isoformat(),
        }
