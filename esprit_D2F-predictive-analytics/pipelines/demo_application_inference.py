"""Inférence démo sur les DONNÉES DE L'APPLICATION + mesure de dérive.

Procédure :
    données application (data/clean/training_corpus_from_db.csv)
        -> même FeatureBuilder (contract 29 features)
        -> validation types/plages
        -> contrôle du schéma
        -> contrôle du domain shift (Wasserstein + stats descriptives)
        -> inférence demo (artefact demo-gap-synthetic-v1.0.0.joblib)
        -> résultat + avertissement DEMO_ML

Les données application ne sont JAMAIS mélangées au dataset d'entraînement.

Sorties :
- reports/application_inference_demo.json
- reports/domain_shift_report.json
- reports/application_inference_demo.md
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from pipelines.demo_common import DEMO_MODEL_VERSION, FEATURE_NAMES, GAP_MAX, GAP_MIN

BASE_DIR = Path(__file__).parent.parent
SYNTH_DIR = BASE_DIR / "data" / "synthetic"
REPORTS_DIR = BASE_DIR / "reports"
MODELS_DIR = BASE_DIR / "data" / "models" / "demo"
APP_CORPUS = BASE_DIR / "data" / "clean" / "training_corpus_from_db.csv"


def _wasserstein(a: np.ndarray, b: np.ndarray) -> float:
    """Distance de Wasserstein 1D (sans scipy) via tri cumulatif."""
    a = np.sort(np.asarray(a, dtype=float)[~np.isnan(a)])
    b = np.sort(np.asarray(b, dtype=float)[~np.isnan(b)])
    if len(a) == 0 or len(b) == 0:
        return float("nan")
    all_vals = np.concatenate([a, b])
    cdf_a = np.searchsorted(a, all_vals, side="right") / len(a)
    cdf_b = np.searchsorted(b, all_vals, side="right") / len(b)
    return float(np.sum(np.abs(cdf_a - cdf_b)) * (all_vals[1] - all_vals[0]) if len(all_vals) > 1 else 0.0)


def run_application_inference(
    dataset_path: Path | None = None,
    app_corpus: Path | None = None,
    json_out: Path | None = None,
    md_out: Path | None = None,
    shift_out: Path | None = None,
) -> dict:
    """Charge les données application, contrôle, prédit en DEMO_ML, mesure la dérive."""
    synth_path = dataset_path or (SYNTH_DIR / "demo_dataset_synthetic-v1.0.0_clean.csv")
    app_path = app_corpus or APP_CORPUS
    if not synth_path.exists():
        raise FileNotFoundError(f"Dataset synthétique propre introuvable : {synth_path}")
    if not app_path.exists():
        raise FileNotFoundError(f"Données application introuvables : {app_path}")

    synth = pd.read_csv(synth_path)
    app = pd.read_csv(app_path)

    # ---------- 1. Même FeatureBuilder : contrôle du schéma ----------
    missing_in_app = [c for c in FEATURE_NAMES if c not in app.columns]
    missing_in_synth = [c for c in FEATURE_NAMES if c not in synth.columns]
    schema_ok = not missing_in_app and not missing_in_synth

    # ---------- 2. Validation types/plages ----------
    type_issues: list[str] = []
    range_issues: list[str] = []
    for col in FEATURE_NAMES:
        s = pd.to_numeric(app[col], errors="coerce")
        if s.isna().any() and app[col].notna().any():
            type_issues.append(col)
        if col in ("current_level_t3", "current_level_t2", "current_level_t1", "current_level_t",
                   "avg_level", "min_level", "max_level"):
            if (s < 1.0).any() or (s > 5.0).any():
                range_issues.append(f"{col}(niv sorti 1..5)")
        if col in ("taux_assiduite",):
            if (s < 0.0).any() or (s > 1.0).any():
                range_issues.append(f"{col}(hors 0..1)")
    validation = {
        "schema_ok": bool(schema_ok),
        "missing_features_in_app": missing_in_app,
        "missing_features_in_synth": missing_in_synth,
        "type_issues": type_issues,
        "range_issues": range_issues,
        "n_app_rows": int(len(app)),
    }

    # ---------- 3. Domain shift : distributions synth vs application ----------
    shift_features = []
    for col in FEATURE_NAMES:
        a = pd.to_numeric(synth[col], errors="coerce").to_numpy()
        b = pd.to_numeric(app[col], errors="coerce").to_numpy()
        shift_features.append({
            "feature": col,
            "synthetic": {
                "mean": round(float(np.nanmean(a)), 4) if len(a) else None,
                "std": round(float(np.nanstd(a)), 4) if len(a) else None,
                "min": round(float(np.nanmin(a)), 4) if len(a) else None,
                "max": round(float(np.nanmax(a)), 4) if len(a) else None,
                "q25": round(float(np.nanpercentile(a, 25)), 4) if len(a) else None,
                "median": round(float(np.nanmedian(a)), 4) if len(a) else None,
                "q75": round(float(np.nanpercentile(a, 75)), 4) if len(a) else None,
                "missing": int(np.isnan(a).sum()),
            },
            "application": {
                "mean": round(float(np.nanmean(b)), 4) if len(b) else None,
                "std": round(float(np.nanstd(b)), 4) if len(b) else None,
                "min": round(float(np.nanmin(b)), 4) if len(b) else None,
                "max": round(float(np.nanmax(b)), 4) if len(b) else None,
                "q25": round(float(np.nanpercentile(b, 25)), 4) if len(b) else None,
                "median": round(float(np.nanmedian(b)), 4) if len(b) else None,
                "q75": round(float(np.nanpercentile(b, 75)), 4) if len(b) else None,
                "missing": int(np.isnan(b).sum()),
            },
            "wasserstein": round(_wasserstein(a, b), 4),
        })

    # Indicateur global de dérive : Wasserstein moyen normalisé (échelle 1..5)
    w_vals = [f["wasserstein"] for f in shift_features if not np.isnan(f["wasserstein"])]
    mean_shift = round(float(np.mean(w_vals)), 4) if w_vals else None
    drift_indicator = {
        "method": "Wasserstein distance par feature (distribution synth vs application)",
        "mean_wasserstein": mean_shift,
        "interpretation": (
            "shift faible (<0.2) : distributions proches ; shift élevé : les données "
            "application diffèrent du corpus d'entraînement synthétique — résultats "
            "à interpréter avec précaution (inférence de démonstration)."
        ),
    }

    shift_report = {
        "dataset_synthetic": str(synth_path),
        "dataset_application": str(app_path),
        "n_rows_synthetic": int(len(synth)),
        "n_rows_application": int(len(app)),
        "drift_indicator": drift_indicator,
        "features": shift_features,
        "warning": "Le corpus d'entraînement est 100 % synthétique ; la dérive mesurée "
                   "reflète l'écart synthétique vs application réelle.",
    }
    shift_out_path = shift_out or (REPORTS_DIR / "domain_shift_report.json")
    shift_out_path.parent.mkdir(parents=True, exist_ok=True)
    shift_out_path.write_text(json.dumps(shift_report, indent=2, ensure_ascii=False), encoding="utf-8")

    # ---------- 4. Inférence demo ----------
    if not schema_ok:
        raise ValueError(f"Schéma application incomplet : {missing_in_app}")

    from app.infrastructure.ml.artifact_integrity import load_with_integrity_check
    artifact = MODELS_DIR / f"{DEMO_MODEL_VERSION}.joblib"
    if not artifact.exists():
        raise FileNotFoundError(f"Artefact démo introuvable : {artifact}. Exécutez train_demo_gap.")
    model = load_with_integrity_check(artifact)

    X_app = app[FEATURE_NAMES].astype(float)
    preds = np.clip(model.predict(X_app), GAP_MIN, GAP_MAX)
    app_out = app.copy()
    app_out["pred_gap_next_3m_demo"] = preds.round(4)

    # ---------- 5. Résultat + avertissement ----------
    result = {
        "model_mode": "DEMO_ML",
        "model_version": DEMO_MODEL_VERSION,
        "training_origin": "SYNTHETIC",
        "input_origin": "APPLICATION_DATA",
        "institutional_verified": False,
        "n_rows_tested": int(len(app_out)),
        "prediction_stats": {
            "mean": round(float(preds.mean()), 4),
            "std": round(float(preds.std()), 4),
            "min": round(float(preds.min()), 4),
            "max": round(float(preds.max()), 4),
            "q25": round(float(np.percentile(preds, 25)), 4),
            "median": round(float(np.percentile(preds, 50)), 4),
            "q75": round(float(np.percentile(preds, 75)), 4),
        },
        "validation": validation,
        "domain_shift_summary": drift_indicator,
        "warnings": [
            "Le modèle a été entraîné sur des données synthétiques.",
            "Les prédictions sur données application sont une démonstration technique, "
            "PAS une validation institutionnelle.",
        ],
        "warning": "Le modèle a été entraîné sur des données synthétiques.",
    }

    json_out_path = json_out or (REPORTS_DIR / "application_inference_demo.json")
    json_out_path.parent.mkdir(parents=True, exist_ok=True)
    json_out_path.write_text(json.dumps(result, indent=2, ensure_ascii=False), encoding="utf-8")

    # ---------- Rapport markdown ----------
    md_lines = [
        "# Inférence sur données de l'application (mode DEMO_ML)",
        "",
        f"- **model_mode** : {result['model_mode']}",
        f"- **model_version** : {result['model_version']}",
        f"- **training_origin** : {result['training_origin']}",
        f"- **input_origin** : {result['input_origin']}",
        f"- **institutional_verified** : {result['institutional_verified']}",
        f"- **lignes testées** : {result['n_rows_tested']}",
        "",
        "## Prédictions (statistiques)",
        "",
        "| Stat | Valeur |",
        "|---|---:|",
        *[f"| {k} | {v} |" for k, v in result["prediction_stats"].items()],
        "",
        "## Domain shift (Wasserstein moyen)",
        f"- **mean_wasserstein** : {drift_indicator['mean_wasserstein']}",
        "",
        "## Avertissements",
        "",
        *[f"- {w}" for w in result["warnings"]],
        "",
        "> Résultats de démonstration uniquement. Ne constitue pas une validation institutionnelle.",
        "",
    ]
    md_out_path = md_out or (REPORTS_DIR / "application_inference_demo.md")
    md_out_path.parent.mkdir(parents=True, exist_ok=True)
    md_out_path.write_text("\n".join(md_lines), encoding="utf-8")

    return result


def main() -> int:
    result = run_application_inference()
    print(f"[OK] Inférence DEMO_ML sur application : {result['n_rows_tested']} lignes")
    print(f"    mean_wasserstein={result['domain_shift_summary']['mean_wasserstein']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())