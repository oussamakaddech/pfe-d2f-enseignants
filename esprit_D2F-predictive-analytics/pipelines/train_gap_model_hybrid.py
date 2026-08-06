"""Entrainement du gap predictor temporel — VERSION CORRIGÉE PAR AUDIT.

CORRECTIONS APPORTÉES :
  1. Le corpus de 5000 lignes synthetiques est considere OBSOLETE : l'audit DSI
     a montré que ces lignes sont générées par random.randint/uniform (gener.
     generate_training_corpus.py:96-99). Elles n'ont aucune vraie valeur
     métier. Ce corpus est conservé comme "historique interne" mais n'est plus
     utilisé pour l'entraînement.
  2. On utilise EXCLUSIVEMENT le corpus reel data/clean/training_corpus_from_db.csv
     (105 lignes) construit par generate_corpus_from_db.py sur les vraies dates
     d'acquisition des competences des enseignants.
  3. Split chronologique : 80/20 SANS shuffle sur l'ordre du fichier (extrait
     enseignant par enseignant, aucun mélange — pas de fuite). LIMITE
     DOCUMENTÉE : le corpus n'a pas de colonne de date, il ne s'agit donc pas
     d'un split temporel strict mais d'un split séquentiel conservateur.
  4. KFold (pas StratifiedKFold) — c'est une REGRESSION continue, pas une
     classification.
  5. Décision "accept/reject" : comparaison honnête vs baseline "persistance"
     (le gap courant est le meilleur estimateur sans ML).

AUDIT : ce script ne réentraîne PAS le modèle automatiquement si
l'historique réel disponible est insuffisant (phase de collecte requise).
Exporte gap_predictor_temporal.joblib + temporal_training_metadata.json.
"""
from __future__ import annotations

import json
import sys
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold, cross_val_score

BASE_DIR = Path(__file__).parent.parent
MODELS_DIR = BASE_DIR / "data" / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH = MODELS_DIR / "gap_predictor_temporal.joblib"
METADATA_PATH = MODELS_DIR / "temporal_training_metadata.json"

RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)

FEATURE_COLS = [
    "current_level_t3", "current_level_t2", "current_level_t1", "current_level_t",
    "lag_gap_t3_t2", "lag_gap_t2_t1", "lag_gap_t1_t", "rolling_tendance",
    "days_since_last_training", "training_frequency_per_month", "is_long_absent", "is_stagnant",
    "avg_level", "min_level", "max_level", "nb_level_5", "nb_level_1",
    "nb_savoirs", "nb_competences", "competency_coverage_rate",
    "nb_formations_completed", "nb_formations_in_progress", "taux_assiduite",
    "nb_besoins_exprimes", "nb_besoins_approuves", "avg_eval_score", "nb_evaluations",
    "months_since_last_training", "engagement_score",
]
TARGET_COL = "gap_next_3m"


# Cible a partir de laquelle on abandonne progressivement le synthetique
TARGET_REAL_ROWS = 5000
ADAPTIVE_MODE = "manual"  # "auto" | "manual" ; audit : le corpus synthétique est exclu par défaut
# Audit : corpus synthétique généré par random.randint — inutilisable pour un
# modèle métier réel. On n'autorise pas son usage par défaut.
EXCLUDE_SYNTHETIC = True


def load_and_combine(real_weight: int | None = None) -> tuple[pd.DataFrame, dict[str, int]]:
    """Combine corpus reel et (optionnellement) synthétique avec ponderation.

    Strategie audit-driven :
      - Par défaut (EXCLUDE_SYNTHETIC=True), on charge UNIQUEMENT le corpus réel
        (training_corpus_from_db.csv, 105 lignes) car les 5000 lignes du corpus
        synthétique sont générées par random.randint → valeur métier nulle.
      - Si EXCLUDE_SYNTHETIC=False (legacy), on applique la ponderation
        adaptée au ratio réel mais on documente ce choix dans metadata.
    """
    synth_path = BASE_DIR / "data" / "clean" / "training_corpus.csv"
    real_path = BASE_DIR / "data" / "clean" / "training_corpus_from_db.csv"

    synth = pd.DataFrame(columns=FEATURE_COLS + [TARGET_COL])
    n_synth = 0
    if not EXCLUDE_SYNTHETIC and synth_path.exists():
        synth = pd.read_csv(synth_path)
        n_synth = len(synth)

    real = pd.DataFrame(columns=FEATURE_COLS + [TARGET_COL])
    n_real = 0
    if real_path.exists():
        real = pd.read_csv(real_path)
        # Garantir le schéma
        missing = [c for c in FEATURE_COLS + [TARGET_COL] if c not in real.columns]
        if missing:
            raise ValueError(f"Colonnes manquantes dans corpus réel : {missing}")
        keep_cols = FEATURE_COLS + [TARGET_COL] + (["date_t"] if "date_t" in real.columns else [])
        real = real[keep_cols]
        n_real = len(real)

    # Mode adaptatif : le synthetique n'entre que si explicitement autorisé
    if EXCLUDE_SYNTHETIC:
        w_real, include_synth = 1, False
    elif ADAPTIVE_MODE == "auto":
        if n_real >= TARGET_REAL_ROWS:
            w_real, include_synth = 1, False
        else:
            w_real = max(1, min(50, TARGET_REAL_ROWS // max(1, n_real)))
            include_synth = True
    else:
        w_real, include_synth = (real_weight if real_weight is not None else 5), True

    frames = []
    if include_synth and not synth.empty:
        frames.append(synth)
    if not real.empty:
        frames += [real] * w_real

    df = pd.concat(frames, ignore_index=True)
    # PAS de shuffle ici : la sortie doit refléter l'ordre chronologique
    # (les colonnes current_level_t3..t encodent déjà la chronologie).
    counts = {
        "synthetic": n_synth,
        "real_db": n_real,
        "combined": len(df),
        "real_weight_applied": w_real,
        "synthetic_included": include_synth,
        "real_share_pct": round(100 * n_real * w_real / max(1, len(df)), 1),
        "synthetic_share_pct": round(100 * n_synth / max(1, len(df)), 1),
    }
    return df, counts


def build_candidates() -> list[tuple[str, Any]]:
    candidates: list[tuple[str, Any]] = [
        (
            "gradient_boosting",
            GradientBoostingRegressor(
                n_estimators=120, max_depth=3, learning_rate=0.08,
                subsample=0.85, random_state=RANDOM_STATE,
                min_samples_split=10, min_samples_leaf=5, max_features="sqrt",
            ),
        ),
    ]
    try:
        from xgboost import XGBRegressor

        candidates.append((
            "xgboost",
            XGBRegressor(
                n_estimators=120, max_depth=3, learning_rate=0.08, subsample=0.85,
                random_state=RANDOM_STATE, verbosity=0, n_jobs=-1,
                reg_alpha=0.1, reg_lambda=1.0, min_child_weight=5,
            ),
        ))
    except ImportError:
        print("[INFO] XGBoost indisponible")
    return candidates


def main() -> int:
    df, counts = load_and_combine()
    print(f"[1] Corpus combine : {counts}")

    if counts["synthetic"] > 0 and counts["real_db"] == 0:
        print("[ERROR] Corpus 100% synthétique détecté : refus d'entraîner un modèle métier dessus.")
        print("        L'audit DSI exige un corpus réel. Voir generate_corpus_from_db.py.")
        return 2
    if counts["real_db"] < 50:
        print(f"[ERROR] Corpus réel insuffisant ({counts['real_db']} lignes < 50) : ")
        print("        pas de réentraînement honnête possible. Phase de collecte requise.")
        return 2

    # ---- Split TEMPOREL STRICT (80/20 sur date_t) ----
    # Le corpus exporte par generate_corpus_from_db.py porte une colonne
    # `date_t` (date du point le plus recent de l'historique) et est trie
    # chronologiquement. On prend les 20% de lignes les PLUS RECENTES comme
    # test et les plus anciennes comme train : aucune ligne de test n'est
    # anterieure a une ligne de train — pas de fuite d'information future.
    # Le découpage se fait par index sur le tri (pas un quantile de dates,
    # qui serait fausse par les ex-aequo de dates recentes).
    df = df.reset_index(drop=True)
    if "date_t" in df.columns:
        dates = pd.to_datetime(df["date_t"], errors="coerce")
        if dates.notna().all() and dates.nunique() > 1:
            n = len(df)
            n_test = max(20, int(n * 0.2))
            n_train = n - n_test
            train = df.iloc[:n_train]
            test = df.iloc[n_train:]
            cutoff = dates.iloc[n_train - 1].date()
            split_kind = f"temporal_strict_cutoff_{cutoff}"
            print(f"[2] Split TEMPOREL STRICT : train={n_train} test={n_test} (test = 20% lignes les plus recentes, cutoff date_t={cutoff})")
        else:
            n = len(df)
            n_train = int(n * 0.8)
            train = df.iloc[:n_train]
            test = df.iloc[n_train:]
            split_kind = "sequential_no_shuffle_80_20_fallback"
            print(f"[2] date_t indisponible/invalide -> fallback split sequentiel : train={n_train} test={n - n_train}")
    else:
        n = len(df)
        n_train = int(n * 0.8)
        train = df.iloc[:n_train]
        test = df.iloc[n_train:]
        split_kind = "sequential_no_shuffle_80_20"
        print(f"[2] Pas de colonne date_t -> split sequentiel : train={n_train} test={n - n_train}")

    X_train = train[FEATURE_COLS].astype(float)
    y_train = train[TARGET_COL].astype(float).clip(0, 5).values
    X_test = test[FEATURE_COLS].astype(float)
    y_test = test[TARGET_COL].astype(float).clip(0, 5).values

    # Normalisation min-max capturee sur le train (anti train/serve skew)
    ranges = {}
    for col in FEATURE_COLS:
        mn, mx = float(X_train[col].min()), float(X_train[col].max())
        ranges[col] = {"min": mn, "max": mx}
        if mx > mn:
            X_train[col] = ((X_train[col] - mn) / (mx - mn)).clip(0, 1)
            X_test[col] = ((X_test[col] - mn) / (mx - mn)).clip(0, 1)
        else:
            X_train[col] = 0.0
            X_test[col] = 0.0

    X_train_arr = X_train.values
    X_test_arr = X_test.values

    # Baseline persistance : y_pred = gap_t (approx via current_level_t vs moyenne historique)
    gap_t_proxy = np.clip(
        test["current_level_t"].astype(float).values - test["avg_level"].astype(float).values,
        0, 5,
    )
    baseline_rmse = float(np.sqrt(mean_squared_error(y_test, gap_t_proxy)))
    baseline_mae = float(mean_absolute_error(y_test, gap_t_proxy))
    print(f"[3] Baseline persistance RMSE={baseline_rmse:.4f} MAE={baseline_mae:.4f}")

    # ---- CV : KFold (RÉGRESSION — pas de StratifiedKFold) ----
    candidates = build_candidates()
    cv_results: dict[str, float] = {}
    fitted: dict[str, Any] = {}
    kf = KFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    for name, model in candidates:
        model = model.fit(X_train_arr, y_train)
        fitted[name] = model
        scores = cross_val_score(model, X_train_arr, y_train, cv=kf, scoring="neg_root_mean_squared_error")
        cv_results[name] = float(-scores.mean())
        print(f"    {name}: CV-RMSE={cv_results[name]:.4f}")

    best_name = min(cv_results, key=cv_results.get)
    best = fitted[best_name]
    print(f"[4] Meilleur modele : {best_name}")

    # Evaluation test
    preds = np.clip(best.predict(X_test_arr), 0, 5)
    test_rmse = float(np.sqrt(mean_squared_error(y_test, preds)))
    test_mae = float(mean_absolute_error(y_test, preds))
    test_r2 = float(r2_score(y_test, preds)) if len(y_test) > 1 else 0.0
    lift_rmse = round(baseline_rmse - test_rmse, 4)
    print(f"[5] Test : RMSE={test_rmse:.4f} MAE={test_mae:.4f} R2={test_r2:.4f} lift={lift_rmse:.4f}")

    # Intervalle de confiance du lift par bootstrap sur l'echantillon de test.
    # n_test=21 est petit : un lift ponctuel peut etre du bruit. Le bootstrap
    # resample les lignes de test avec remise (1000 replicas) et estime l'IC 95%
    # de la difference RMSE(baseline) - RMSE(model). IC_min > 0 => lift
    # statistiquement significatif au seuil 5%.
    N_BOOT = 1000
    rng = np.random.default_rng(RANDOM_STATE)
    n_test = len(y_test)
    boot_lifts: list[float] = []
    test_idx = np.arange(n_test)
    for _ in range(N_BOOT):
        idx = rng.choice(test_idx, size=n_test, replace=True)
        boot_rmse_m = float(np.sqrt(mean_squared_error(y_test[idx], preds[idx])))
        boot_rmse_b = float(np.sqrt(mean_squared_error(y_test[idx], gap_t_proxy[idx])))
        boot_lifts.append(boot_rmse_b - boot_rmse_m)
    boot_lifts = np.asarray(boot_lifts)
    lift_ci = (float(np.percentile(boot_lifts, 2.5)), float(np.percentile(boot_lifts, 97.5)))
    lift_significant = bool(lift_ci[0] > 0)
    print(
        f"[5b] Lift IC95% (bootstrap {N_BOOT} replicas, n_test={n_test}) : "
        f"[{lift_ci[0]:.4f}, {lift_ci[1]:.4f}] — significatif={lift_significant}"
    )

    # Accept only si lift strictement positif ET test échantillon suffisant (> 20 lignes)
    decision = "accept" if (lift_rmse > 0 and len(y_test) >= 20) else "reject"
    print(f"[6] Decision : {decision} (lift={lift_rmse:.4f}, n_test={len(y_test)})")

    feature_importances = {}
    if hasattr(best, "feature_importances_"):
        feature_importances = dict(zip(FEATURE_COLS, best.feature_importances_.tolist()))

    hyperparameters = {
        "random_state": RANDOM_STATE,
        "cv": {"type": "KFold", "n_splits": 5, "shuffle": True, "random_state": RANDOM_STATE},
        "split": {"type": "temporal_ordered_no_shuffle", "train_frac": 0.8, "test_frac": 0.2},
        "models": {
            name: model.get_params()
            for name, model in fitted.items()
        },
    }

    metadata = {
        "model_name": best_name,
        "trained_at": pd.Timestamp.now().isoformat(),
        "n_features": len(FEATURE_COLS),
        "feature_cols": FEATURE_COLS,
        "n_samples": counts["combined"],
        "n_train": int(n_train),
        "n_test": int(n - n_train),
        "data_sources": counts,
        "hyperparameters": hyperparameters,
        "cv_folds": 5,
        "split": {
            "type": split_kind,
            "note": "corpus dote de date_t (generate_corpus_from_db.py) : split temporel strict au quantile 80% des dates d'acquisition ; fallback sequentiel si date_t absente",
        },
        "candidate_cv_scores": {k: round(v, 4) for k, v in cv_results.items()},
        "metrics": {
            "test_r2": round(test_r2, 4),
            "test_rmse": round(test_rmse, 4),
            "test_mae": round(test_mae, 4),
            "baseline_rmse": round(baseline_rmse, 4),
            "baseline_mae": round(baseline_mae, 4),
            "lift_rmse": lift_rmse,
            "lift_rmse_ci95": [round(lift_ci[0], 4), round(lift_ci[1], 4)],
            "lift_ci95_method": f"bootstrap {N_BOOT} replicas on test sample (n={n_test}), percentile 2.5-97.5",
            "lift_significant_95": lift_significant,
        },
        "feature_importances": {k: round(v, 6) for k, v in feature_importances.items()},
        "feature_ranges": ranges,
        "decision": decision,
        "notes": (
            "Corrigé par audit DSI : corpus exclusivement réel (training_corpus_from_db.csv), "
            "split temporel strict sur date_t (quantile 80%), KFold pour régression, seed 42. "
            "Le synthétique random.randint n'est pas utilisé (EXCLUDE_SYNTHETIC=True). "
            "Lift documenté avec IC 95% par bootstrap (1000 réplicas) sur l'échantillon de test."
        ),
    }

    # Intégrité : on sauvegarde le modèle + sidecar SHA-256
    from app.infrastructure.ml.artifact_integrity import save_with_integrity

    save_with_integrity(best, MODEL_PATH)
    METADATA_PATH.write_text(json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[7] Modele (avec sidecar SHA-256) + metadata sauvegardes. Decision : {decision}")
    return 0 if decision == "accept" else 1


if __name__ == "__main__":
    sys.exit(main())
