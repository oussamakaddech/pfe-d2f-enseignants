"""Normalisation du score de risque : facteurs bornés [0, 1], contributions
= facteur normalisé * poids, score = min(1, somme), caps documentés,
is_capped/uncapped_score exposés, cohérence gaps affichés <-> risque.

Cas nominaux exigés : 2 gaps critiques (Karim), 12 gaps critiques (Marwa),
15 gaps au total, compteur borné, contributions jamais > 1 ni négatives.
"""
from datetime import date

import pytest

from app.domain.entities.risk_profile import RiskProfile
from app.domain.entities.skill_gap import SkillGap
from app.domain.services.risk_calculator import RiskInputs, compute_risk
from app.domain.value_objects.enums import RiskLevel, Severity, Trend
from app.infrastructure.ml.predictor import rule_risk_from_gaps

WEIGHTS = {"stagnation": 0.25, "decline": 0.20, "attendance": 0.20, "low_eval": 0.15, "repeated_need": 0.10, "low_engagement": 0.10}


def _gap(teacher_id: str, gap_score: float, severity: Severity) -> SkillGap:
    return SkillGap(
        teacher_id=teacher_id,
        competence_id=1,
        competence_code="C1",
        competence_nom="Compétence 1",
        observed_result=0.0,
        knowledge_difficulty_level=5.0,
        gap_score=gap_score,
        severity=severity,
        trend=Trend.STABLE,
        as_of=date.today(),
    )


def _rule_risk(
    gaps: list[SkillGap],
    teacher_id: str = "T001",
    scope: str = "TEACHER",
    scope_type: str | None = None,
    scope_id: str | None = None,
    scope_label: str | None = None,
) -> RiskProfile:
    return rule_risk_from_gaps(
        teacher_id,
        gaps,
        scope=scope,
        scope_type=scope_type or scope,
        scope_id=scope_id,
        scope_label=scope_label,
    )


def _score_01(profile: RiskProfile) -> float:
    return profile.score_01


# ---------------------------------------------------------------- Règle gaps

def test_two_critical_gaps_karim_non_regression():
    """Karim (ENS024) : 2 critiques + 1 haute + avg 0.8333 -> 95.33 (inchangé)."""
    gaps = [
        _gap("ENS024", 0.9, Severity.CRITICAL),
        _gap("ENS024", 0.8, Severity.CRITICAL),
        _gap("ENS024", 0.8, Severity.HIGH),
    ]
    profile = _rule_risk(gaps, "ENS024", scope="DEPARTMENT")
    assert profile.risk_score == 95.33
    assert profile.risk_level is RiskLevel.CRITICAL
    by_code = {f.feature: f for f in profile.factors}
    assert by_code["critical_gaps"].value == 2.0
    assert by_code["critical_gaps"].normalized_value == 1.0  # 2/2 -> cap
    assert by_code["critical_gaps"].contribution == 0.5  # 1.0 * 0.50
    assert by_code["high_gaps"].normalized_value == 1.0  # 1/1 -> cap
    assert by_code["high_gaps"].contribution == 0.12
    assert by_code["avg_gap_score"].normalized_value == pytest.approx(0.8333, abs=1e-4)
    assert by_code["avg_gap_score"].contribution == pytest.approx(0.3333, abs=1e-4)
    assert profile.is_capped is False
    assert profile.uncapped_score == pytest.approx(0.9533, abs=1e-4)


def test_twelve_critical_gaps_marwa_bounded():
    """Marwa (ENS036) : 12 critiques + 2 hautes + avg 0.85 -> facteurs bornés."""
    gaps = (
        [_gap("ENS036", 0.95, Severity.CRITICAL) for _ in range(12)]
        + [_gap("ENS036", 0.8, Severity.HIGH) for _ in range(2)]
        + [_gap("ENS036", 0.5, Severity.MEDIUM)]
    )
    assert len(gaps) == 15
    profile = _rule_risk(gaps, "ENS036")
    by_code = {f.feature: f for f in profile.factors}
    assert by_code["critical_gaps"].value == 12.0
    assert by_code["critical_gaps"].normalized_value == 1.0  # 12/2 -> cap 1.0
    assert by_code["critical_gaps"].contribution == 0.5  # 1.0 * 0.50 -> jamais 3.0
    assert by_code["high_gaps"].normalized_value == 1.0  # 2/1 -> cap 1.0
    assert by_code["high_gaps"].contribution == 0.12
    assert profile.uncapped_score <= 1.0 or profile.is_capped is True
    assert 0 <= _score_01(profile) <= 1.0
    assert profile.risk_score == pytest.approx(100.0 * _score_01(profile), abs=0.01)


def test_contributions_always_in_unit_interval():
    """Toute contribution d'un facteur est dans [0, 1] (jamais 3.000, jamais négative)."""
    for critical, high in [(0, 0), (1, 0), (2, 1), (12, 2), (50, 10)]:
        gaps = (
            [_gap("T", 0.9, Severity.CRITICAL) for _ in range(critical)]
            + [_gap("T", 0.7, Severity.HIGH) for _ in range(high)]
            + [_gap("T", 0.3, Severity.MEDIUM)]
        )
        profile = _rule_risk(gaps, "T")
        for f in profile.factors:
            assert 0.0 <= f.contribution <= 1.0
            assert 0.0 <= f.normalized_value <= 1.0
            assert f.contribution == pytest.approx(f.normalized_value * f.weight, abs=1e-4)


def test_capped_score_exposes_uncapped_value():
    """Somme des poids = 1.02 -> le cap 1.0 est atteignable et tracé."""
    gaps = [_gap("T", 1.0, Severity.CRITICAL) for _ in range(2)] + [_gap("T", 1.0, Severity.HIGH)] + [_gap("T", 1.0, Severity.CRITICAL)]
    profile = _rule_risk(gaps, "T")
    assert profile.uncapped_score == pytest.approx(1.02, abs=1e-3)
    assert profile.is_capped is True
    assert _score_01(profile) == 1.0
    assert profile.risk_score == 100.0


def test_sum_of_contributions_matches_score():
    gaps = (
        [_gap("T", 0.9, Severity.CRITICAL) for _ in range(3)]
        + [_gap("T", 0.6, Severity.HIGH)]
        + [_gap("T", 0.4, Severity.MEDIUM)]
    )
    profile = _rule_risk(gaps, "T")
    total = sum(f.contribution for f in profile.factors)
    assert profile.uncapped_score == pytest.approx(round(total, 4))
    assert _score_01(profile) == pytest.approx(min(1.0, total))
    assert profile.risk_score == pytest.approx(100.0 * min(1.0, total))


def test_rule_risk_zero_gaps_low():
    profile = _rule_risk([], "T")
    assert profile.risk_score == 0.0
    assert profile.risk_level is RiskLevel.LOW
    assert profile.factors == ()
    assert _score_01(profile) == 0.0


def test_to_dict_dto_shape():
    gaps = [_gap("T", 0.9, Severity.CRITICAL) for _ in range(2)] + [_gap("T", 0.8, Severity.HIGH)]
    profile = _rule_risk(gaps, "T", scope="DEPARTMENT", scope_type="DEPARTMENT", scope_id="D1", scope_label="Département Réseaux")
    payload = profile.to_dict("HEURISTIC_FALLBACK")["data"]
    assert payload["score"] == pytest.approx(profile.score_01)
    assert payload["score_percent"] == pytest.approx(profile.score_01 * 100.0)
    assert payload["level"] == profile.risk_level.value
    assert payload["level_label"] in {"FAIBLE", "MODERE", "ELEVE", "CRITIQUE"}
    assert payload["is_capped"] == profile.is_capped
    assert "uncapped_score" in payload
    assert payload["risk_score"] == profile.risk_score  # compat 0..100
    for f in payload["factors"]:
        assert {"code", "label", "raw_value", "normalized_value", "weight", "contribution", "contribution_percent", "scope", "scope_type", "scope_id", "scope_label"} <= set(f)
        assert f["contribution_percent"] == pytest.approx(f["contribution"] * 100.0)
        assert f["scope"] == "DEPARTMENT"
        assert f["scope_type"] == "DEPARTMENT"
        assert f["scope_id"] == "D1"
        assert f["scope_label"] == "Département Réseaux"


# --------------------------------------------------------- Périmètre des facteurs

def test_factor_scope_and_labels_per_scope():
    """Le DTO expose le périmètre du facteur ; le libellé du facteur critique
    est TOUJOURS « Gaps critiques » — le scope est exposé séparément via
    scope_type / scope_id / scope_label (jamais concaténé dans le label)."""
    gaps = [_gap("T", 0.9, Severity.CRITICAL) for _ in range(3)] + [_gap("T", 0.8, Severity.HIGH)]
    teacher = _rule_risk(gaps, "T", scope="TEACHER", scope_type="TEACHER", scope_id="T", scope_label="Alice Dupont")
    department = _rule_risk(gaps, "T", scope="DEPARTMENT", scope_type="DEPARTMENT", scope_id="D1", scope_label="Département Réseaux")
    t_by_code = {f.feature: f for f in teacher.factors}
    d_by_code = {f.feature: f for f in department.factors}
    # Valeur brute : 3 gaps critiques (périmètre enseignant) / 3 (même jeu scopé)
    assert t_by_code["critical_gaps"].value == 3.0
    assert d_by_code["critical_gaps"].value == 3.0
    assert t_by_code["critical_gaps"].scope == "TEACHER"
    assert d_by_code["critical_gaps"].scope == "DEPARTMENT"
    # Le label est TOUJOURS le même — le scope est dans scope_label.
    assert t_by_code["critical_gaps"].label == "Gaps critiques"
    assert d_by_code["critical_gaps"].label == "Gaps critiques"
    assert t_by_code["critical_gaps"].scope_type == "TEACHER"
    assert t_by_code["critical_gaps"].scope_id == "T"
    assert t_by_code["critical_gaps"].scope_label == "Alice Dupont"
    assert d_by_code["critical_gaps"].scope_type == "DEPARTMENT"
    assert d_by_code["critical_gaps"].scope_id == "D1"
    assert d_by_code["critical_gaps"].scope_label == "Département Réseaux"
    # Libellé cohérent avec l'enum backend (Severity.HIGH = "HAUTE")
    assert t_by_code["high_gaps"].label == "Gaps de haute urgence"
    assert t_by_code["high_gaps"].scope == "TEACHER"
    assert d_by_code["high_gaps"].label == "Gaps de haute urgence"
    assert d_by_code["high_gaps"].scope == "DEPARTMENT"
    # Scores identiques (même jeu de gaps) : somme des contributions = score.
    assert teacher.risk_score == department.risk_score
    total = sum(f.contribution for f in department.factors)
    assert department.uncapped_score == pytest.approx(round(total, 4))


def test_five_critical_gaps_department_scope_raw_five():
    """Scénario départemental avec 5 gaps critiques : le facteur brut reste 5
    (aucun arrondi, aucune correction arbitraire), contribution bornée à 50%."""
    gaps = [_gap("T", 0.9, Severity.CRITICAL) for _ in range(5)] + [_gap("T", 0.6, Severity.HIGH)]
    profile = _rule_risk(gaps, "T", scope="DEPARTMENT", scope_type="DEPARTMENT", scope_id="D1", scope_label="Département Réseaux")
    by_code = {f.feature: f for f in profile.factors}
    assert by_code["critical_gaps"].value == 5.0
    assert by_code["critical_gaps"].normalized_value == 1.0  # 5/2 -> cap 1.0
    assert by_code["critical_gaps"].contribution == 0.5  # jamais 250%
    assert by_code["critical_gaps"].label == "Gaps critiques"
    assert by_code["critical_gaps"].scope_type == "DEPARTMENT"
    assert by_code["critical_gaps"].scope_id == "D1"
    assert by_code["critical_gaps"].scope_label == "Département Réseaux"


# ------------------------------------------------------- Moteur heuristique

def test_heuristic_factors_normalized_and_weighted():
    inputs = RiskInputs(
        teacher_id="T001", stagnation_months=24.0, declined=True, attendance_rate=0.0,
        avg_eval_score=1.0, repeated_need_count=3.0, days_since_last_activity=180.0,
    )
    profile = compute_risk(inputs, WEIGHTS)
    assert profile.risk_level is RiskLevel.CRITICAL
    assert profile.risk_score == pytest.approx(97.0, abs=0.01)
    assert profile.is_capped is False  # somme des poids = 1.0 -> jamais plafonné
    for f in profile.factors:
        assert 0.0 <= f.normalized_value <= 1.0
        assert 0.0 <= f.contribution <= 1.0
        assert f.label  # libellé FR toujours présent
    assert sum(f.contribution for f in profile.factors) <= 1.0
    assert profile.uncapped == pytest.approx(sum(f.contribution for f in profile.factors))


def test_heuristic_contributions_sort_desc():
    inputs = RiskInputs(
        teacher_id="T001", stagnation_months=24.0, declined=False, attendance_rate=0.0,
        avg_eval_score=5.0, repeated_need_count=0.0, days_since_last_activity=0.0,
    )
    profile = compute_risk(inputs, WEIGHTS)
    contributions = [f.contribution for f in profile.factors]
    assert contributions == sorted(contributions, reverse=True)


def test_heuristic_healthy_teacher_zero():
    inputs = RiskInputs(
        teacher_id="T001", stagnation_months=0.0, declined=False, attendance_rate=1.0,
        avg_eval_score=5.0, repeated_need_count=0.0, days_since_last_activity=0.0,
    )
    profile = compute_risk(inputs, WEIGHTS)
    assert profile.risk_score == 0.0
    assert profile.factors == ()


# ------------------------------------------------------------- Cohérence

def test_gaps_used_for_risk_are_displayed_gaps():
    """Le nombre de gaps utilisés par la règle de risque est exactement le
    nombre de gaps pris en entrée (aucun gap hors périmètre ajouté)."""
    gaps = (
        [_gap("ENS036", 0.95, Severity.CRITICAL) for _ in range(12)]
        + [_gap("ENS036", 0.8, Severity.HIGH) for _ in range(2)]
        + [_gap("ENS036", 0.5, Severity.MEDIUM)]
    )
    profile = _rule_risk(gaps, "ENS036")
    total_gaps = sum(1 for g in gaps)
    factor_counts = {f.feature: f.value for f in profile.factors}
    assert factor_counts["critical_gaps"] == sum(1 for g in gaps if g.severity == Severity.CRITICAL)
    assert factor_counts["high_gaps"] == sum(1 for g in gaps if g.severity == Severity.HIGH)
    assert total_gaps == 15
    assert profile.risk_level is RiskLevel.CRITICAL