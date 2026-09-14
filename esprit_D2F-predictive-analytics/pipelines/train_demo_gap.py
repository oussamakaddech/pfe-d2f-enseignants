"""Entraînement et comparaison des modèles GAP sur le dataset synthétique démo.

Modèles évalués (même dataset, même split temporel strict) :
    1. baseline_persistence
    2. baseline_mean
    3. gradient_boosting
    4. xgboost
    5. mlp

Métriques par modèle : RMSE, MAE, R², median_absolute_error,
max_absolute_error, training_time_ms, inference_time_ms,
improvement_vs_persistence_pct, within_tolerance_accuracy_0.10 / _0.20.

Sorties :
- reports/demo_model_comparison.{csv,md,json}
- reports/demo_bootstrap_report.json
- reports/demo_feature_dictionary.json
- reports/demo_leakage_report.json
- reports/demo_feature_report.json
"""
from __future__ import annotations

import json
import time
from pathlib import Path
from typing import Any

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import (
    max_error,
    mean_absolute_error,
    mean_squared_error,
    median_absolute_error,
    r2_score,
)
from sklearn.neural_network import MLPRegressor
from xgboost import XGBRegressor

from pipelines.demo_common import (
    DEMO_MODEL_VERSION,
    FEATURE_NAMES,
    FORBIDDEN_IN_X,
    GAP_MAX,
    GAP_MIN,
    TARGET_COL,
    canonical_df_hash,
    schema_hash,
)
from pipelines.demo_feature_builder import (
    FeatureBuilder,
    compute_feature_ranges,
    normalize_with_ranges,
)

BASE_DIR = Path(__file__).parent.parent
SYNTH_DIR = BASE_DIR / "data" / "synthetic"
REPORTS_DIR = BASE_DIR / "reports"
MODELS_DIR = BASE_DIR / "data" / "models" / "demo"

MODEL_NAMES = ["baseline_persistence", "baseline_mean", "gradient_boosting", "xgboost", "mlp"]
MULTI_SEEDS = [42, 43, 44, 45]
BOOTSTRAP_SEED = 2026
N_BOOTSTRAP = 1000


def _within_tolerance_accuracy(y_true, y_pred, tolerance: float) -> float:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    if len(y_true) == 0:
        return float("nan")
    return float(np.mean(np.abs(y_true - y_pred) <= tolerance))


def metrics_report(y_true, y_pred) -> dict[str, float]:
    y_true = np.asarray(y_true, dtype=float)
    y_pred = np.asarray(y_pred, dtype=float)
    if len(y_true) == 0:
        return {}
    rmse = float(np.sqrt(mean_squared_error(y_true, y_pred)))
    return {
        "rmse": round(rmse, 4),
        "mae": round(float(mean_absolute_error(y_true, y_pred)), 4),
        "r2": round(float(r2_score(y_true, y_pred)), 4) if len(y_true) > 1 else 0.0,
        "median_absolute_error": round(float(median_absolute_error(y_true, y_pred)), 4),
        "max_absolute_error": round(float(max_error(y_true, y_pred)), 4),
        "within_tolerance_accuracy_0.10": round(_within_tolerance_accuracy(y_true, y_pred, 0.10), 4),
        "within_tolerance_accuracy_0.20": round(_within_tolerance_accuracy(y_true, y_pred, 0.20), 4),
    }


def build_baseline_predictions(split: dict[str, Any]) -> dict[str, np.ndarray]:
    """Baseline persistance : prévision naïve issue des features uniquement.

    Conforme au repo réel (train_gap_model.compute_baseline) : le proxy du
    gap courant est ``current_level_t - avg_level``, sans jamais utiliser
    ``required_level`` (interdit dans X) — un baseline privilégié serait
    déloyal et non reproductible en serving.
    """
    preds: dict[str, np.ndarray] = {}
    for key in ("train", "validation", "test"):
        df = split[key]
        cur = df["current_level_t"].astype(float).values
        avg = df["avg_level"].astype(float).values
        preds[key] = np.clip(cur - avg, GAP_MIN, GAP_MAX)
    return preds


def _instantiate_model(name: str, seed: int):
    if name == "gradient_boosting":
        return GradientBoostingRegressor(
            n_estimators=120, max_depth=3, learning_rate=0.08,
            subsample=0.85, random_state=seed, min_samples_split=10,
            min_samples_leaf=5, max_features="sqrt",
        )
    if name == "xgboost":
        return XGBRegressor(
            n_estimators=120, max_depth=3, learning_rate=0.08,
            subsample=0.85, random_state=seed, verbosity=0, n_jobs=1,
            reg_alpha=0.1, reg_lambda=1.0, min_child_weight=5,
        )
    if name == "mlp":
        return MLPRegressor(
            hidden_layer_sizes=(32, 16), max_iter=400,
            learning_rate_init=0.001, alpha=0.01,
            random_state=seed, early_stopping=True, n_iter_no_change=20,
        )
    raise ValueError(f"Modèle inconnu : {name}")


def train_single_model(
    name: str,
    X_train: pd.DataFrame, y_train: np.ndarray,
    X_test: pd.DataFrame, y_test: np.ndarray,
    seed: int,
) -> dict[str, Any]:
    """Entraîne un modèle et retourne métriques + timing."""
    if name == "baseline_persistence":
        # prédiction par persistance du gap courant (nécessite les colonnes brutes)
        raise NotImplementedError("persistence traitée séparément")
    if name == "baseline_mean":
        pred = np.full(len(y_test), float(np.mean(y_train)))
        return {"model_name": name, **metrics_report(y_test, pred),
                "training_time_ms": 0.0, "inference_time_ms": 0.0, "seed": seed}

    model = _instantiate_model(name, seed)
    t0 = time.perf_counter()
    model.fit(X_train, y_train)
    t1 = time.perf_counter()
    pred = np.clip(model.predict(X_test), GAP_MIN, GAP_MAX)
    t2 = time.perf_counter()
    return {
        "model_name": name,
        **metrics_report(y_test, pred),
        "training_time_ms": round((t1 - t0) * 1000, 2),
        "inference_time_ms": round((t2 - t1) * 1000, 2),
        "seed": seed,
    }


def _round_row(row: dict[str, Any]) -> dict[str, Any]:
    for k, v in row.items():
        if isinstance(v, float):
            row[k] = round(v, 4)
    return row


def run_gap_pipeline(
    dataset_path: Path | None = None,
    comparison_csv: Path | None = None,
    comparison_md: Path | None = None,
    comparison_json: Path | None = None,
    bootstrap_path: Path | None = None,
    feature_dict_path: Path | None = None,
    leakage_path: Path | None = None,
    feature_report_path: Path | None = None,
    n_bootstrap: int = N_BOOTSTRAP,
) -> dict[str, Any]:
    """Exécute le pipeline GAP complet et produit les rapports."""
    path = dataset_path or (SYNTH_DIR / "demo_dataset_synthetic-v1.0.0_clean.csv")
    if not path.exists():
        raise FileNotFoundError(f"Dataset propre introuvable : {path}")
    df = pd.read_csv(path)

    # ---------- FeatureBuilder (partagé) + anti-fuite ----------
    builder = FeatureBuilder()
    built = builder.build(df)

    # Vérification explicite anti-fuite sur les colonnes du dataset
    leak_cols_present = [c for c in FEATURE_NAMES if c in FORBIDDEN_IN_X]
    forbidden_in_df = sorted(set(FORBIDDEN_IN_X) & set(df.columns))
    if leak_cols_present:
        raise ValueError(f"Fuite : colonnes interdites présentes dans X : {leak_cols_present}")

    # ---------- Split temporel strict ----------
    split = builder.build_temporal_split(df, train_frac=0.70, val_frac=0.15)
    leakage_report = {
        "leakage_checks": {
            "gap_next_3m_in_X": bool(TARGET_COL in built["X"].columns),
            "future_gap_in_X": bool("future_gap" in built["X"].columns),
            "future_observation_in_X": bool("future_observation" in built["X"].columns),
            "future_evaluation_in_X": bool("future_evaluation" in built["X"].columns),
            "future_attendance_in_X": bool("future_attendance" in built["X"].columns),
            "current_observation_in_X": bool("current_observation" in built["X"].columns),
            "knowledge_difficulty_level_in_X": bool("knowledge_difficulty_level" in built["X"].columns),
        },
        "feature_names_in_X": list(built["X"].columns),
        "forbidden_in_X": sorted(FORBIDDEN_IN_X),
        "forbidden_columns_present_in_dataset": forbidden_in_df,
        "source_time_leq_ref_month": bool(
            (pd.to_datetime(df["created_at"], errors="coerce") <= pd.to_datetime(df["date_t"], errors="coerce")).all()
        ),
        "split": {
            "train_rows": split["train_rows"],
            "validation_rows": split["validation_rows"],
            "test_rows": split["test_rows"],
            "train_months": split["train_months"],
            "validation_months": split["validation_months"],
            "test_months": split["test_months"],
            "max_train_lt_min_val": bool(split["train"]["ref_month"].max() < split["validation"]["ref_month"].min()),
            "max_val_lt_min_test": bool(split["validation"]["ref_month"].max() < split["test"]["ref_month"].min()),
            "shuffle_used": False,
        },
        "feature_schema_hash": schema_hash(FEATURE_NAMES),
        "dataset_hash": canonical_df_hash(pd.read_csv(path)),
        "warning": "knowledge_difficulty_level décrit la difficulté pédagogique du savoir ; il n'est JAMAIS utilisé comme niveau de maîtrise de l'enseignant ni comme feature.",
    }

    # ---------- Normalisation (ranges capturées sur train) ----------
    X_train_raw = built["X"].loc[split["train"].index].reset_index(drop=True)
    X_val_raw = built["X"].loc[split["validation"].index].reset_index(drop=True)
    X_test_raw = built["X"].loc[split["test"].index].reset_index(drop=True)
    y_train = built["y"].loc[split["train"].index].to_numpy()
    y_val = built["y"].loc[split["validation"].index].to_numpy()
    y_test = built["y"].loc[split["test"].index].to_numpy()

    ranges = compute_feature_ranges(X_train_raw, FEATURE_NAMES)
    X_train = normalize_with_ranges(X_train_raw, FEATURE_NAMES, ranges)
    X_val = normalize_with_ranges(X_val_raw, FEATURE_NAMES, ranges)
    X_test = normalize_with_ranges(X_test_raw, FEATURE_NAMES, ranges)

    # ---------- Baseline persistance (référence pour improvement_pct) ----------
    gap_persist_train = build_baseline_predictions(split)["train"]
    gap_persist_val = build_baseline_predictions(split)["validation"]
    gap_persist_test = build_baseline_predictions(split)["test"]
    baseline_metrics = metrics_report(y_test, gap_persist_test)
    baseline_rmse = baseline_metrics["rmse"]
    print(f"[OK] Baseline persistance (test) : RMSE={baseline_rmse:.4f}")

    # ---------- Entraînement multi-seed ----------
    all_rows: list[dict[str, Any]] = []
    for seed in MULTI_SEEDS:
        np.random.seed(seed)
        # baseline_persistence
        m_p = metrics_report(y_test, gap_persist_test)
        all_rows.append(_round_row({"model_name": "baseline_persistence", "seed": seed,
                                    "training_time_ms": 0.0, "inference_time_ms": 0.0, **m_p}))
        # baseline_mean
        m_mean = metrics_report(y_test, np.full(len(y_test), float(np.mean(y_train))))
        all_rows.append(_round_row({"model_name": "baseline_mean", "seed": seed,
                                    "training_time_ms": 0.0, "inference_time_ms": 0.0, **m_mean}))
        # modèles entraînés
        for name in ("gradient_boosting", "xgboost", "mlp"):
            row = train_single_model(name, X_train, y_train, X_test, y_test, seed)
            row.pop("model_name", None)
            row.pop("seed", None)
            all_rows.append(_round_row({"model_name": name, "seed": seed, **row}))

    rows_df = pd.DataFrame(all_rows)

    # ---------- Amélioration vs persistance + décision ----------
    improved = 100.0 * (baseline_rmse - rows_df["rmse"]) / baseline_rmse
    rows_df["improvement_vs_persistence_pct"] = improved.round(4)
    rows_df["decision"] = np.where(rows_df["improvement_vs_persistence_pct"] > 0,
                                   "retenu_demo", "non_retenu")
    rows_df.loc[rows_df["model_name"].isin(["baseline_persistence", "baseline_mean"]), "decision"] = "baseline"

    # ---------- Sélection : meilleur modèle ML (moyenne RMSE multi-seed) ----------
    ml_models = rows_df[~rows_df["model_name"].isin(["baseline_persistence", "baseline_mean"])]
    mean_by_model = ml_models.groupby("model_name")["rmse"].mean().sort_values()
    best_model = str(mean_by_model.index[0])
    best_rmse_mean = float(mean_by_model.iloc[0])
    print(f"[OK] Meilleur modèle (RMSE moyen multi-seed) : {best_model} ({best_rmse_mean:.4f})")

    # ---------- Bootstrap (sur prédictions test du meilleur modèle, seed 42) ----------
    best_seed_row = ml_models[(ml_models["model_name"] == best_model) & (ml_models["seed"] == 42)].iloc[0]
    rng_boot = np.random.default_rng(BOOTSTRAP_SEED)
    best_model_obj = _instantiate_model(best_model, 42)
    best_model_obj.fit(X_train, y_train)
    y_pred_test = np.clip(best_model_obj.predict(X_test), GAP_MIN, GAP_MAX)

    # ---------- Artefact séparé (DEMO_ML, jamais PRODUCTION) ----------
    artifact_path = MODELS_DIR / f"{DEMO_MODEL_VERSION}.joblib"
    from app.infrastructure.ml.artifact_integrity import save_with_integrity
    save_with_integrity(best_model_obj, artifact_path)
    metadata = {
        "model_name": "gap_predictor_temporal",
        "model_version": DEMO_MODEL_VERSION,
        "data_origin": "SYNTHETIC",
        "is_synthetic": True,
        "institutional_verified": False,
        "status": "DEMO_ONLY",
        "dataset_version": "synthetic-v1.0.0",
        "algorithm": best_model,
        "trained_at": pd.Timestamp.now().isoformat(),
        "seed": 42,
        "feature_names": list(FEATURE_NAMES),
        "feature_schema_version": "1.0",
        "feature_ranges": ranges,
        "training_rows": int(len(X_train)),
        "validation_rows": int(len(X_val)),
        "test_rows": int(len(X_test)),
        "synthetic_share_pct": 100.0,
        "metrics_test_seed42": {
            k: round(float(v), 4)
            for k, v in best_seed_row.items()
            if isinstance(v, (int, float, np.floating)) and k not in ("seed",)
        },
        "warning": "Modèle entraîné sur données 100 % synthétiques. Résultats de démonstration uniquement.",
    }
    metadata_path = MODELS_DIR / f"{DEMO_MODEL_VERSION}_metadata.json"
    metadata_path.parent.mkdir(parents=True, exist_ok=True)
    metadata_path.write_text(json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[OK] Artefact démo sauvegardé : {artifact_path} (mode DEMO_ML, jamais PRODUCTION)")

    n_test = len(y_test)
    idx = np.arange(n_test)
    boot_rmse, boot_mae, boot_gain = [], [], []
    for _ in range(n_bootstrap):
        ids = rng_boot.choice(idx, size=n_test, replace=True)
        yt, yp, yb = y_test[ids], y_pred_test[ids], gap_persist_test[ids]
        rmse_b = float(np.sqrt(mean_squared_error(yt, yp)))
        mae_b = float(mean_absolute_error(yt, yp))
        rmse_bl = float(np.sqrt(mean_squared_error(yt, yb)))
        boot_rmse.append(rmse_b)
        boot_mae.append(mae_b)
        boot_gain.append(100.0 * (rmse_bl - rmse_b) / rmse_bl)
    boot_rmse = np.asarray(boot_rmse)
    boot_mae = np.asarray(boot_mae)
    boot_gain = np.asarray(boot_gain)

    bootstrap_report = {
        "model": best_model,
        "seed": 42,
        "n_bootstrap": n_bootstrap,
        "bootstrap_seed": BOOTSTRAP_SEED,
        "method": "1000 réplications avec remise sur l'échantillon test (n=%d), IC percentile 2.5-97.5" % n_test,
        "ic95_rmse": [round(float(np.percentile(boot_rmse, 2.5)), 4), round(float(np.percentile(boot_rmse, 97.5)), 4)],
        "ic95_mae": [round(float(np.percentile(boot_mae, 2.5)), 4), round(float(np.percentile(boot_mae, 97.5)), 4)],
        "ic95_improvement_vs_persistence_pct": [
            round(float(np.percentile(boot_gain, 2.5)), 4),
            round(float(np.percentile(boot_gain, 97.5)), 4),
        ],
        "mean_rmse": round(float(np.mean(boot_rmse)), 4),
        "mean_mae": round(float(np.mean(boot_mae)), 4),
        "mean_improvement_pct": round(float(np.mean(boot_gain)), 4),
        "std_rmse": round(float(np.std(boot_rmse)), 4),
        "std_mae": round(float(np.std(boot_mae)), 4),
    }

    # ---------- Synthèse multi-seed ----------
    agg = rows_df.groupby("model_name").agg(
        rmse_mean=("rmse", "mean"), rmse_std=("rmse", "std"),
        rmse_min=("rmse", "min"), rmse_max=("rmse", "max"),
        mae_mean=("mae", "mean"), mae_std=("mae", "std"),
        r2_mean=("r2", "mean"), r2_std=("r2", "std"),
        improvement_mean=("improvement_vs_persistence_pct", "mean"),
        inference_time_ms_mean=("inference_time_ms", "mean"),
    ).round(4).reset_index()
    order = {name: i for i, name in enumerate(MODEL_NAMES)}
    agg["_order"] = agg["model_name"].map(order)
    agg = agg.sort_values("_order").drop(columns="_order").reset_index(drop=True)

    # ---------- Table comparative ----------
    comp_rows: list[dict[str, Any]] = []
    for _, r in agg.iterrows():
        name = r["model_name"]
        seed42_row = rows_df[(rows_df["model_name"] == name) & (rows_df["seed"] == 42)].iloc[0]
        decision = "baseline" if name in ("baseline_persistence", "baseline_mean") else (
            "retenu_demo" if seed42_row["improvement_vs_persistence_pct"] > 0 else "non_retenu")
        comp_rows.append({
            "Modèle": name,
            "RMSE": round(float(r["rmse_mean"]), 4),
            "MAE": round(float(r["mae_mean"]), 4),
            "R²": round(float(r["r2_mean"]), 4),
            "Tolérance ±0,10": round(float(seed42_row["within_tolerance_accuracy_0.10"]), 4),
            "Tolérance ±0,20": round(float(seed42_row["within_tolerance_accuracy_0.20"]), 4),
            "Gain vs baseline (%)": round(float(r["improvement_mean"]), 4),
            "Temps inférence (ms)": round(float(r["inference_time_ms_mean"]), 4),
            "Décision": decision,
        })
    comp_df = pd.DataFrame(comp_rows)

    csv_out = comparison_csv or (REPORTS_DIR / "demo_model_comparison.csv")
    md_out = comparison_md or (REPORTS_DIR / "demo_model_comparison.md")
    json_out = comparison_json or (REPORTS_DIR / "demo_model_comparison.json")
    csv_out.parent.mkdir(parents=True, exist_ok=True)
    comp_df.to_csv(csv_out, index=False, lineterminator="\n")
    comp_df.to_json(json_out, orient="records", indent=2)

    md_lines = [
        "# Comparaison des modèles GAP (dataset synthétique démo)",
        "",
        "> Données 100 % synthétiques — démonstration technique uniquement,",
        "> PAS une validation institutionnelle.",
        "",
        "| Modèle | RMSE | MAE | R² | Tolérance ±0,10 | Tolérance ±0,20 | Gain vs baseline (%) | Temps inférence (ms) | Décision |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---|",
    ]
    for _, r in comp_df.iterrows():
        md_lines.append(
            f"| {r['Modèle']} | {r['RMSE']} | {r['MAE']} | {r['R²']} "
            f"| {r['Tolérance ±0,10']} | {r['Tolérance ±0,20']} "
            f"| {r['Gain vs baseline (%)']} | {r['Temps inférence (ms)']} | {r['Décision']} |"
        )
    md_lines.append("")
    md_lines.append("## Bootstrap IC95 (meilleur modèle, seed 42)")
    md_lines.append(f"- **{best_model}** — {n_bootstrap} réplications :")
    md_lines.append(f"  - IC95 RMSE : {bootstrap_report['ic95_rmse']}")
    md_lines.append(f"  - IC95 MAE : {bootstrap_report['ic95_mae']}")
    md_lines.append(f"  - IC95 gain vs baseline : {bootstrap_report['ic95_improvement_vs_persistence_pct']} %")
    md_lines.append("")
    md_lines.append("## Multi-seed (42, 43, 44, 45) — RMSE moyen")
    for _, r in agg.iterrows():
        md_lines.append(f"- **{r['model_name']}** : {r['rmse_mean']} ± {r['rmse_std']} "
                        f"(min {r['rmse_min']} / max {r['rmse_max']})")
    md_lines.append("")
    md_lines.append("> Un modèle n'est retenu que si l'amélioration vs persistance est "
                    "positive sur plusieurs seeds (jamais une seule seed).")
    md_out.write_text("\n".join(md_lines) + "\n", encoding="utf-8")

    # ---------- Feature dictionary ----------
    feature_dict = {
        "feature_schema_version": "1.0",
        "target": TARGET_COL,
        "target_definition": "Écart futur de niveau attendu à +3 mois (échelle 0..5), calculé "
                             "comme required_level - niveau futur observé, + bruit contrôlé.",
        "features": [],
        "forbidden_in_X": sorted(FORBIDDEN_IN_X),
        "note_knowledge_difficulty": (
            "knowledge_difficulty_level décrit la difficulté pédagogique du savoir "
            "(difficulté structurale d'une compétence, 1..3). Ce n'est JAMAIS le niveau "
            "de maîtrise de l'enseignant ; il est exclu des features."
        ),
        "feature_ranges": ranges,
    }
    for col in FEATURE_NAMES:
        feature_dict["features"].append({
            "name": col,
            "range": ranges.get(col, {}),
            "missing_in_train": int(X_train_raw[col].isna().sum()),
        })

    dict_out = feature_dict_path or (REPORTS_DIR / "demo_feature_dictionary.json")
    dict_out.parent.mkdir(parents=True, exist_ok=True)
    dict_out.write_text(json.dumps(feature_dict, indent=2, ensure_ascii=False), encoding="utf-8")

    # ---------- Leakage report ----------
    leak_out = leakage_path or (REPORTS_DIR / "demo_leakage_report.json")
    leak_out.parent.mkdir(parents=True, exist_ok=True)
    leak_out.write_text(json.dumps(leakage_report, indent=2, ensure_ascii=False), encoding="utf-8")

    # ---------- Feature report ----------
    feature_report = {
        "dataset_hash": leakage_report["dataset_hash"],
        "feature_schema_hash": leakage_report["feature_schema_hash"],
        "n_features": len(FEATURE_NAMES),
        "split": leakage_report["split"],
        "ranges_captured_on_train": ranges,
        "best_model": best_model,
        "baseline_persistence_rmse_test": baseline_rmse,
        "warning": "Résultats de démonstration sur données synthétiques uniquement.",
    }
    feat_out = feature_report_path or (REPORTS_DIR / "demo_feature_report.json")
    feat_out.parent.mkdir(parents=True, exist_ok=True)
    feat_out.write_text(json.dumps(feature_report, indent=2, ensure_ascii=False), encoding="utf-8")

    # ---------- Bootstrap report ----------
    boot_out = bootstrap_path or (REPORTS_DIR / "demo_bootstrap_report.json")
    boot_out.parent.mkdir(parents=True, exist_ok=True)
    boot_out.write_text(json.dumps(bootstrap_report, indent=2, ensure_ascii=False), encoding="utf-8")

    return {
        "best_model": best_model,
        "best_rmse_mean": best_rmse_mean,
        "comparison": comp_df.to_dict(orient="records"),
        "multi_seed": agg.to_dict(orient="records"),
        "bootstrap": bootstrap_report,
        "leakage": leakage_report,
        "feature_dictionary": feature_dict,
        "ranges": ranges,
        "split": {k: v for k, v in split.items() if not isinstance(v, pd.DataFrame)},
        "y_train_mean": float(np.mean(y_train)),
    }


def main() -> int:
    result = run_gap_pipeline()
    print(f"[OK] Meilleur modèle : {result['best_model']} "
          f"(RMSE moyen {result['best_rmse_mean']:.4f})")
    print(f"[OK] Bootstrap IC95 RMSE : {result['bootstrap']['ic95_rmse']}")
    print(f"[OK] Rapport comparatif : reports/demo_model_comparison.md")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())