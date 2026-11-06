"""Correctifs du moteur de risque (audit 2026-10-01).

1. Cible : le bruit de re-mesure (sigma 0.10) ne doit plus faire perdre un cran
   de severite a une competence dont l'ecart entier tombe sur un seuil.
2. Agregats par competence en MOYENNE (= serving), plus en mediane.
3. Generateur : option n_teachers.
4. Serving : quand la formule a ete mesuree meilleure que le ML, la raison du
   repli le dit (et n'annonce pas un « modele non deploye »).
"""
from __future__ import annotations

import json

import pandas as pd
import pytest

from app.infrastructure.ml import risk_features as rf
from app.infrastructure.ml.risk_predictor import RiskMLPredictor
from tests.unit.test_risk_features import _simulation_row
from tests.unit.test_risk_ml_serving import _make_artifact


def test_measurement_noise_does_not_flip_target_severity():
    # ecart futur reel = 3 (critique, score 0.75) ; bruit -0.03 -> 2.97.
    exact = rf.build_training_frame(pd.DataFrame([
        _simulation_row("e", "2026-01", 4.0, 1.0, 1.0, 3.0),
        _simulation_row("e", "2026-01", 5.0, 2.0, 2.0, 3.0),
    ]))
    noisy = rf.build_training_frame(pd.DataFrame([
        _simulation_row("e", "2026-01", 4.0, 1.0, 1.0, 2.97),
        _simulation_row("e", "2026-01", 5.0, 2.0, 2.0, 3.04),
    ]))
    assert exact.iloc[0]["risk_class"] == "CRITICAL"
    assert noisy.iloc[0]["risk_class"] == exact.iloc[0]["risk_class"]
    assert noisy.iloc[0]["risk_score_fut"] == pytest.approx(exact.iloc[0]["risk_score_fut"])


def test_competence_aggregates_use_mean_like_serving():
    rows = [_simulation_row("e", "2026-01", 4.0, 1.0, 1.0, 3.0) for _ in range(3)]
    for r, v in zip(rows, (0.0, 0.0, 0.9)):
        r["rolling_tendance"] = v
    frame = rf.build_training_frame(pd.DataFrame(rows))
    # mediane = 0.0 ; moyenne (convention du serving) = 0.3
    assert frame.iloc[0]["rolling_tendance"] == pytest.approx(0.3)


def test_generator_n_teachers_option(tmp_path):
    from pipelines.generate_simulation_dataset import REPORTS_DIR, generate_simulation_dataset

    report = REPORTS_DIR / "simulation_generation_report.json"
    backup = report.read_bytes() if report.exists() else None
    try:
        m = generate_simulation_dataset(
            seed=7, output_path=tmp_path / "s.csv", manifest_path=tmp_path / "m.json", n_teachers=3
        )
    finally:
        if backup is not None:
            report.write_bytes(backup)
    assert m["n_teachers"] == 3


def _write_meta(tmp_path, **extra):
    path = tmp_path / "risk_training_metadata.json"
    meta = json.loads(path.read_text(encoding="utf-8"))
    meta.update(extra)
    path.write_text(json.dumps(meta), encoding="utf-8")


def test_reason_says_formula_retained_when_it_beats_ml(tmp_path):
    _make_artifact(tmp_path, decision="reject")
    _write_meta(tmp_path, formula_validation={
        "macro_f1": 0.7222, "macro_f1_min": 0.7, "validated": True, "best_ml_beats_formula": False,
    })
    p = RiskMLPredictor(tmp_path)
    result, reason = p.predict({c: 0.0 for c in rf.RISK_FEATURES})
    assert result is None
    assert reason.startswith("formule ponderee retenue")
    assert "0.7222" in reason and "decision=reject" in reason
    status = p.status()
    assert status["risk_ml_active"] is False
    assert status["risk_formula_validated"] is True


def test_reason_unchanged_without_formula_validation(tmp_path):
    _make_artifact(tmp_path, decision="reject")
    _, reason = RiskMLPredictor(tmp_path).predict({c: 0.0 for c in rf.RISK_FEATURES})
    assert reason.startswith("modele de risque non deploye : decision=reject")
