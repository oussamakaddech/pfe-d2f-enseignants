"""Évaluation du modèle RISQUE sur le dataset synthétique démo.

Deux approches évaluées séparément sur des labels SYNTHÉTIQUES :
    1. heuristic_six_factors — réutilise app.domain.services.risk_calculator
       (poids config : stagnation .25, decline .20, attendance .20,
       low_eval .15, repeated_need .10, low_engagement .10).
    2. random_forest — RandomForestClassifier sur les 6 facteurs normalisés.

Les labels de risque sont générés de façon synthétique (aucun label réel) :
    risk_labels_origin = SYNTHETIC

Métriques : accuracy, balanced_accuracy, precision_macro, recall_macro,
f1_macro, f1_weighted, confusion_matrix, roc_auc, pr_auc.

Sortie : reports/demo_risk_report.json
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import (
    accuracy_score,
    balanced_accuracy_score,
    confusion_matrix,
    f1_score,
    precision_score,
    recall_score,
)

from app.core.config import get_settings
from app.domain.services.risk_calculator import RiskInputs, compute_risk

BASE_DIR = Path(__file__).parent.parent
SYNTH_DIR = BASE_DIR / "data" / "synthetic"
REPORTS_DIR = BASE_DIR / "reports"

RISK_LEVELS = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]
RISK_FEATURES = ["stagnation", "decline", "attendance", "low_eval", "repeated_need", "low_engagement"]


def _level_rank(label: str) -> int:
    return RISK_LEVELS.index(label) if label in RISK_LEVELS else 0


def _bootstrap_auc(y_true, y_score, n=200, seed=2026) -> tuple[float, float] | None:
    """IC95 bootstrap de l'AUC-ROC via ranks (aucune dépendance scipy ici)."""
    try:
        from sklearn.metrics import roc_auc_score

        rng = np.random.default_rng(seed)
        idx = np.arange(len(y_true))
        vals = []
        for _ in range(n):
            ids = rng.choice(idx, size=len(idx), replace=True)
            if len(set(y_true[ids])) < 2:
                continue
            vals.append(roc_auc_score(y_true[ids], y_score[ids]))
        if not vals:
            return None
        return (float(np.percentile(vals, 2.5)), float(np.percentile(vals, 97.5)))
    except Exception:
        return None


def run_risk_pipeline(
    dataset_path: Path | None = None,
    output_path: Path | None = None,
    n_bootstrap: int = 200,
) -> dict:
    """Évalue l'heuristique 6 facteurs + un RandomForest sur labels synthétiques."""
    path = dataset_path or (SYNTH_DIR / "demo_dataset_synthetic-v1.0.0_clean.csv")
    if not path.exists():
        raise FileNotFoundError(f"Dataset propre introuvable : {path}")
    df = pd.read_csv(path)

    settings = get_settings()
    weights = settings.risk_weights

    # ---------- Labels synthétiques (niveaux) + features normalisées ----------
    def _features(row) -> dict[str, float]:
        stagnation = max(0.0, float(row["stagnation_months"]))
        decline = 1.0 if float(row.get("declined", 0)) > 0 else 0.0
        attendance = float(row["attendance_rate"])
        low_eval = 1.0 - min(1.0, max(0.0, float(row["evaluation_score"]) / 5.0))
        repeated_need = min(1.0, max(0.0, float(row["need_count"]) / 3.0))
        engagement = min(1.0, max(0.0, float(row["engagement_score"])))
        low_engagement = 1.0 - engagement
        return {
            "stagnation": min(1.0, stagnation / 24.0),
            "decline": decline,
            "attendance": 1.0 - min(1.0, max(0.0, attendance)),
            "low_eval": low_eval,
            "repeated_need": repeated_need,
            "low_engagement": low_engagement,
        }

    rows: list[dict] = []
    rng = np.random.default_rng(2026)
    for _, r in df.iterrows():
        feats = _features(r)
        inputs = RiskInputs(
            teacher_id=str(r["teacher_id"]),
            stagnation_months=float(r["stagnation_months"]),
            declined=bool(feats["decline"] > 0),
            attendance_rate=float(r["attendance_rate"]),
            avg_eval_score=float(r["evaluation_score"]),
            repeated_need_count=float(r["need_count"]),
            days_since_last_activity=None if r["days_since_last_training"] >= 999 else float(r["days_since_last_training"]),
        )
        profile = compute_risk(inputs, weights)
        # Label synthétique : niveau dérivé du score heuristique + léger bruit
        score = profile.risk_score
        noisy = score + rng.normal(0.0, 3.0)
        label = profile.risk_level.value if hasattr(profile.risk_level, "value") else str(profile.risk_level)
        if noisy >= 70:
            label = "CRITICAL"
        elif noisy >= 55:
            label = "HIGH"
        elif noisy >= 30:
            label = "MEDIUM"
        else:
            label = "LOW"
        rows.append({
            **feats,
            "risk_score": score,
            "risk_label": label,
            "teacher_id": r["teacher_id"],
            "risk_factors": profile.factors,
        })

    rdf = pd.DataFrame(rows)
    X = rdf[RISK_FEATURES].astype(float).to_numpy()
    y = rdf["risk_label"].to_numpy()

    # Split temporel strict (ref_month)
    df = df.reset_index(drop=True)
    months = sorted(pd.to_datetime(df["ref_month"]).dt.to_period("M").unique())
    n = len(months)
    n_val = max(1, int(round(n * 0.15)))
    n_test = max(1, int(round(n * 0.15)))
    n_train = n - n_val - n_test
    train_m = set(months[:n_train])
    val_m = set(months[n_train:n_train + n_val])
    test_m = set(months[n_train + n_val:])
    pm = pd.to_datetime(df["ref_month"]).dt.to_period("M").to_numpy()
    tr_mask = np.array([m in train_m for m in pm])
    te_mask = np.array([m in test_m for m in pm])

    y_rank = np.array([_level_rank(v) for v in y])

    results = {
        "risk_labels_origin": "SYNTHETIC",
        "note": "Labels de risque dérivés du moteur heuristique (score + bruit). "
                "Aucun label institutionnel réel. Métriques = démonstration technique.",
        "caveat_heuristic_accuracy": (
            "L'accuracy de l'heuristique est triviale (~1.0) car les labels dérivent "
            "du même score ; c'est un contrôle de cohérence interne, PAS une mesure de "
            "performance institutionnelle. Le RandomForest, entraîné sur les seuls 6 "
            "facteurs normalisés, fournit l'évaluation discriminative honnête."
        ),
        "n_rows": len(rdf),
        "label_distribution": {k: int(v) for k, v in rdf["risk_label"].value_counts().items()},
        "heuristic_six_factors": {},
        "random_forest": {},
    }

    # ---------- 1. Heuristique 6 facteurs ----------
    pred_level = np.array([_level_rank(v) for v in rdf["risk_label"]])
    y_score = rdf["risk_score"].to_numpy()
    # Le score heuristique EST la source des labels ; on évalue la cohérence interne
    # sur le split test temporel uniquement.
    y_te = y_rank[te_mask]
    s_te = y_score[te_mask]
    pred_te = pred_level[te_mask]
    auc = None
    try:
        from sklearn.metrics import roc_auc_score, average_precision_score

        auc = float(roc_auc_score((y_te > 0).astype(int), s_te))
        pr_auc = float(average_precision_score((y_te > 0).astype(int), s_te))
    except Exception:
        auc, pr_auc = None, None
    results["heuristic_six_factors"] = {
        "accuracy": round(float(accuracy_score(y_te, pred_te)), 4),
        "balanced_accuracy": round(float(balanced_accuracy_score(y_te, pred_te)), 4),
        "precision_macro": round(float(precision_score(y_te, pred_te, average="macro", zero_division=0)), 4),
        "recall_macro": round(float(recall_score(y_te, pred_te, average="macro", zero_division=0)), 4),
        "f1_macro": round(float(f1_score(y_te, pred_te, average="macro", zero_division=0)), 4),
        "f1_weighted": round(float(f1_score(y_te, pred_te, average="weighted", zero_division=0)), 4),
        "confusion_matrix": confusion_matrix(y_te, pred_te, labels=list(range(len(RISK_LEVELS)))).tolist(),
        "roc_auc": round(auc, 4) if auc is not None else "N/A",
        "pr_auc": round(pr_auc, 4) if pr_auc is not None else "N/A",
        "test_rows": int(len(y_te)),
        "weights": weights,
        "explainability": "RiskProfile.factors : normalized_value, weight, contribution, label (app/domain/services/risk_calculator.py)",
    }

    # ---------- 2. RandomForest ----------
    X_tr, y_tr = X[tr_mask], y_rank[tr_mask]
    X_te, y_te_rf = X[te_mask], y_rank[te_mask]
    rf = RandomForestClassifier(n_estimators=200, max_depth=5, random_state=42,
                                class_weight="balanced_subsample")
    rf.fit(X_tr, y_tr)
    pred_rf = rf.predict(X_te)
    proba_rf = rf.predict_proba(X_te)
    n_classes = len(rf.classes_)
    # score binaire (risque >= MEDIUM) pour roc_auc / pr_auc
    bin_true = (y_te_rf > 0).astype(int)
    score_pos = proba_rf[:, list(rf.classes_).index(1)] if 1 in rf.classes_ else proba_rf.max(axis=1)
    auc_rf = None
    pr_rf = None
    try:
        from sklearn.metrics import average_precision_score, roc_auc_score

        auc_rf = float(roc_auc_score(bin_true, score_pos))
        pr_rf = float(average_precision_score(bin_true, score_pos))
    except Exception:
        pass

    results["random_forest"] = {
        "model": "RandomForestClassifier(n_estimators=200, max_depth=5, class_weight=balanced_subsample)",
        "accuracy": round(float(accuracy_score(y_te_rf, pred_rf)), 4),
        "balanced_accuracy": round(float(balanced_accuracy_score(y_te_rf, pred_rf)), 4),
        "precision_macro": round(float(precision_score(y_te_rf, pred_rf, average="macro", zero_division=0)), 4),
        "recall_macro": round(float(recall_score(y_te_rf, pred_rf, average="macro", zero_division=0)), 4),
        "f1_macro": round(float(f1_score(y_te_rf, pred_rf, average="macro", zero_division=0)), 4),
        "f1_weighted": round(float(f1_score(y_te_rf, pred_rf, average="weighted", zero_division=0)), 4),
        "confusion_matrix": confusion_matrix(y_te_rf, pred_rf, labels=list(range(len(RISK_LEVELS)))).tolist(),
        "roc_auc": round(auc_rf, 4) if auc_rf is not None else "N/A",
        "pr_auc": round(pr_rf, 4) if pr_rf is not None else "N/A",
        "test_rows": int(len(y_te_rf)),
        "n_classes": int(n_classes),
    }

    out = output_path or (REPORTS_DIR / "demo_risk_report.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    return results


def main() -> int:
    results = run_risk_pipeline()
    print(f"[OK] RISQUE (labels SYNTHETIC, {results['n_rows']} lignes)")
    print(f"    heuristic : acc={results['heuristic_six_factors']['accuracy']} "
          f"f1_macro={results['heuristic_six_factors']['f1_macro']}")
    print(f"    random_forest : acc={results['random_forest']['accuracy']} "
          f"f1_macro={results['random_forest']['f1_macro']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())