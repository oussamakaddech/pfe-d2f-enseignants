"""Orchestrateur du pipeline démo ML complet (DEMO_ML).

Exécute dans l'ordre :
    1. génération dataset synthétique (1 000 lignes)
    2. audit + nettoyage traçable
    3. features + anti-fuite + split temporel
    4. entraînement/évaluation des 5 modèles GAP + bootstrap + multi-seed
    5. modèle risque + modèle ranking
    6. inférence sur les données de l'application + domain shift
    7. registre DEMO_ML + validation de serving
    8. rapport final

Sortie principale : reports/demo_final_validation.md
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from pipelines import (
    audit_demo_dataset,
    clean_demo_dataset,
    demo_application_inference,
    eval_demo_ranking,
    eval_demo_risk,
    generate_demo_dataset,
    register_demo_model,
    train_demo_gap,
)

BASE_DIR = Path(__file__).parent.parent
REPORTS_DIR = BASE_DIR / "reports"
SYNTH_DIR = BASE_DIR / "data" / "synthetic"


def run_all(rows: int = 1000, seed: int = 42) -> dict:
    """Exécute le pipeline démo complet et produit tous les rapports."""
    version = "synthetic-v1.0.0"

    print("== [1/8] Génération dataset synthétique ==")
    gen = generate_demo_dataset.generate_demo_dataset(rows=rows, seed=seed, version=version)
    generate_demo_dataset.write_generation_spec(version, seed)
    (REPORTS_DIR / "demo_generation_raw_report.json").write_text(
        json.dumps(gen, indent=2, ensure_ascii=False), encoding="utf-8")

    print("== [2/8] Audit + nettoyage ==")
    audit = audit_demo_dataset.audit_demo_dataset()
    clean = clean_demo_dataset.clean_demo_dataset(version=version)

    print("== [3/8] Features, anti-fuite, split temporel, modèles GAP ==")
    gap = train_demo_gap.run_gap_pipeline()

    print("== [4/8] Risque ==")
    risk = eval_demo_risk.run_risk_pipeline()

    print("== [5/8] Ranking ==")
    ranking = eval_demo_ranking.run_ranking_pipeline()

    print("== [6/8] Inférence application + domain shift ==")
    app_inf = demo_application_inference.run_application_inference()

    print("== [7/8] Registre DEMO_ML + serving ==")
    serving = register_demo_model.run_serving_validation()

    print("== [8/8] Rapport final ==")
    final = build_final_report(gen, clean, gap, risk, ranking, app_inf, serving)
    return final


def build_final_report(
    gen: dict,
    clean: dict,
    gap: dict,
    risk: dict,
    ranking: dict,
    app_inf: dict,
    serving: dict,
) -> dict:
    """Construit le rapport final consolidé."""
    clean_df = pd.read_csv(SYNTH_DIR / "demo_dataset_synthetic-v1.0.0_clean.csv")
    n_teachers = int(clean_df["teacher_id"].nunique())
    n_comps = int(clean_df["competence_id"].nunique())
    n_months = int(pd.to_datetime(clean_df["ref_month"]).dt.to_period("M").nunique())

    report = {
        "title": "Pipeline démo ML — validation technique sur données synthétiques",
        "dataset": {
            "rows": int(len(clean_df)),
            "synthetic_teachers": n_teachers,
            "competencies": n_comps,
            "periods_months": n_months,
            "seed": int(gen["seed"]),
            "dataset_hash": clean.get("dataset_hash"),
            "data_origin": "SYNTHETIC",
            "is_synthetic": True,
            "institutional_verified": False,
            "granularity": gen["granularity"],
        },
        "cleaning": {
            "rows_before": clean["rows_before"],
            "rows_after": clean["rows_after"],
            "rows_corrected": clean["rows_corrected"],
            "rows_imputed": clean["rows_imputed"],
            "rows_removed": clean["rows_removed"],
            "rows_quarantined": clean["rows_quarantined"],
            "reasons": clean["reasons"],
        },
        "pipeline": {
            "n_features": gap["feature_dictionary"]["feature_schema_version"] and 29,
            "target": "gap_next_3m",
            "leakage_ok": all(v is False for v in gap["leakage"]["leakage_checks"].values()),
            "split": gap["split"],
            "seeds": [42, 43, 44, 45],
        },
        "results_gap": {
            "comparison": gap["comparison"],
            "best_model": gap["best_model"],
            "bootstrap": gap["bootstrap"],
            "multi_seed": gap["multi_seed"],
        },
        "results_risk": {
            "heuristic_six_factors": risk["heuristic_six_factors"],
            "random_forest": risk["random_forest"],
            "risk_labels_origin": risk["risk_labels_origin"],
        },
        "results_ranking": {
            "metrics": ranking["metrics"],
            "relevance_labels_origin": ranking["relevance_labels_origin"],
        },
        "inference_application": {
            "n_rows_tested": app_inf["n_rows_tested"],
            "domain_shift_mean_wasserstein": app_inf["domain_shift_summary"]["mean_wasserstein"],
            "prediction_stats": app_inf["prediction_stats"],
            "warnings": app_inf["warnings"],
        },
        "serving": {
            "model_mode": serving["serving_status"]["model_mode"],
            "model_version": serving["serving_status"]["model_version"],
            "data_origin": "SYNTHETIC",
            "dataset_hash": serving["registry_entry"]["dataset_hash"],
            "artifact_sha256": serving["registry_entry"]["artifact_sha256"],
            "institutional_verified": False,
            "promotion_refused": serving["promotion_guard"]["production_promotion_refused"],
        },
        "limits": [
            "Données 100 % synthétiques — aucune donnée réelle d'ESPRIT utilisée.",
            "Absence de validation institutionnelle (institutional_verified=false).",
            "Nécessité de données réelles longitudinales pour toute conclusion sur les enseignants réels.",
        ],
        "conclusion": (
            "Le corpus synthétique de 1 000 lignes a permis de tester le nettoyage, "
            "le contrat de features, l'anti-fuite, l'entraînement, la comparaison des "
            "modèles, la stabilité et l'inférence sur les données de l'application. "
            "Les métriques obtenues sont valides pour une démonstration technique du "
            "pipeline. Elles ne constituent pas une preuve de performance sur les "
            "enseignants réels d'ESPRIT. Le modèle généré est donc servi en mode "
            "DEMO_ML, tandis que le modèle PRODUCTION_ML reste séparé et soumis à "
            "une validation sur des données institutionnelles vérifiées."
        ),
    }

    (REPORTS_DIR / "demo_final_validation.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    write_final_md(report)
    return report


def write_final_md(report: dict) -> None:
    d = report["dataset"]
    c = report["cleaning"]
    g = report["results_gap"]
    r = report["results_risk"]
    k = report["results_ranking"]
    ai = report["inference_application"]
    s = report["serving"]

    lines = [
        "# Rapport final — Pipeline démo ML (DEMO_ML)",
        "",
        "> **Avertissement global** : ce rapport est une **démonstration technique** sur des ",
        "> données **100 % synthétiques**. Les métriques n'engagent pas les enseignants réels ",
        "> d'ESPRIT et ne constituent en aucun cas une validation institutionnelle.",
        "",
        "## Dataset",
        "",
        "| Caractéristique | Valeur |",
        "|---|---:|",
        f"| Lignes | {d['rows']} |",
        f"| Enseignants synthétiques | {d['synthetic_teachers']} |",
        f"| Compétences | {d['competencies']} |",
        f"| Périodes (mois) | {d['periods_months']} |",
        f"| Seed | {d['seed']} |",
        f"| Hash canonique | `{d['dataset_hash'][:16]}...` |",
        f"| Origine | {d['data_origin']} |",
        f"| Institutionnel vérifié | {d['institutional_verified']} |",
        "",
        "## Nettoyage (traçable)",
        "",
        "| Mesure | Valeur |",
        "|---|---:|",
        f"| Avant | {c['rows_before']} |",
        f"| Après | {c['rows_after']} |",
        f"| Corrigées | {c['rows_corrected']} |",
        f"| Imputées | {c['rows_imputed']} |",
        f"| Supprimées | {c['rows_removed']} |",
        f"| Quarantaine | {c['rows_quarantined']} |",
        "",
        "## Pipeline",
        "",
        f"- **Features** : 29 (`current_level_*`), FeatureBuilder partagé `pipelines/demo_feature_builder.py`.",
        f"- **Cible** : `{report['pipeline']['target']}` (gap à +3 mois, échelle 0..5).",
        f"- **Anti-fuite** : {report['pipeline']['leakage_ok']} (aucune colonne interdite dans X ; `source_time <= ref_month`).",
        f"- **Split temporel** : {report['pipeline']['split']['train_rows']} / "
        f"{report['pipeline']['split']['validation_rows']} / {report['pipeline']['split']['test_rows']} lignes "
        f"(train/validation/test).",
        f"- **Seeds** : {report['pipeline']['seeds']}.",
        "",
        "## Résultats GAP",
        "",
        "| Modèle | RMSE | MAE | R² | Tolérance ±0,10 | Tolérance ±0,20 | Gain vs baseline (%) | Temps inférence (ms) | Décision |",
        "|---|---:|---:|---:|---:|---:|---:|---:|---|",
    ]
    for row in g["comparison"]:
        lines.append(
            f"| {row['Modèle']} | {row['RMSE']} | {row['MAE']} | {row['R²']} "
            f"| {row['Tolérance ±0,10']} | {row['Tolérance ±0,20']} "
            f"| {row['Gain vs baseline (%)']} | {row['Temps inférence (ms)']} | {row['Décision']} |"
        )
    lines += [
        "",
        f"- **Meilleur modèle** : **{g['best_model']}** (RMSE moyen multi-seed "
        f"{g['comparison'][0]['RMSE']}).",
        f"- **Bootstrap** ({g['bootstrap']['n_bootstrap']} réplications, seed {g['bootstrap']['bootstrap_seed']}) : "
        f"IC95 RMSE {g['bootstrap']['ic95_rmse']}, IC95 MAE {g['bootstrap']['ic95_mae']}, "
        f"IC95 gain vs baseline {g['bootstrap']['ic95_improvement_vs_persistence_pct']} %.",
        "- **Multi-seed** (42, 43, 44, 45) : modèle retenu uniquement si le gain est positif "
        "sur plusieurs seeds — jamais sur une seule seed.",
        "",
        "## Résultats RISQUE (labels synthétiques)",
        "",
        "| Modèle | Accuracy | Balanced accuracy | Precision macro | Recall macro | F1 macro | AUC | Décision |",
        "|---|---:|---:|---:|---:|---:|---:|---|",
    ]
    for name in ("heuristic_six_factors", "random_forest"):
        m = r[name]
        lines.append(
            f"| {name} | {m['accuracy']} | {m['balanced_accuracy']} | {m['precision_macro']} "
            f"| {m['recall_macro']} | {m['f1_macro']} | {m['roc_auc']} | démonstration |"
        )
    lines += [
        "",
        "> `risk_labels_origin = SYNTHETIC`. L'accuracy de l'heuristique (~1.0) est un contrôle "
        "de cohérence interne (les labels dérivent de son score) ; le RandomForest entraîné sur "
        "les 6 facteurs normalisés fournit l'évaluation discriminative.",
        "",
        "## Résultats RANKING (labels de pertinence synthétiques)",
        "",
        "| Méthode | Precision@3 | Recall@3 | NDCG@3 | MAP@3 | Décision |",
        "|---|---:|---:|---:|---:|---|",
    ]
    m = k["metrics"]
    lines.append(
        f"| heuristique 0,70/0,20/0,10 | {m['precision_at_3']} | {m['recall_at_3']} "
        f"| {m['ndcg_at_3']} | {m['map_at_3']} | démonstration |"
    )
    lines += [
        "",
        "> `relevance_labels_origin = SYNTHETIC`.",
        "",
        "## Inférence sur données de l'application",
        "",
        f"- **Lignes testées** : {ai['n_rows_tested']} (data/clean/training_corpus_from_db.csv).",
        f"- **Domain shift** (Wasserstein moyen) : {ai['domain_shift_mean_wasserstein']}.",
        f"- **Prédictions** : mean {ai['prediction_stats']['mean']}, "
        f"median {ai['prediction_stats']['median']}, "
        f"[{ai['prediction_stats']['min']}, {ai['prediction_stats']['max']}].",
        f"- **Avertissements** :",
        *[f"  - {w}" for w in ai["warnings"]],
        "",
        "## Serving",
        "",
        "| Champ | Valeur |",
        "|---|---|",
        f"| Model mode | **{s['model_mode']}** |",
        f"| Version | `{s['model_version']}` |",
        f"| Origine | {s['data_origin']} |",
        f"| Hash dataset | `{s['dataset_hash'][:16]}...` |",
        f"| Hash artefact | `{s['artifact_sha256'][:16]}...` |",
        f"| Institutionnel vérifié | {s['institutional_verified']} |",
        f"| Promotion PRODUCTION_ML | refusée ({s['promotion_refused']}) |",
        "",
        "## Limites",
        "",
        *[f"- {lim}" for lim in report["limits"]],
        "",
        "## Conclusion",
        "",
        f"> {report['conclusion']}",
        "",
    ]
    (REPORTS_DIR / "demo_final_validation.md").write_text("\n".join(lines), encoding="utf-8")
    (REPORTS_DIR / "demo_generation_report.md").write_text(
        _generation_report_md(report), encoding="utf-8")


def _generation_report_md(report: dict) -> str:
    d = report["dataset"]
    c = report["cleaning"]
    return (
        "# Rapport de génération — dataset synthétique démo\n\n"
        f"- **Lignes** : {d['rows']}\n"
        f"- **Enseignants synthétiques** : {d['synthetic_teachers']}\n"
        f"- **Compétences** : {d['competencies']}\n"
        f"- **Périodes** : {d['periods_months']} mois\n"
        f"- **Seed** : {d['seed']}\n"
        f"- **Hash canonique** : `{d['dataset_hash']}`\n"
        f"- **Origine** : {d['data_origin']} (is_synthetic=true, institutional_verified=false)\n\n"
        "## Nettoyage\n\n"
        f"- Avant : {c['rows_before']} → après : {c['rows_after']}\n"
        f"- Corrigées : {c['rows_corrected']} ; imputées : {c['rows_imputed']}\n"
        f"- Supprimées : {c['rows_removed']} ; quarantaine : {c['rows_quarantined']}\n"
        f"- Raisons : {json.dumps(c['reasons'], ensure_ascii=False)}\n\n"
        "Voir `reports/demo_generation_spec.md` pour la formule complète.\n"
    )


def main() -> int:
    final = run_all()
    print("[OK] Pipeline démo terminé. Rapport final : reports/demo_final_validation.md")
    print(f"    Lignes : {final['dataset']['rows']}, hash : {final['dataset']['dataset_hash'][:16]}...")
    print(f"    Meilleur modèle GAP : {final['results_gap']['best_model']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())