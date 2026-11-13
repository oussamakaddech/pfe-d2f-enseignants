"""Le risque se calcule sur les écarts affichés (bug 2026-09-24, ENS016/ANI001)."""
from datetime import date

from app.domain.entities.skill_gap import SkillGap
from app.domain.value_objects.enums import Severity, Trend
from app.infrastructure.ml.predictor import ArtifactModelPort


def _gap(cid, score, sev):
    return SkillGap(teacher_id="T", competence_id=cid, competence_code=f"C{cid}", competence_nom=f"C{cid}",
                    observed_result=1.0, knowledge_difficulty_level=3.0, gap_score=score,
                    severity=sev, trend=Trend.STABLE, as_of=date(2026, 9, 24))


def _port(predicted, persisted):
    port = ArtifactModelPort.__new__(ArtifactModelPort)
    port._predict_gaps = lambda tid: predicted
    port._persisted_gaps = lambda tid: persisted
    return port


def test_competences_without_ml_prediction_stay_in_the_risk():
    ml = [_gap(1, 0.5, Severity.HIGH)]
    persisted = [_gap(1, 0.9, Severity.CRITICAL), _gap(2, 0.75, Severity.CRITICAL)]
    gaps = _port(ml, persisted)._resolved_gaps("T")
    # compétence 1 : la prédiction ML prime ; compétence 2 (sans niveau) : conservée
    assert [(g.competence_id, g.gap_score) for g in gaps] == [(1, 0.5), (2, 0.75)]


def test_empty_ml_prediction_falls_back_to_persisted_gaps():
    persisted = [_gap(2, 0.75, Severity.CRITICAL)]
    assert _port(None, persisted)._resolved_gaps("T") == persisted
    assert _port([], []).__class__._resolved_gaps(_port([], []), "T") == []
