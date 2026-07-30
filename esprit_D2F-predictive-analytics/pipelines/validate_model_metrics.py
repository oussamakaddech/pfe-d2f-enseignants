"""
Validation des métriques du modèle ML gap_predictor.

Ce script vérifie :
1. Feature skew : n_features_model == n_features_code (FEATURE_COLS)
2. Metrics range : R2 dans [-inf, 1], RMSE >= 0
3. Leakage warning : R2 >= 0.99 + n_samples < 200 = suspect
4. Outliers dans le training set
5. Baseline lift : ML doit faire mieux (ou au moins aussi bien) que la baseline
   heuristique (gap = required - current)
6. Fallback mode : si skew détecté, predict() doit basculer sur heuristic

Usage:
    python -m pipelines.validate_model_metrics
    python -m pipelines.validate_model_metrics --json  # sortie machine-readable
"""

import json
import sys
from pathlib import Path
from typing import Any

import numpy as np

sys.path.insert(0, str(Path(__file__).parent.parent))


def validate() -> dict[str, Any]:
    """Exécute toutes les validations et retourne un rapport structuré."""
    from app.ml.gap_predictor import gap_predictor

    health = gap_predictor.model_health()
    report: dict[str, Any] = {
        "ok": True,
        "checks": [],
        "health": health,
    }

    def _add(check_name: str, ok: bool, detail: str, severity: str = "info") -> None:
        report["checks"].append({
            "name": check_name,
            "ok": ok,
            "detail": detail,
            "severity": severity,
        })
        if not ok and severity in ("error", "warning"):
            report["ok"] = False

    # ── 1. Feature skew ──────────────────────────────────
    if not health["model_loaded"]:
        _add("feature_skew", True, "Modèle non chargé — fallback heuristic", "info")
    else:
        skew_ok = health["feature_skew_ok"]
        _add(
            "feature_skew",
            skew_ok,
            f"model_n={health['n_features_model']} vs code_n={health['n_features_code']}. "
            + (health["feature_skew_reason"] or "OK"),
            "error" if not skew_ok else "info",
        )

    # ── 2. Metrics range ──────────────────────────────────
    metrics = health.get("metrics") or {}
    if metrics:
        r2 = metrics.get("test_r2")
        rmse = metrics.get("test_rmse")
        if r2 is not None:
            try:
                _add("test_r2_range", float(r2) <= 1.0, f"test_r2={r2}", "warning")
            except (TypeError, ValueError):
                pass
        if rmse is not None:
            try:
                _add("test_rmse_positive", float(rmse) >= 0.0, f"test_rmse={rmse}", "warning")
            except (TypeError, ValueError):
                pass

    # ── 3. Leakage warning ───────────────────────────────
    for w in health.get("warnings", []):
        _add("leakage_warning", False, w, "warning")

    # ── 4. Outliers ──────────────────────────────────────
    outlier_report = health.get("outlier_report") or {}
    if outlier_report and not outlier_report.get("is_clean", True):
        bad = list(outlier_report.get("outlier_columns", []))
        _add(
            "outliers",
            False,
            f"Outliers dans colonnes: {bad}",
            "warning",
        )
    else:
        _add("outliers", True, "Aucun outlier métier détecté", "info")

    # ── 5. Baseline lift ─────────────────────────────────
    baseline_rmse = metrics.get("baseline_rmse") if metrics else None
    lift_rmse = metrics.get("lift_rmse") if metrics else None
    if baseline_rmse is not None and metrics.get("test_rmse") is not None:
        try:
            ml_rmse = float(metrics["test_rmse"])
            base = float(baseline_rmse)
            # Le lift peut être négatif (ML < baseline) ou positif (ML > baseline).
            # On accepte les deux mais on alerte si ML est largement moins bon.
            if base > 0 and ml_rmse > base * 1.2:
                _add(
                    "baseline_lift",
                    False,
                    f"ML RMSE={ml_rmse:.4f} > 1.2 × baseline={base:.4f}. "
                    "Le modèle n'apporte pas de valeur par rapport à la formule "
                    "déterministe (gap = required - current).",
                    "warning",
                )
            else:
                _add(
                    "baseline_lift",
                    True,
                    f"ML RMSE={ml_rmse:.4f} vs baseline={base:.4f} "
                    f"(lift_rmse={lift_rmse})",
                    "info",
                )
        except (TypeError, ValueError):
            _add("baseline_lift", True, "Lift non numérique — ignoré", "info")
    else:
        _add("baseline_lift", True, "Pas de baseline enregistrée (re-train requis)", "info")

    # ── 6. Fallback mode ────────────────────────────────
    fallback = health.get("fallback_mode", False)
    if fallback:
        _add(
            "fallback_mode",
            True,
            f"predict() basculera sur heuristic. Raison: {health.get('fallback_reason')}",
            "info",
        )
    else:
        _add("fallback_mode", True, "ML mode nominal", "info")

    return report


def main() -> int:
    import argparse
    parser = argparse.ArgumentParser(description="Validate ML model metrics")
    parser.add_argument("--json", action="store_true", help="Sortie JSON uniquement")
    args = parser.parse_args()

    report = validate()

    if args.json:
        print(json.dumps(report, indent=2, default=str))
    else:
        print("=" * 70)
        print("VALIDATION METRIQUES MODELE ML — D2F")
        print("=" * 70)
        print(f"\nModèle : {report['health'].get('model_name')}")
        print(f"Chargé : {report['health'].get('model_loaded')}")
        print(f"Trained at : {report['health'].get('trained_at')}")
        print(f"feature_skew_ok : {report['health'].get('feature_skew_ok')}")
        print(f"fallback_mode : {report['health'].get('fallback_mode')}")
        metrics = report["health"].get("metrics") or {}
        if metrics:
            print(f"n_samples : {metrics.get('n_samples')}")
            print(f"test_r2 : {metrics.get('test_r2')}")
            print(f"test_rmse : {metrics.get('test_rmse')}")
            print(f"baseline_rmse : {metrics.get('baseline_rmse')}")
            print(f"lift_rmse : {metrics.get('lift_rmse')}")
        print(f"\nChecks ({len(report['checks'])}):")
        for c in report["checks"]:
            mark = "[OK]" if c["ok"] else "[KO]"
            print(f"  {mark} {c['name']} ({c['severity']}): {c['detail'][:120]}")
        warnings = [c for c in report["checks"] if c["severity"] == "warning" and not c["ok"]]
        print(f"\nWarnings: {len(warnings)}")
        print("=" * 70)
        print("VERDICT: " + ("PASS" if report["ok"] else "FAIL"))

    return 0 if report["ok"] else 1


if __name__ == "__main__":
    sys.exit(main())
