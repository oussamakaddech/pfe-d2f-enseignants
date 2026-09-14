"""Entraine le modele de risque ML sur le corpus de SIMULATION (cibles M+3 OBSERVEES).

Protocole (chapitre moteur de risque — etape 2) :
- Donnees : ``data/clean/simulation_dataset.csv`` (10 920 lignes, 45 enseignants,
  30 mois, re-mesures M+3 observees, seed 42).
- Cible SUPERVISEE sans fuite : categorie de risque a t+3 calculee depuis les
  niveaux OBSERVES a M+3, avec la MEME definition que le moteur heuristique
  (0.50/0.12/0.40, seuils 0.75/0.50/0.30) — voir ``risk_features.py``.
- Features a t uniquement (anti-fuite) : ``gap_next_3m``, ``target_observation_date``
  et tout niveau postérieur a t sont EXCLUS.
- Holdout temporel : derniers 20 % des mois = test ; calibration isotonique de la
  probabilite CRITICAL sur les derniers 25 % des mois d'entraînement.
- Candidats compares (meme protocole, bootstrap 1000, IC95) :
    a) Regression logistique multinomiale (baseline interpretable) ;
    b) GradientBoostingClassifier ;
    c) XGBoost AVEC monotone_constraints (plus de gaps critiques/hautes ou plus
       de profondeur => probabilite de risque JAMAIS plus basse ; verifiee).
- Seuil d'acceptation : Brier (CRITICAL calibre) <= 0.05 ET macro-F1 >= 0.70.
- Explicabilite : contributions par arbre (pred_contribs XGBoost / SHAP TreeExplainer),
  top-3 exportes au serving ; alignement directionnel avec l'heuristique verifie.
- Artefact : ``data/models/risk_predictor_simulation.joblib`` (+ sidecar sha256) et
  metadonnees ``data/models/risk_training_metadata.json`` (l'ancien RF rejeté
  macro-F1 0.2847 est archive dans ``risk_training_metadata_rf_legacy.json``).
- Registre : risk-simulation-v1.0.0 — data_origin=SIMULATED,
  target_validity=OBSERVED_IN_SIMULATION, validation_scope=SIMULATION_VALIDATED.

Usage:
    python -m pipelines.train_risk_model
"""
from __future__ import annotations

import hashlib
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingClassifier
from sklearn.isotonic import IsotonicRegression
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import brier_score_loss, f1_score
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import StandardScaler
from xgboost import XGBClassifier

from app.infrastructure.ml.risk_features import (
    MONOTONE_CONSTRAINTS,
    RISK_CLASSES,
    RISK_FEATURES,
    build_training_frame,
)

BASE_DIR = Path(__file__).parent.parent
DATA_CLEAN = BASE_DIR / "data" / "clean"
MODELS_DIR = BASE_DIR / "data" / "models"
REPORTS_DIR = BASE_DIR / "reports"

SIMULATION_CSV = DATA_CLEAN / "simulation_dataset.csv"
ARTIFACT_PATH = MODELS_DIR / "risk_predictor_simulation.joblib"
ARTIFACT_SHA_PATH = MODELS_DIR / "risk_predictor_simulation.joblib.sha256"
METADATA_PATH = MODELS_DIR / "risk_training_metadata.json"
LEGACY_METADATA_PATH = MODELS_DIR / "risk_training_metadata_rf_legacy.json"
CALIBRATION_REPORT_PATH = REPORTS_DIR / "risk_calibration_report.json"

SEED = 42
BOOTSTRAP_ITERATIONS = 1000
TEST_MONTH_FRACTION = 0.20
CALIB_MONTH_FRACTION = 0.25
BRIER_MAX = 0.05
MACRO_F1_MIN = 0.70
MODEL_VERSION = "risk-simulation-v1.0.0"


def _hash_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _bootstrap_ci(y_true: np.ndarray, y_pred: np.ndarray, y_proba_crit: np.ndarray) -> dict:
    """IC95 bootstrap 1000 de macro-F1 et Brier (classe CRITICAL)."""
    rng = np.random.default_rng(SEED)
    n = len(y_true)
    f1s, briers = [], []
    y_bin = (y_true == "CRITICAL").astype(int)
    for _ in range(BOOTSTRAP_ITERATIONS):
        idx = rng.integers(0, n, n)
        if len(set(y_true[idx])) < 2:
            continue
        f1s.append(f1_score(y_true[idx], y_pred[idx], average="macro", zero_division=0))
        briers.append(brier_score_loss(y_bin[idx], np.clip(y_proba_crit[idx], 0.0, 1.0)))
    def _ci(values: list[float]) -> list[float]:
        arr = np.sort(np.asarray(values))
        lo = arr[int(0.025 * len(arr))]
        hi = arr[int(0.975 * len(arr)) - 1]
        return [round(float(lo), 4), round(float(hi), 4)]
    return {
        "iterations": BOOTSTRAP_ITERATIONS,
        "macro_f1_ci95": _ci(f1s),
        "brier_ci95": _ci(briers),
    }


def _make_candidates() -> dict[str, object]:
    n_pos_idx = [i for i, c in enumerate(RISK_FEATURES) if MONOTONE_CONSTRAINTS.get(c) == 1]
    monotone = [0] * len(RISK_FEATURES)
    for i in n_pos_idx:
        monotone[i] = 1
    return {
        "logistic_regression": Pipeline([
            ("scaler", StandardScaler()),
            ("clf", LogisticRegression(max_iter=2000, C=1.0, random_state=SEED)),
        ]),
        "gradient_boosting": GradientBoostingClassifier(random_state=SEED),
        "xgboost_monotone": _XGBWrapped(
            n_estimators=300,
            max_depth=4,
            learning_rate=0.08,
            subsample=0.9,
            colsample_bytree=0.9,
            reg_lambda=1.0,
            random_state=SEED,
            eval_metric="mlogloss",
            monotone_constraints=tuple(monotone),
        ),
    }


class _XGBWrapped:
    """XGBoost avec labels encodes (exige ints) — expose classes_ / predict_proba
    en labels d'origine et delegue get_booster pour l'explicabilite."""

    def __init__(self, **kwargs: object) -> None:
        self.model = XGBClassifier(**kwargs)

    def fit(self, X: np.ndarray, y: np.ndarray) -> "_XGBWrapped":
        from sklearn.preprocessing import LabelEncoder
        self.le_ = LabelEncoder().fit(RISK_CLASSES)
        self.model.fit(X, self.le_.transform(y))
        return self

    @property
    def classes_(self) -> np.ndarray:
        return self.le_.classes_

    def predict_proba(self, X: np.ndarray) -> np.ndarray:
        return self.model.predict_proba(X)

    def predict(self, X: np.ndarray) -> np.ndarray:
        return self.le_.inverse_transform(self.model.predict(X))

    def __getattr__(self, name: str):  # delegue (get_booster, ...)
        return getattr(self.model, name)



def _calibrate_critical(model, X_calib: np.ndarray, y_calib: np.ndarray) -> IsotonicRegression:
    """Calibration isotonique de la probabilite CRITICAL (fit sur mois de calibration)."""
    proba = model.predict_proba(X_calib)
    classes = list(model.classes_) if hasattr(model, "classes_") else list(model[-1].classes_)
    p_crit = proba[:, classes.index("CRITICAL")]
    y_bin = (y_calib == "CRITICAL").astype(int)
    iso = IsotonicRegression(out_of_bounds="clip", y_min=0.0, y_max=1.0)
    iso.fit(p_crit, y_bin)
    return iso


def _predict_calibrated(model, iso: IsotonicRegression, X: np.ndarray) -> tuple[np.ndarray, np.ndarray]:
    """(classes, proba calibree) : la proba CRITICAL est remplacee par la proba
    calibree, les autres classes sont renormalisees pour sommer a 1."""
    proba = model.predict_proba(X)
    classes = list(model.classes_) if hasattr(model, "classes_") else list(model[-1].classes_)
    i_crit = classes.index("CRITICAL")
    p_crit = np.clip(iso.predict(proba[:, i_crit]), 0.0, 1.0)
    other = proba[:, [j for j in range(len(classes)) if j != i_crit]]
    other_sum = other.sum(axis=1, keepdims=True)
    scale = np.where(other_sum > 0, (1.0 - p_crit[:, None]) / np.maximum(other_sum, 1e-12), 0.0)
    other_calib = other * scale
    out = np.zeros_like(proba)
    out[:, i_crit] = p_crit
    for k, j in enumerate([j for j in range(len(classes)) if j != i_crit]):
        out[:, j] = other_calib[:, k]
    return classes, np.clip(out, 0.0, 1.0)


def _model_classes(model) -> list:
    return list(model.classes_) if hasattr(model, "classes_") else list(model[-1].classes_)


def _monotonicity_check(model) -> dict:
    """Verifie : plus de gaps critiques / hautes / profondeur => risque JAMAIS plus bas."""
    med = {
        "n_gaps_total": 2.0, "n_gaps_critical": 0.0, "n_gaps_high": 0.0, "n_gaps_medium": 1.0,
        "avg_gap_score": 0.35, "max_gap_score": 0.5, "critical_ratio": 0.0, "has_critical": 0.0,
        "trend_gap_direction": 0.0, "stagnation_months": 6.0, "attendance_rate": 0.8,
        "nb_formations_completed": 1.0, "nb_besoins_exprimes": 0.0, "nb_besoins_approuves": 0.0,
        "avg_eval_score": 3.0, "nb_evaluations": 2.0,
        "avg_level_t": 3.0, "min_level_t": 2.0, "max_level_t": 4.0, "nb_savoirs": 4.0,
        "competency_coverage_rate": 0.6, "days_since_last_training": 60.0,
        "training_frequency_per_month": 0.2, "level_change_last_month": 0.0,
        "rolling_tendance": 0.0, "stagnant_share": 0.3, "long_absent_share": 0.0,
    }

    base = np.array([[med[c] for c in RISK_FEATURES]])
    classes = _model_classes(model)
    weights = {c: w for w, c in enumerate(RISK_CLASSES)}
    def _risk_level_value(X: np.ndarray) -> list[float]:
        proba = model.predict_proba(X)
        return [float(np.dot(p, [weights.get(c, 0) for c in classes])) for p in proba]
    results = {}
    for feat, values in [
        ("n_gaps_critical", [0, 1, 2, 3, 5]),
        ("n_gaps_high", [0, 1, 2, 3, 5]),
        ("avg_gap_score", [0.0, 0.25, 0.5, 0.75, 1.0]),
        ("max_gap_score", [0.0, 0.25, 0.5, 0.75, 1.0]),
    ]:
        grid = np.repeat(base, len(values), axis=0)
        grid[:, RISK_FEATURES.index(feat)] = values
        if feat == "n_gaps_critical":
            grid[:, RISK_FEATURES.index("has_critical")] = [0.0, 1.0, 1.0, 1.0, 1.0]
            grid[:, RISK_FEATURES.index("critical_ratio")] = [0.0, 0.5, 1.0, 1.0, 1.0]
            grid[:, RISK_FEATURES.index("n_gaps_total")] = [2.0, 2.0, 2.0, 3.0, 5.0]
        if feat == "n_gaps_high":
            grid[:, RISK_FEATURES.index("n_gaps_total")] = [2.0, 2.0, 2.0, 3.0, 5.0]
        scores = _risk_level_value(grid)
        results[feat] = {
            "values": values,
            "risk_score": [round(s, 6) for s in scores],
            "monotone": all(scores[i + 1] >= scores[i] - 1e-9 for i in range(len(scores) - 1)),
        }
    return {
        "checked_features": list(results),
        "details": results,
        "all_monotone": all(r["monotone"] for r in results.values()),
    }


def _shap_top_features(model, X: np.ndarray) -> tuple[dict[str, float], str]:
    """Contributions globales (SHAP si dispo, sinon pred_contribs/importances) + methode."""
    model_core = model[-1] if not hasattr(model, "classes_") else model
    try:
        import shap
        explainer = shap.TreeExplainer(model_core)
        sv = explainer.shap_values(X[:200])
        if isinstance(sv, list):
            vals = np.sum([np.abs(a) for a in sv], axis=0).sum(axis=0)
        else:
            arr = np.asarray(sv)
            vals = np.abs(arr).sum(axis=tuple(range(arr.ndim - 1)))
        method = "shap.TreeExplainer"
    except Exception:
        if hasattr(model_core, "get_booster"):
            import xgboost
            booster = model_core.get_booster()
            dm = xgboost.DMatrix(X, feature_names=RISK_FEATURES)
            contribs = booster.predict(dm, pred_contribs=True)
            arr = np.asarray(contribs)[:, :-1, :]
            vals = np.abs(arr).sum(axis=(0, 2))
            method = "xgboost.pred_contribs"
        elif hasattr(model_core, "feature_importances_"):
            vals = np.asarray(model_core.feature_importances_, dtype=float)
            method = "feature_importances_proxy"
        elif hasattr(model_core, "coef_"):
            vals = np.abs(model_core.coef_).sum(axis=0)
            method = "logistic_coefficients"
        else:
            return {}, "none"
    imp = {c: float(v) for c, v in zip(RISK_FEATURES, vals)}
    total = sum(imp.values()) or 1.0
    return {k: round(v / total, 4) for k, v in sorted(imp.items(), key=lambda kv: -kv[1])}, method


def main() -> int:
    print("[1] Chargement du corpus de simulation...")
    df = pd.read_csv(SIMULATION_CSV)
    assert (df["data_origin"] == "SIMULATED").all()
    dataset_hash = hashlib.sha256(SIMULATION_CSV.read_bytes()).hexdigest()

    print("[2] Construction (features a t, cible t+3 OBSERVEE)...")
    frame = build_training_frame(df).dropna(subset=RISK_FEATURES + ["risk_class"])
    label_counts = frame["risk_class"].value_counts().to_dict()
    print(f"    {len(frame)} observations (enseignant x mois), classes : {label_counts}")

    # Split TEMPOREL : derniers 20 % des mois = holdout.
    months = sorted(frame["ref_month"].unique())
    n_test_months = max(1, int(len(months) * TEST_MONTH_FRACTION))
    test_months = months[-n_test_months:]
    train_months = months[:-n_test_months]
    n_calib_months = max(1, int(len(train_months) * CALIB_MONTH_FRACTION))
    calib_months = train_months[-n_calib_months:]
    train_fit = frame[frame["ref_month"].isin(train_months) & ~frame["ref_month"].isin(calib_months)]
    train_calib = frame[frame["ref_month"].isin(calib_months)]
    test_frame = frame[frame["ref_month"].isin(test_months)]
    print(f"    train_fit={len(train_fit)} calib={len(train_calib)} holdout={len(test_frame)} "
          f"(mois : fit<={calib_months[0] if calib_months else '?'}, calib={calib_months[0]}-{calib_months[-1] if calib_months else '?'}, test={test_months[0]}-{test_months[-1]})")

    X_fit = train_fit[RISK_FEATURES].to_numpy(dtype=float)
    y_fit = train_fit["risk_class"].to_numpy()
    X_calib = train_calib[RISK_FEATURES].to_numpy(dtype=float)
    y_calib = train_calib["risk_class"].to_numpy()
    X_test = test_frame[RISK_FEATURES].to_numpy(dtype=float)
    y_test = test_frame["risk_class"].to_numpy()


    print("[3] Comparaison des candidats (meme holdout temporel, calibration isotonique)...")
    baseline_f1 = float(f1_score(y_test, test_frame["risk_class_t"], average="macro", zero_division=0))
    print(f"    baseline persistance (classe a t = classe t+3) : macro-F1={baseline_f1:.4f}")
    candidates_report, trained = [], {}

    for name, model in _make_candidates().items():
        model.fit(X_fit, y_fit)
        iso = _calibrate_critical(model, X_calib, y_calib)
        classes, proba = _predict_calibrated(model, iso, X_test)
        y_pred = np.array(classes)[np.argmax(proba, axis=1)]
        macro_f1 = float(f1_score(y_test, y_pred, average="macro", zero_division=0))
        p_crit = proba[:, list(classes).index("CRITICAL")]
        brier = float(brier_score_loss((y_test == "CRITICAL").astype(int), p_crit))
        ci = _bootstrap_ci(y_test, y_pred, p_crit)
        candidates_report.append({
            "candidate": name,
            "macro_f1": round(macro_f1, 4),
            "brier_critical_calibrated": round(brier, 4),
            "macro_f1_ci95": ci["macro_f1_ci95"],
            "brier_ci95": ci["brier_ci95"],
            "bootstrap_iterations": ci["iterations"],
            "accept": bool(brier <= BRIER_MAX and macro_f1 >= MACRO_F1_MIN),
        })
        trained[name] = (model, iso)
        print(f"    {name}: macro-F1={macro_f1:.4f} IC95={ci['macro_f1_ci95']} Brier={brier:.4f} IC95={ci['brier_ci95']}")

    print("[4] Selection du candidat...")
    accepted = [c for c in candidates_report if c["accept"]]
    if accepted:
        prefer = [c for c in accepted if c["candidate"] == "xgboost_monotone"]
        best = (prefer or accepted)[0]
        decision = "accept"
    else:
        best = max(candidates_report, key=lambda c: c["macro_f1"])
        decision = "reject"
    best_name = best["candidate"]
    best_model, best_iso = trained[best_name]
    print(f"    candidat retenu : {best_name} (decision={decision})")

    print("[5] Verification des contraintes de monotonie...")
    mono = _monotonicity_check(best_model)
    print(f"    monotonie OK : {mono['all_monotone']} ({mono['checked_features']})")
    if best_name == "xgboost_monotone" and not mono["all_monotone"]:
        decision = "reject"
        print("    XGBoost monotone viole la monotonie -> decision=reject (fail-closed)")

    print("[6] Explicabilite (SHAP / contributions) et alignement directionnel...")
    importances, expl_method = _shap_top_features(best_model, X_test)
    directional = {"n_gaps_critical", "avg_gap_score", "max_gap_score", "critical_ratio", "n_gaps_high"}
    top5 = set(list(importances)[:5])
    aligned = bool(top5 & directional)
    print(f"    methode={expl_method} top-5={list(importances)[:5]} alignement_heuristique={aligned}")

    print("[7] Calibration (courbe 10 bins)...")
    classes, proba = _predict_calibrated(best_model, best_iso, X_test)
    p_crit = proba[:, list(classes).index("CRITICAL")]
    y_bin = (y_test == "CRITICAL").astype(int)
    edges = np.linspace(0.0, 1.0, 11)
    curve = []
    for i in range(10):
        mask = (p_crit >= edges[i]) & (p_crit < edges[i + 1] if i < 9 else p_crit <= edges[i + 1])
        curve.append({
            "bin": [round(float(edges[i]), 2), round(float(edges[i + 1]), 2)],
            "n_predicted": int(mask.sum()),
            "observed_critical_rate": round(float(y_bin[mask].mean()), 4) if mask.any() else None,
            "mean_predicted": round(float(p_crit[mask].mean()), 4) if mask.any() else None,
        })
    brier_final = float(brier_score_loss(y_bin, p_crit))

    print("[8] Plages de features de serving (quantiles simulation + support demo)...")
    serving_ranges = _serving_feature_ranges(df)
    artifact = {
        "model_name": "risk_predictor",
        "model_version": MODEL_VERSION,
        "candidate": best_name,
        "model": best_model,
        "calibrator": best_iso,
        "feature_cols": RISK_FEATURES,
        "classes": RISK_CLASSES,
        "feature_ranges": serving_ranges,
        "monotone_constraints": MONOTONE_CONSTRAINTS,
        "decision": decision,
        "trained_at": datetime.now(timezone.utc).isoformat(),
        "seed": SEED,
    }
    joblib.dump(artifact, ARTIFACT_PATH)
    ARTIFACT_SHA_PATH.write_text(_hash_file(ARTIFACT_PATH), encoding="utf-8")
    print(f"    artefact : {ARTIFACT_PATH} (+ sha256)")

    print("[9] Metadonnees + rapport de calibration...")
    # Archiver l'ancien RF rejeté (macro-F1 0.2847) — trace d'audit conservée.
    if METADATA_PATH.exists() and not LEGACY_METADATA_PATH.exists():
        shutil.copy2(METADATA_PATH, LEGACY_METADATA_PATH)

    metrics = {c["candidate"]: c for c in candidates_report}
    metadata = _build_metadata(
        df=df, dataset_hash=dataset_hash, label_counts=label_counts, test_months=test_months,
        calib_months=calib_months, train_fit=train_fit, train_calib=train_calib, test_frame=test_frame,
        candidates_report=candidates_report, best_name=best_name, decision=decision, mono=mono,
        expl_method=expl_method, importances=importances, aligned=aligned, curve=curve,
        brier_final=brier_final, serving_ranges=serving_ranges, artifact=artifact,
        baseline_f1=baseline_f1,
    )

    METADATA_PATH.write_text(json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8")
    CALIBRATION_REPORT_PATH.write_text(json.dumps({
        "model_version": MODEL_VERSION,
        "candidate": best_name,
        "brier_critical_calibrated": round(brier_final, 4),
        "brier_threshold": BRIER_MAX,
        "macro_f1": metrics[best_name]["macro_f1"],
        "macro_f1_min": MACRO_F1_MIN,
        "brier_ci95": metrics[best_name]["brier_ci95"],
        "macro_f1_ci95": metrics[best_name]["macro_f1_ci95"],
        "curve_10_bins": curve,
        "decision": decision,
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[OK] metadonnees : {METADATA_PATH}")
    print(f"[OK] calibration : {CALIBRATION_REPORT_PATH}")
    print(f"[OK] decision={decision} candidate={best_name} macro-F1={metrics[best_name]['macro_f1']} Brier={round(brier_final, 4)}")
    return 0


def _build_metadata(**kw) -> dict:
    metrics = {c["candidate"]: c for c in kw["candidates_report"]}
    return {
        "model_name": "risk_predictor",
        "model_version": MODEL_VERSION,
        "artifact": str(ARTIFACT_PATH.relative_to(BASE_DIR)),
        "artifact_sha256": _hash_file(ARTIFACT_PATH),
        "trained_at": kw["artifact"]["trained_at"],
        "dataset": {
            "path": str(SIMULATION_CSV.relative_to(BASE_DIR)),
            "rows": int(len(kw["df"])),
            "teachers": int(kw["df"]["teacher_id"].nunique()),
            "months": int(kw["df"]["ref_month"].nunique()),
            "dataset_hash": kw["dataset_hash"],
            "data_origin": "SIMULATED",
        },
        "seed": SEED,
        "target": {
            "definition": "categorie de risque a t+3 depuis les niveaux OBSERVES a M+3 (re-mesure simulee)",
            "thresholds": "score>=0.75 CRITICAL, >=0.50 HIGH, >=0.30 MEDIUM, sinon LOW",
            "weights": {"critical_gaps": 0.50, "high_gaps": 0.12, "avg_gap_score": 0.40},
            "target_validity": "OBSERVED_IN_SIMULATION",
        },
        "anti_leakage": {
            "features_at_t_only": True,
            "forbidden_in_X": ["gap_next_3m", "target_observation_date", "current_level_t+3", "niveaux M+3"],
        },
        "split": {
            "type": "temporal_by_month",
            "test_months": [str(m) for m in kw["test_months"]],
            "calibration_months": [str(m) for m in kw["calib_months"]],
            "n_train_fit": int(len(kw["train_fit"])),
            "n_calib": int(len(kw["train_calib"])),
            "n_test": int(len(kw["test_frame"])),
        },
        "label_distribution": {k: int(v) for k, v in kw["label_counts"].items()},
        "candidates": kw["candidates_report"],
        "baseline_persistence_macro_f1": kw.get("baseline_f1"),
        "selected_candidate": kw["best_name"],

        "decision": kw["decision"],
        "acceptance_thresholds": {"brier_max": BRIER_MAX, "macro_f1_min": MACRO_F1_MIN},
        "metrics": metrics[kw["best_name"]],
        "calibration": {
            "method": "isotonic_on_CRITICAL",
            "brier_critical": round(kw["brier_final"], 4),
            "curve_10_bins": kw["curve"],
        },
        "monotonicity": kw["mono"],
        "explainability": {
            "method": kw["expl_method"],
            "global_importance": kw["importances"],
            "directional_alignment_with_heuristic": kw["aligned"],
        },
        "feature_ranges": kw["serving_ranges"],
        "data_origin": "SIMULATED",
        "validation_scope": "SIMULATION_VALIDATED",
        "notes": "Modele de risque SIMULATION_VALIDATED (cibles M+3 observees). Repli heuristique 0.50/0.12/0.40 conserve (fail-closed). Aucun badge ML sans modele servi.",
    }


def _serving_feature_ranges(df: pd.DataFrame) -> dict[str, dict[str, float]]:
    """Plages de serving par feature : quantiles 0.001/0.999 du corpus de simulation,
    unions avec l'etendue observee du corpus de demonstration pour les features
    comportementales, bornes structurelles (comptes >= 0, ratios dans [0, 1])."""
    import math
    demo_path = DATA_CLEAN / "training_corpus_from_db.csv"
    demo = pd.read_csv(demo_path) if demo_path.exists() else None
    demo_cols = {
        "attendance_rate": "taux_assiduite",
        "stagnation_months": "months_since_last_training",
        "nb_formations_completed": "nb_formations_completed",
        "nb_besoins_exprimes": "nb_besoins_exprimes",
        "nb_besoins_approuves": "nb_besoins_approuves",
        "avg_eval_score": "avg_eval_score",
        "nb_evaluations": "nb_evaluations",
    }
    bounds = {
        "avg_gap_score": (0.0, 1.0), "max_gap_score": (0.0, 1.0),
        "critical_ratio": (0.0, 1.0), "has_critical": (0.0, 1.0),
        "trend_gap_direction": (-1.0, 1.0), "attendance_rate": (0.0, 1.0),
    }
    ranges = {}
    for feat in RISK_FEATURES:
        if feat in demo_cols and demo is not None and demo_cols[feat] in demo.columns:
            series = pd.to_numeric(demo[demo_cols[feat]], errors="coerce").dropna()
        elif feat in df.columns:
            series = pd.to_numeric(df[feat], errors="coerce").dropna()
        else:
            series = pd.Series(dtype=float)
        if series.empty:
            lo, hi = bounds.get(feat, (0.0, 1.0))
        else:
            lo = float(series.quantile(0.001))
            hi = float(series.quantile(0.999))
            if feat in bounds:
                lo = min(lo, bounds[feat][0])
                hi = max(hi, bounds[feat][1])
            elif feat.startswith(("n_gaps", "nb_", "stagnation")):
                lo = min(lo, 0.0)
        ranges[feat] = {"min": math.floor(lo * 1e6) / 1e6, "max": math.ceil(hi * 1e6) / 1e6}
    return ranges


if __name__ == "__main__":
    raise SystemExit(main())







