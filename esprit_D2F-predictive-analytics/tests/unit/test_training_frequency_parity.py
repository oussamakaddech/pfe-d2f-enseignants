"""training_frequency_per_month : même valeur à l'entraînement et au service.

Bug 2026-09-24 : le service calculait l'écart entre fins de formations dans
l'ordre renvoyé par la base (pas d'ORDER BY). Ordre inversé → écart négatif →
fréquence = nombre de formations (ENS004 : 2,0 au lieu de 0,49), profil jugé
hors du domaine d'entraînement et repli heuristique à tort. Le pipeline
d'entraînement, lui, triait les dates.
"""
from datetime import date

from app.infrastructure.ml.predictor import ArtifactModelPort

FEV, JUIN = date(2026, 2, 28), date(2026, 6, 30)


def _freq(completed):
    avg = ArtifactModelPort._avg_days_between_completions(completed)
    bundle = {"completed": completed, "in_progress": [], "attendance": 0.0, "eval": None,
              "needs": None, "days_since_last": 30, "months_since_last": 1.0, "avg_days_between": avg}
    return ArtifactModelPort._global_features(bundle)["freq_month"]


def test_order_returned_by_the_database_does_not_change_the_feature():
    dans_l_ordre = [{"date_fin": FEV}, {"date_fin": JUIN}]
    a_l_envers = [{"date_fin": JUIN}, {"date_fin": FEV}]
    assert ArtifactModelPort._avg_days_between_completions(a_l_envers) == 122.0
    assert _freq(a_l_envers) == _freq(dans_l_ordre)
    assert round(_freq(a_l_envers), 2) == 0.49  # et non 2,0


def test_same_definition_as_the_training_pipeline():
    # generate_corpus_from_db : ad = mean(diff(sorted(date_fin))) ; freq = n / max(1, ad/30)
    completed = [{"date_fin": date(2026, 5, 1)}, {"date_fin": date(2026, 1, 1)}, {"date_fin": date(2026, 3, 1)}]
    dates = sorted(f["date_fin"] for f in completed)
    ad = sum((dates[i + 1] - dates[i]).days for i in range(2)) / 2
    assert _freq(completed) == 3 / max(1.0, ad / 30.0)


def test_fewer_than_two_completions_gives_zero():
    assert ArtifactModelPort._avg_days_between_completions([{"date_fin": FEV}]) == 0.0
