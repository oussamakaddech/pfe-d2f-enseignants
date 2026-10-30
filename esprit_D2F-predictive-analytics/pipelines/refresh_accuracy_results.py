"""Reconstruit reports/accuracy_results.json depuis les rapports qui font foi.

Ce fichier n'avait plus de generateur : ses sections simulation etaient restees
figees sur l'ancien corpus (graine 42, 10 920 lignes). Les sections sont
desormais recopiees des sorties des pipelines, jamais saisies a la main :

- simulation : reports/compare_four_models.json (corpus « Simulation ») ;
- risk       : data/models/risk_training_metadata.json (macro-F1 du meilleur
               modele ML et de la formule ponderee, sur le test du corpus
               dedie ; l'exactitude simple n'y est pas mesuree -> null) ;
- real       : reports/compare_four_models.json (corpus « Reel servi ») — la
               section etait figee sur l'ancien corpus (217 lignes, modeles
               v1.0.0/v1.1.0) alors que le corpus servi a ete corrige (v1.3.0,
               200 lignes) : elle est desormais recopiee comme les autres.

Prerequis : compare_four_models puis train_risk_model.
"""
from __future__ import annotations

import json
from pathlib import Path

BASE = Path(__file__).parent.parent
REPORTS = BASE / "reports"
OUT = REPORTS / "accuracy_results.json"


def _read(path: Path):
    return json.loads(path.read_text(encoding="utf-8"))


def _row(model: str, acc05: float, acc10: float) -> dict:
    # Les rapports sources expriment l'accuracy en %, ce fichier en fraction.
    return {"model": model, "acc_05": round(acc05 / 100, 4), "acc_10": round(acc10 / 100, 4)}


def main() -> int:
    four_all = _read(REPORTS / "compare_four_models.json")
    four = next(r for r in four_all if r["dataset"] == "Simulation")
    labels = {"gradient_boosting": "Gradient Boosting", "xgboost": "XGBoost",
              "random_forest": "Random Forest", "mlp": "Perceptron (MLP)"}
    simulation = [_row(labels[c], m["accuracy_pm05"], m["accuracy_pm10"]) for c, m in four["models"].items()]
    simulation.append(_row(f"Baseline ({four['baseline']['name']})",
                           four["baseline"]["accuracy_pm05"], four["baseline"]["accuracy_pm10"]))

    real_src = next(r for r in four_all if r["dataset"] == "Reel servi")
    real = [_row(labels[c], m["accuracy_pm05"], m["accuracy_pm10"]) for c, m in real_src["models"].items()]
    real.append(_row(f"Baseline ({real_src['baseline']['name']})",
                     real_src["baseline"]["accuracy_pm05"], real_src["baseline"]["accuracy_pm10"]))

    meta = _read(BASE / "data" / "models" / "risk_training_metadata.json")
    risk = {
        "model": f"{meta['selected_candidate']} {meta['model_version']}",
        "corpus": meta["dataset"]["path"],
        "corpus_rows": meta["dataset"]["rows"],
        "generation_seed": meta["dataset"].get("generation_seed"),
        "holdout_n": meta["split"]["n_test"],
        "accuracy": None,
        "accuracy_majority_class": None,
        "macro_f1": meta["metrics"]["macro_f1"],
        # La « persistance » est la formule ponderee appliquee aux ecarts a t.
        "baseline_persistence_macro_f1": meta["formula_validation"]["macro_f1"],
        "formula_validated": meta["formula_validation"]["validated"],
        "decision": meta["decision"],
    }

    out = {
        "real": real,
        "simulation": {"rows": four["rows_used"], "models": simulation},
        "risk_accuracy": risk["accuracy"],
        "risk": risk,
    }
    OUT.write_text(json.dumps(out, indent=2, ensure_ascii=False) + "\n", encoding="utf-8")
    print(f"[OK] {OUT.name} : simulation {four['rows_used']} lignes, risque macro-F1 {risk['macro_f1']} "
          f"(decision={risk['decision']})")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
