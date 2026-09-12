"""Tests ciblÃ©s â€” ComputeRisk.execute_serving (branches ML) et execute_legacy.

Couvre : serving ML avec rÃ©fÃ©rence heuristique (et Ã©chec de rÃ©fÃ©rence), repli
rÃ¨gles sur les gaps, repli heuristique comportementale, execute_legacy
(moteur ml / rules), _stagnation_months (None / date invalide).
"""
from __future__ import annotations

import pytest

from app.application.use_cases.compute_risk import ComputeRisk, STAGNATION_LOOKBACK_MONTHS
from app.domain.entities.risk_profile import RiskProfile
from app.domain.value_objects.enums import RiskLevel
from tests.fakes import (
    FakeAnalysisRepository,
    FakeBesoinSource,
    FakeCompetencySource,
    FakeEvaluationSource,
    FakeFormationSource,
    FakeModelPort,
)

from app.core.config import get_settings


def _profile(teacher_id: str = "ens-001") -> RiskProfile:
    return RiskProfile(
        teacher_id=teacher_id,
        risk_score=42.0,
        risk_level=RiskLevel.MEDIUM,
        factors=(),
    )


class MlServingModelPort(FakeModelPort):
    """Port ML qui sert un profil calibrÃ© (payload ML non nul)."""

    def predict_risk_serving(self, teacher_id: str):
        return _profile(teacher_id), {"data_origin": "SIMULATED"}, None

    def heuristic_risk_reference(self, teacher_id: str) -> RiskProfile:
        return _profile(teacher_id)


class MlServingNoReferenceModelPort(MlServingModelPort):
    """Port ML servant un profil mais dont la rÃ©fÃ©rence heuristique Ã©choue."""

    def heuristic_risk_reference(self, teacher_id: str) -> RiskProfile:
        raise RuntimeError("reference indisponible")


class RulesFallbackModelPort(FakeModelPort):
    """Port ML : serving Ã©choue, repli rÃ¨gles sur les gaps."""

    def predict_risk_serving(self, teacher_id: str):
        return None, None, "risk ML indisponible"

    def predict_risk(self, teacher_id: str):
        return _profile(teacher_id)


class HeuristicOnlyModelPort(FakeModelPort):
    """Port ML : aucun modÃ¨le â€” repli heuristique comportementale."""

    def predict_risk_serving(self, teacher_id: str):
        return None, None, "risk ML indisponible"

    def predict_risk(self, teacher_id: str):
        return None


class LegacyMlModelPort(FakeModelPort):
    """Port ML legacy : predict_risk sert, engine = ml."""

    def __init__(self) -> None:
        super().__init__()
        self._status = {"model_mode": "PRODUCTION_ML", "risk_engine": "ml",
                        "model_version": "v9.9.9", "artifact_name": "risk_calibrated"}

    def predict_risk(self, teacher_id: str):
        return _profile(teacher_id)

    def status(self) -> dict:
        return self._status


class LegacyRulesModelPort(LegacyMlModelPort):
    """Port ML legacy : predict_risk sert, engine = rules."""

    def __init__(self) -> None:
        super().__init__()
        self._status = {"model_mode": "HEURISTIC_FALLBACK", "risk_engine": "rules",
                        "model_version": None, "artifact_name": None}


def _compute_risk(model_port) -> tuple[ComputeRisk, FakeAnalysisRepository]:
    repo = FakeAnalysisRepository()
    use_case = ComputeRisk(
        competency_source=FakeCompetencySource(),
        formation_source=FakeFormationSource(),
        evaluation_source=FakeEvaluationSource(),
        besoin_source=FakeBesoinSource(),
        analysis_repository=repo,
        model_port=model_port,
        settings=get_settings(),
    )
    return use_case, repo


def test_execute_serving_ml_mode_with_reference():
    use_case, repo = _compute_risk(MlServingModelPort())
    profile, mode, version, name, serving = use_case.execute_serving("ens-001")

    assert mode == "ML"
    assert serving["mode"] == "ML"
    assert serving["payload"] == {"data_origin": "SIMULATED"}
    assert serving["data_origin"] == "SIMULATED"
    assert len(serving["heuristic_reference_factors"]) == 0
    assert len(repo.risk) == 1


def test_execute_serving_ml_mode_reference_fails():
    use_case, _ = _compute_risk(MlServingNoReferenceModelPort())
    _, mode, _, _, serving = use_case.execute_serving("ens-001")

    assert mode == "ML"
    assert serving["heuristic_reference_factors"] == []


def test_execute_serving_replis_regles_puis_heuristique():
    # 1. Repli rÃ¨gles sur les gaps
    use_case, _ = _compute_risk(RulesFallbackModelPort())
    profile, mode, _, _, serving = use_case.execute_serving("ens-001")
    assert mode == "HEURISTIC"
    assert profile is not None
    assert serving["fallback_reason"] == "risk ML indisponible"

    # 2. Repli heuristique comportementale (la raison du port est conservée)
    use_case2, _ = _compute_risk(HeuristicOnlyModelPort())
    profile2, mode2, _, _, serving2 = use_case2.execute_serving("ens-001")
    assert mode2 == "HEURISTIC"
    assert profile2 is not None
    assert serving2["fallback_reason"] == "risk ML indisponible"


def test_execute_delegue_a_execute_serving():
    use_case, _ = _compute_risk(MlServingModelPort())
    profile, mode, version, name = use_case.execute("ens-001")
    assert profile is not None
    assert mode == "ML"


def test_execute_legacy_moteur_ml():
    use_case, repo = _compute_risk(LegacyMlModelPort())
    profile, mode, version, name = use_case.execute_legacy("ens-001")
    assert mode == "PRODUCTION_ML"
    assert version == "v9.9.9"
    assert name == "risk_calibrated"
    assert len(repo.risk) == 1


def test_execute_legacy_moteur_rules():
    use_case, repo = _compute_risk(LegacyRulesModelPort())
    profile, mode, version, name = use_case.execute_legacy("ens-001")
    assert mode == "HEURISTIC_FALLBACK"
    assert profile is not None
    assert len(repo.risk) == 1


def test_execute_legacy_aucun_modele():
    use_case, repo = _compute_risk(FakeModelPort())
    profile, mode, _, _ = use_case.execute_legacy("ens-001")
    assert mode == "HEURISTIC_FALLBACK"
    assert profile is not None
    assert len(repo.risk) == 1


def test_stagnation_months_sans_historique():
    use_case, _ = _compute_risk(FakeModelPort())
    assert use_case._stagnation_months(None) == float(STAGNATION_LOOKBACK_MONTHS)


def test_stagnation_months_date_invalide():
    use_case, _ = _compute_risk(FakeModelPort())
    assert use_case._stagnation_months("pas-une-date") == float(STAGNATION_LOOKBACK_MONTHS)


def test_stagnation_months_date_valide():
    from datetime import date, timedelta

    use_case, _ = _compute_risk(FakeModelPort())
    recent = (date.today() - timedelta(days=30)).isoformat()
    months = use_case._stagnation_months(recent)
    assert 0.5 < months < 2.0


def test_has_decline_et_heuristique():
    use_case, _ = _compute_risk(FakeModelPort())
    # RÃ©gression : premier niveau 4, dernier 2
    history = {101: [("2026-01-31", 4), ("2026-02-28", 2)]}
    assert use_case._has_decline(history) is True
    # Progression : pas de rÃ©gression
    history_ok = {101: [("2026-01-31", 2), ("2026-02-28", 4)]}
    assert use_case._has_decline(history_ok) is False
    # Historique trop court
    assert use_case._has_decline({101: [("2026-01-31", 4)]}) is False

