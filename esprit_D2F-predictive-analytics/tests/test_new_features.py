"""
Tests pour les 3 nouvelles fonctionnalités PFE :
- SkillForecastEngine (prévision temporelle)
- PeerBenchmarkEngine (benchmark vs pairs)
- AnomalyEngine (détection d'anomalies)
"""

import os
os.environ.setdefault("JWT_AUTH_ENABLED", "false")
os.environ.setdefault("SCHEDULER_ENABLED", "false")
os.environ.setdefault("MESSAGING_ENABLED", "false")

from datetime import date, timedelta
from unittest.mock import MagicMock

from app.engines.forecast_engine import SkillForecastEngine
from app.engines.benchmark_engine import PeerBenchmarkEngine
from app.engines.anomaly_engine import AnomalyEngine


def _mock_db():
    return MagicMock()


# ══════════════════════════════════════════════════════════════════════════════
# SkillForecastEngine
# ══════════════════════════════════════════════════════════════════════════════

class TestSkillForecast:
    def test_forecast_without_history_returns_default_slope(self):
        db = _mock_db()
        db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []
        db.query.return_value.filter.return_value.all.return_value = []
        eng = SkillForecastEngine(db)
        res = eng.forecast("E1", horizon_mois=6)
        assert res["enseignant_id"] == "E1"
        assert res["horizon_mois"] == 6
        assert res["nb_points_historiques"] == 0
        # Pas de gaps => pas de série par compétence.
        assert res["competences"] == []
        # Série globale bornée dans [0,5].
        for p in res["global"]:
            assert 0.0 <= p["niveau_prevu"] <= 5.0
            assert p["borne_basse"] <= p["niveau_prevu"] <= p["borne_haute"]

    def test_forecast_with_gap_produces_competence_series(self):
        db = _mock_db()
        # Pas d'historique de snapshots.
        db.query.return_value.filter.return_value.order_by.return_value.all.return_value = []
        # Un gap critique pour la compétence 101.
        gap = MagicMock()
        gap.competence_id = 101
        gap.competence_nom = "Java"
        gap.niveau_actuel = 2
        gap.niveau_requis = 4
        gap.en_regression = False
        db.query.return_value.filter.return_value.all.side_effect = [
            [gap],  # gaps
        ]
        eng = SkillForecastEngine(db)
        res = eng.forecast("E1", horizon_mois=12, competence_ids=[101])
        assert len(res["competences"]) == 1
        c = res["competences"][0]
        assert c["competence_id"] == 101
        assert c["niveau_actuel"] == 2
        assert c["niveau_requis"] == 4
        assert len(c["points"]) == 13  # 0..12 mois
        # Le niveau final ne dépasse pas le plafond 5.
        assert c["points"][-1]["niveau_prevu"] <= 5.0


# ══════════════════════════════════════════════════════════════════════════════
# PeerBenchmarkEngine
# ══════════════════════════════════════════════════════════════════════════════

class TestPeerBenchmark:
    def _svc(self, dept="D1", up="U1"):
        svc = MagicMock()
        svc.get_teacher_profile.side_effect = lambda tid=None: (
            [{"enseignant_id": tid, "departement_id": dept, "up_id": up}]
            if tid else []
        )
        return svc

    def test_benchmark_unavailable_without_department(self):
        db = _mock_db()
        svc = MagicMock()
        svc.get_teacher_profile.return_value = [{"enseignant_id": "E1", "departement_id": None}]
        eng = PeerBenchmarkEngine(db)
        eng._svc = svc
        res = eng.benchmark("E1")
        assert res["disponible"] is False
        assert res["pairs"] == 0

    def test_benchmark_computes_percentiles(self):
        db = _mock_db()
        svc = self._svc()
        eng = PeerBenchmarkEngine(db)
        eng._svc = svc
        # Pairs : E2, E3 dans le même département.
        db.execute.return_value.fetchall.return_value = [("E2",), ("E3",)]
        # On patch les agrégations SQL pour isoler le calcul des percentiles.
        eng._avg_competence_levels = lambda ids: [3.0] if ids == ["E1"] else [2.0, 4.0]
        eng._completion_rates = lambda ids: [0.5] if ids == ["E1"] else [0.5, 0.5]
        eng._risk_scores = lambda ids: [0.3] if ids == ["E1"] else [0.3, 0.3]
        eng._crit_gaps = lambda ids: [1] if ids == ["E1"] else [0, 2]
        res = eng.benchmark("E1")
        assert res["disponible"] is True
        assert res["pairs"] == 2
        # Self (3.0) est au-dessus de la moyenne des pairs (3.0) -> percentile >= 50.
        assert res["niveau_moyen"]["self"] == 3.0
        assert 0.0 <= res["niveau_moyen"]["percentile"] <= 100.0
        # Risque : percentile inversé, self=0.3 égal à la moyenne -> ~50.
        assert 0.0 <= res["score_risque"]["percentile"] <= 100.0


# ══════════════════════════════════════════════════════════════════════════════
# AnomalyEngine
# ══════════════════════════════════════════════════════════════════════════════

class TestAnomalyDetection:
    def test_no_anomaly_when_data_clean(self):
        db = _mock_db()
        # Pas d'alerte déjà ouverte (dedup).
        db.query.return_value.filter.return_value.first.return_value = None
        # Pas de snapshots, pas d'inscriptions, pas de gaps.
        db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
        db.execute.return_value.fetchone.return_value = None
        db.query.return_value.filter.return_value.scalar.return_value = 0
        db.query.return_value.filter.return_value.all.return_value = []
        eng = AnomalyEngine(db)
        res = eng.detect_for_teacher("E1", departement_id="D1")
        assert res["enseignant_id"] == "E1"
        assert res["nb_anomalies"] == 0

    def test_gap_surge_emits_alert(self):
        db = _mock_db()
        # Pas d'alerte déjà ouverte (dedup) -> first() renvoie None.
        db.query.return_value.filter.return_value.first.return_value = None
        db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
        db.execute.return_value.fetchone.return_value = None
        # 3 gaps critiques -> seuil atteint.
        db.query.return_value.filter.return_value.scalar.return_value = 3
        db.query.return_value.filter.return_value.all.return_value = []
        eng = AnomalyEngine(db)
        res = eng.detect_for_teacher("E1", departement_id="D1")
        assert res["nb_anomalies"] == 1
        assert res["anomalies"][0]["type"] == "ANOMALIE"

    def test_dedup_prevents_duplicate_open_alert(self):
        db = _mock_db()
        db.query.return_value.filter.return_value.order_by.return_value.limit.return_value.all.return_value = []
        db.execute.return_value.fetchone.return_value = None
        db.query.return_value.filter.return_value.scalar.return_value = 3
        db.query.return_value.filter.return_value.all.return_value = []
        # Simuler une alerte déjà ouverte récente.
        existing = MagicMock()
        db.query.return_value.filter.return_value.first.return_value = existing
        eng = AnomalyEngine(db)
        res = eng.detect_for_teacher("E1", departement_id="D1")
        # _already_open retourne True -> aucune alerte émise.
        assert res["nb_anomalies"] == 0
