"""Verdict statistique « quel modèle gagne » pour chaque moteur (2026-10-01).

Lecture seule : agrège les mesures déjà produites (aucun réentraînement) et
écrit ``reports/verdict_modeles.{json,md}``. Sources :
- ``reports/compare_four_models.json``      (4 familles × 2 corpus, même protocole)
- ``reports/model_improvement_simulation.json`` (réglage gouverné, cible observée)
- ``reports/v131xgb_promotion.json``        (modèle servi vs précédent, apparié)
- ``data/models/risk_training_metadata.json`` (risque : ML vs formule pondérée)

Règle de lecture : un modèle « gagne » seulement si l'IC95 apparié de son écart
exclut 0 ; sinon le résultat est « non significatif » et le dit.

Usage :
    python -m pipelines.verdict_modeles
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

BASE = Path(__file__).parent.parent
REPORTS = BASE / "reports"
LAB = {"gradient_boosting": "Gradient Boosting", "xgboost": "XGBoost", "random_forest": "Random Forest",
       "mlp": "MLP", "extrapolation_rule": "Règle d'extrapolation", "train_mean": "Moyenne du train"}


def _read(rel: str) -> dict | list:
    return json.loads((BASE / rel).read_text(encoding="utf-8").replace("NaN", "null"))


def _sig(ci: list[float]) -> str:
    return "significatif" if ci[0] > 0 or ci[1] < 0 else "non significatif"


def gap_corpus(entry: dict) -> dict:
    b = entry["baseline"]
    models = sorted(entry["models"].items(), key=lambda kv: kv[1]["rmse"])
    best_name, best = models[0]
    beats = [k for k, m in models if m["beats_baseline_significant"]]
    if b["rmse"] < best["rmse"]:
        winner = f"{LAB.get(b['name'], b['name'])} (référence), aucun modèle ne la bat significativement"
    elif beats:
        tied = [k for k, m in models if not m["worse_than_best_significant"]]
        winner = (f"{LAB[best_name]} (RMSE la plus basse) ; à égalité statistique : "
                  + ", ".join(LAB[k] for k in tied)) if len(tied) > 1 else LAB[best_name]
    else:
        winner = f"{LAB[best_name]} en point, sans gain significatif sur la référence"
    return {
        "corpus": entry["dataset"], "lignes": entry["rows_used"], "test": entry["n_test"],
        "reference": {"nom": b["name"], "rmse": b["rmse"]},
        "classement": [{"modele": k, "rmse": m["rmse"], "r2": m["r2"], "acc_pm05": m["accuracy_pm05"],
                        "acc_pm10": m["accuracy_pm10"], "gain_vs_reference_ic95": m["lift_vs_baseline_ci95"],
                        "bat_reference": m["beats_baseline_significant"],
                        "significativement_pire_que_le_meilleur": m["worse_than_best_significant"]}
                       for k, m in models],
        "gagnant": winner,
    }


def main() -> int:
    four = _read("reports/compare_four_models.json")
    sim = _read("reports/model_improvement_simulation.json")["test"]
    v131 = _read("reports/v131xgb_promotion.json")
    risk = _read("data/models/risk_training_metadata.json")
    fv, rm = risk["formula_validation"], risk["metrics"]

    served = v131["vs_previous_v130_xgb"]
    verdict = {
        "genere_le": datetime.now(timezone.utc).isoformat(),
        "regle": "gagnant = IC95 apparie de l'ecart excluant 0 ; sinon non significatif",
        "ecarts_par_corpus": [gap_corpus(e) for e in four],
        "ecarts_reglage_simulation": {
            "reference_gb": sim["reference_gb_servi"], "candidat": sim["candidat"],
            "gain": sim["candidat_vs_reference"], "vs_regle": sim["candidat_vs_regle"],
            "gagnant": ("XGBoost réglé" if sim["candidat_vs_reference"]["significatif"]
                        else "égalité statistique"),
        },
        "ecarts_modele_servi_reel": {
            "servi": "v1.3.1-xgb", "precedent": "v1.3.0-xgb",
            "metriques_precedent": v131["metrics_previous"], "metriques_servi": v131["metrics_new"],
            "r2": v131["r2"], "gains": {k: served[k] for k in ("rmse", "mae", "acc_pm05")},
            "wilcoxon": served["wilcoxon_abs_error"],
            "lignes_mieux_moins_bien": [served["test_rows_better"], served["test_rows_worse"]],
            "vs_regle": v131["vs_simple_rule"],
            "gagnant": ("v1.3.1-xgb" if served["rmse"]["significant"]
                        else "v1.3.1-xgb en point, non significatif (40 lignes de test)"),
        },
        "risque": {
            "formule": {"macro_f1": fv["macro_f1"], "ic95": fv["macro_f1_ci95"], "validee": fv["validated"]},
            "meilleur_ml": {"modele": risk["selected_candidate"], "macro_f1": rm["macro_f1"],
                            "gain_vs_formule": rm["gain_vs_formula"]},
            "corpus": risk["dataset"]["path"], "test": risk["split"]["n_test"],
            "gagnant": ("modèle ML" if rm["gain_vs_formula"]["significant"]
                        else "formule pondérée (le ML est " + _sig(rm["gain_vs_formula"]["ci95"]).replace(
                            "significatif", "significativement") + " moins bon)"
                        if rm["gain_vs_formula"]["gain"] < 0 else "égalité statistique"),
        },
    }
    (REPORTS / "verdict_modeles.json").write_text(json.dumps(verdict, indent=2, ensure_ascii=False), encoding="utf-8")

    md = ["# Verdict statistique : quel modèle gagne (2026-10-01)", "",
          f"Règle : {verdict['regle']}.", "", "## 1. Prédiction des écarts — 4 familles, même protocole", ""]
    for c in verdict["ecarts_par_corpus"]:
        md += [f"### {c['corpus']} ({c['lignes']} lignes, test {c['test']})", "",
               "| Modèle | RMSE | R² | ±0,5 | ±1 | Gain vs référence (IC95) |", "|---|---|---|---|---|---|",
               f"| {LAB.get(c['reference']['nom'], c['reference']['nom'])} (référence) | {c['reference']['rmse']} | | | | |"]
        md += [f"| {LAB[m['modele']]} | {m['rmse']} | {m['r2']} | {m['acc_pm05']} % | {m['acc_pm10']} % | "
               f"{m['gain_vs_reference_ic95']} {'✔' if m['bat_reference'] else '—'} |" for m in c["classement"]]
        md += ["", f"**Gagnant : {c['gagnant']}.**", ""]
    s = verdict["ecarts_reglage_simulation"]
    md += ["## 2. Réglage gouverné (simulation, cible observée)", "",
           f"XGBoost réglé {s['candidat']['rmse']} contre GB de référence {s['reference_gb']['rmse']} : "
           f"gain {s['gain']['gain_rmse']} IC95 {s['gain']['ic95']} → **{s['gagnant']}**.", ""]
    r = verdict["ecarts_modele_servi_reel"]
    md += ["## 3. Modèle servi sur le réel : v1.3.1-xgb vs v1.3.0-xgb (apparié)", "",
           "| | v1.3.0-xgb | v1.3.1-xgb | Gain (IC95) |", "|---|---|---|---|"]
    for k, lab in (("rmse", "RMSE"), ("mae", "MAE"), ("acc_pm05", "Accuracy ±0,5 (%)")):
        md.append(f"| {lab} | {r['metriques_precedent'][k]} | {r['metriques_servi'][k]} | "
                  f"{r['gains'][k]['gain']} {r['gains'][k]['ci95']} |")
    md += [f"| R² | {r['r2']['previous']} | {r['r2']['new']} | |", "",
           f"Wilcoxon (erreurs absolues) p = {r['wilcoxon']['p_value']} ; lignes mieux / moins bien : "
           f"{r['lignes_mieux_moins_bien'][0]} / {r['lignes_mieux_moins_bien'][1]}. "
           f"Règle simple {r['vs_regle']['rule_rmse']} : écart {r['vs_regle']['gain_rmse']} IC95 {r['vs_regle']['ci95']}.",
           "", f"**Gagnant : {r['gagnant']}.**", ""]
    k = verdict["risque"]
    md += ["## 4. Risque à M+3 : formule pondérée vs ML", "",
           f"Formule : macro-F1 {k['formule']['macro_f1']} IC95 {k['formule']['ic95']} (validée : {k['formule']['validee']}). "
           f"Meilleur ML ({k['meilleur_ml']['modele']}) : {k['meilleur_ml']['macro_f1']}, écart "
           f"{k['meilleur_ml']['gain_vs_formule']['gain']} IC95 {k['meilleur_ml']['gain_vs_formule']['ci95']} "
           f"({k['test']} lignes de test, `{k['corpus']}`).", "", f"**Gagnant : {k['gagnant']}.**", ""]
    (REPORTS / "verdict_modeles.md").write_text("\n".join(md), encoding="utf-8")
    print("\n".join(md))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
