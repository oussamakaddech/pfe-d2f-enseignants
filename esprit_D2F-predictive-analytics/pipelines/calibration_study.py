"""Étude de calibration de l'indice de risque (gouvernance 7.6, limite 3).

Objectif : mesurer si l'indice de risque pondéré (WEIGHTED_HEURISTIC_INDEX,
poids 0,50 / 0,12 / 0,40 + profil comportemental) peut être calibré en une
probabilité d'événement — SANS jamais remplacer les facteurs explicables.

Méthodes : Platt scaling (régression logistique 1D) et régression isotonique.

PRÉCONDITION HONNÊTE : le script REFUSE de s'exécuter tant qu'aucun événement
observé (départ, échec de formation, stagnation prolongée) n'est disponible.
La collecte d'événements dépend de l'instrumentation de la limite 1
(re-mesures M+3 dans analyse.niveau_snapshot) — aucune cible n'est imputée.

Sorties :
  reports/calibration_report.json — courbe de calibration, Brier score,
  comparaison Platt vs isotonique ;
  exit code 2 si aucun événement observé (message explicite).
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np

BASE_DIR = Path(__file__).parent.parent
REPORTS_DIR = BASE_DIR / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)
REPORT_PATH = REPORTS_DIR / "calibration_report.json"

MIN_EVENTS = 30
BOOTSTRAP_REPLICATIONS = 1000
CI_PERCENTILES = (2.5, 97.5)


class NoObservedEventsError(RuntimeError):
    """Levée quand aucun événement observé n'est disponible pour calibrer."""


def _brier_score(y_true: np.ndarray, proba: np.ndarray) -> float:
    return float(np.mean((proba - y_true) ** 2))


def _calibration_curve(y_true: np.ndarray, proba: np.ndarray, n_bins: int = 10) -> list[dict]:
    """Courbe de calibration empirique : fraction observée vs proba prédite."""
    edges = np.linspace(0.0, 1.0, n_bins + 1)
    points = []
    for i in range(n_bins):
        mask = (proba >= edges[i]) & (proba < edges[i + 1] if i < n_bins - 1 else proba <= edges[i + 1])
        if mask.sum() == 0:
            continue
        points.append({
            "bin": f"[{edges[i]:.1f}, {edges[i + 1]:.1f}]",
            "mean_predicted_proba": round(float(proba[mask].mean()), 4),
            "observed_event_rate": round(float(y_true[mask].mean()), 4),
            "n": int(mask.sum()),
        })
    return points


def _bootstrap_brier_ci(y_true: np.ndarray, proba: np.ndarray, seed: int = 42) -> dict:
    rng = np.random.default_rng(seed)
    n = len(y_true)
    idx = np.arange(n)
    samples = []
    for _ in range(BOOTSTRAP_REPLICATIONS):
        sample = rng.choice(idx, size=n, replace=True)
        samples.append(_brier_score(y_true[sample], proba[sample]))
    lo, hi = np.percentile(samples, CI_PERCENTILES)
    return {
        "method": f"bootstrap_{BOOTSTRAP_REPLICATIONS}_ic95",
        "brier_ci95": [round(float(lo), 4), round(float(hi), 4)],
    }


def run_calibration_study(
    scores: np.ndarray,
    events: np.ndarray,
    min_events: int = MIN_EVENTS,
) -> dict:
    """Calibre l'indice (0..1) contre des événements binaires observés.

    Refuse explicitement de s'exécuter (NoObservedEventsError) si moins de
    ``min_events`` événements réels sont fournis — aucune calibration n'est
    fabriquée sans données observées.
    """
    scores = np.asarray(scores, dtype=float).clip(0.0, 1.0)
    events = np.asarray(events, dtype=float)
    if len(scores) != len(events):
        raise ValueError("scores et events doivent avoir la même longueur")
    n_events = int(events.sum())
    if n_events < min_events:
        raise NoObservedEventsError(
            f"Étude de calibration refusée : {n_events} événement(s) observé(s) "
            f"< minimum requis {min_events}. La calibration exige des événements "
            "réels (départ, échec de formation, stagnation prolongée) collectés "
            "dans le temps — dépend de l'instrumentation de la limite 1 "
            "(re-mesures M+3). Aucune cible n'est imputée."
        )

    results: dict = {
        "task": "risk_index_calibration",
        "score_type": "WEIGHTED_HEURISTIC_INDEX",
        "calibration_status_before": "NOT_CALIBRATED",
        "n_samples": int(len(scores)),
        "n_events": n_events,
        "min_events_required": min_events,
        "methods": {},
    }

    # ── Méthode 1 : Platt scaling (régression logistique sur le score 1D)
    from sklearn.linear_model import LogisticRegression

    platt = LogisticRegression(C=1e6, max_iter=1000)
    platt.fit(scores.reshape(-1, 1), events.astype(int))
    platt_proba = platt.predict_proba(scores.reshape(-1, 1))[:, 1]
    platt_brier = _brier_score(events, platt_proba)
    results["methods"]["platt_scaling"] = {
        "coefficients": {
            "a": round(float(platt.coef_[0][0]), 4),
            "b": round(float(platt.intercept_[0]), 4),
        },
        "brier_score": round(platt_brier, 4),
        "brier_ci": _bootstrap_brier_ci(events, platt_proba),
        "calibration_curve": _calibration_curve(events, platt_proba),
    }

    # ── Méthode 2 : régression isotonique
    from sklearn.isotonic import IsotonicRegression

    iso = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
    iso.fit(scores, events)
    iso_proba = np.clip(iso.predict(scores), 0.0, 1.0)
    iso_brier = _brier_score(events, iso_proba)
    results["methods"]["isotonic_regression"] = {
        "brier_score": round(iso_brier, 4),
        "brier_ci": _bootstrap_brier_ci(events, iso_proba),
        "calibration_curve": _calibration_curve(events, iso_proba),
    }

    # ── Brier de l'indice brut (non calibré) comme référence
    raw_brier = _brier_score(events, scores)
    results["methods"]["uncalibrated_index_baseline"] = {
        "brier_score": round(raw_brier, 4),
        "brier_ci": _bootstrap_brier_ci(events, scores),
    }

    best = min(
        ("platt_scaling", platt_brier),
        ("isotonic_regression", iso_brier),
        ("uncalibrated_index_baseline", raw_brier),
        key=lambda kv: kv[1],
    )
    results["best_method"] = best[0]
    results["best_brier_score"] = round(best[1], 4)
    results["calibration_status_after_study"] = (
        "CALIBRATION_CANDIDATE_FOUND" if best[0] != "uncalibrated_index_baseline" else "STILL_NOT_CALIBRATED"
    )
    results["note"] = (
        "L'indice pondéré explicable est CONSERVÉ : la calibration transforme "
        "uniquement l'échelle de l'indice en probabilité d'événement observé, "
        "sans masquer les facteurs (0,50/0,12/0,40 + profil comportemental)."
    )
    return results


def main() -> int:
    """Point d'entrée CLI — refuse proprement sans événements observés."""
    # Source des scores : snapshots de risque persistés (analyse.teacher_risk_snapshots).
    # Source des événements : instrumentation limite 1 (re-mesures M+3). Tant que
    # cette table d'événements est vide, le script refuse — c'est le comportement
    # attendu et documenté (gouvernance 7.6).
    import os

    import pandas as pd
    from sqlalchemy import create_engine, text

    db_url = os.environ.get("DATABASE_URL", "postgresql://d2f:d2fpasswd@localhost:7432/d2f")
    engine = create_engine(db_url)

    try:
        with engine.connect() as conn:
            snapshots = pd.read_sql(
                text('SELECT enseignant_id, score_risque FROM "analyse".teacher_risk_snapshots ORDER BY computed_at DESC'),
                conn,
            )
            # Événements observés : stagnation prolongée mesurée via les snapshots
            # mensuels de niveaux (analyse.niveau_snapshot) — un enseignant est
            # en « stagnation prolongée » si son niveau n'a pas bougé pendant
            # >= 6 mois consécutifs de snapshots REELS.
            try:
                levels = pd.read_sql(
                    text('SELECT teacher_id, savoir_id, niveau, snapshot_date FROM "analyse".niveau_snapshot ORDER BY teacher_id, savoir_id, snapshot_date'),
                    conn,
                )
            except Exception:
                levels = pd.DataFrame()
    except Exception as exc:
        print(f"[STOP] Base indisponible ({exc}).")
        print("       L'étude de calibration exige les snapshots persistés et les événements observés.")
        return 2

    if levels.empty:
        print("[STOP] Aucune re-mesure réelle disponible (analyse.niveau_snapshot vide).")
        print("       L'étude de calibration REFUSE de s'exécuter sans événements observés")
        print("       (départ, échec de formation, stagnation prolongée) — dépend de la limite 1.")
        report = {
            "status": "REFUSED",
            "reason": "aucun événement observé disponible — collecte en cours (limite 1 : re-mesures M+3)",
            "score_type": "WEIGHTED_HEURISTIC_INDEX",
            "calibration_status": "NOT_CALIBRATED",
        }
        REPORT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
        return 2

    # Construction honnête des événements stagnation : paire de snapshots réels
    # espacés d'au moins 6 mois avec un niveau identique.
    events_by_teacher: dict[str, int] = {}
    for (tid, sid), group in levels.groupby(["teacher_id", "savoir_id"]):
        group = group.sort_values("snapshot_date")
        if len(group) < 2:
            continue
        first_date = pd.Timestamp(group["snapshot_date"].iloc[0])
        last_date = pd.Timestamp(group["snapshot_date"].iloc[-1])
        if (last_date - first_date).days >= 180 and int(group["niveau"].iloc[0]) == int(group["niveau"].iloc[-1]):
            events_by_teacher[tid] = 1

    if not events_by_teacher:
        print("[STOP] Aucun événement de stagnation prolongée mesurable dans les snapshots.")
        print("       La calibration reste NOT_CALIBRATED — aucune imputation.")
        report = {
            "status": "REFUSED",
            "reason": "aucun événement de stagnation prolongée mesurable dans analyse.niveau_snapshot",
            "score_type": "WEIGHTED_HEURISTIC_INDEX",
            "calibration_status": "NOT_CALIBRATED",
        }
        REPORT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
        return 2

    # Dernier indice de risque connu par enseignant + événement observé.
    latest = snapshots.drop_duplicates(subset=["enseignant_id"], keep="first")
    merged = latest.merge(
        pd.DataFrame(list(events_by_teacher.items()), columns=["enseignant_id", "event"]),
        on="enseignant_id",
        how="inner",
    )
    if merged.empty:
        print("[STOP] Aucun enseignant avec à la fois un indice persisté et un événement observé.")
        return 2

    scores = merged["score_risque"].astype(float).clip(0, 1).values
    events = merged["event"].astype(float).values

    try:
        report = run_calibration_study(scores, events)
    except NoObservedEventsError as exc:
        print(f"[STOP] {exc}")
        report = {
            "status": "REFUSED",
            "reason": str(exc),
            "score_type": "WEIGHTED_HEURISTIC_INDEX",
            "calibration_status": "NOT_CALIBRATED",
        }
        REPORT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
        return 2

    report["status"] = "OK"
    REPORT_PATH.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[OK] Rapport de calibration : {REPORT_PATH}")
    print(f"    meilleur méthode : {report['best_method']} (Brier {report['best_brier_score']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
