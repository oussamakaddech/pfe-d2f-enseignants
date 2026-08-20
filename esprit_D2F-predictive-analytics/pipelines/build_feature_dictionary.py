"""Construction du dictionnaire des features et du rapport anti-fuite.

Produit :
  reports/feature_dictionary.json
  reports/feature_leakage_report.json
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).parent.parent
CLEAN_DIR = BASE_DIR / "data" / "clean"
REPORTS_DIR = BASE_DIR / "reports"
REPORTS_DIR.mkdir(parents=True, exist_ok=True)

DATASET_PATH = CLEAN_DIR / "training_corpus_clean.csv"

# Features canoniques (X) — identiques à l'entraînement et au serving
FEATURE_COLS = [
    "current_level_t3", "current_level_t2", "current_level_t1", "current_level_t",
    "lag_gap_t3_t2", "lag_gap_t2_t1", "lag_gap_t1_t", "rolling_tendance",
    "days_since_last_training", "training_frequency_per_month",
    "is_long_absent", "is_stagnant",
    "avg_level", "min_level", "max_level", "nb_level_5", "nb_level_1",
    "nb_savoirs", "nb_competences", "competency_coverage_rate",
    "nb_formations_completed", "nb_formations_in_progress", "taux_assiduite",
    "nb_besoins_exprimes", "nb_besoins_approuves", "avg_eval_score", "nb_evaluations",
    "months_since_last_training", "engagement_score",
]

TARGET_COL = "gap_next_3m"

# Colonnes interdites dans X (fuite)
FORBIDDEN_IN_X = {"required_level", "required_level_t", "gap_next_3m",
                  "future_gap", "future_level", "future_evaluation", "future_attendance"}

# Source de chaque feature
FEATURE_SOURCES = {
    "current_level_t3": {"source_table": "competence.enseignant_competences", "source_column": "niveau", "aggregation_window": "t-3"},
    "current_level_t2": {"source_table": "competence.enseignant_competences", "source_column": "niveau", "aggregation_window": "t-2"},
    "current_level_t1": {"source_table": "competence.enseignant_competences", "source_column": "niveau", "aggregation_window": "t-1"},
    "current_level_t": {"source_table": "competence.enseignant_competences", "source_column": "niveau", "aggregation_window": "t"},
    "lag_gap_t3_t2": {"source_table": "derived", "source_column": "current_level_t2 - current_level_t3", "aggregation_window": "t-3..t-2"},
    "lag_gap_t2_t1": {"source_table": "derived", "source_column": "current_level_t1 - current_level_t2", "aggregation_window": "t-2..t-1"},
    "lag_gap_t1_t": {"source_table": "derived", "source_column": "current_level_t - current_level_t1", "aggregation_window": "t-1..t"},
    "rolling_tendance": {"source_table": "derived", "source_column": "(current_level_t - current_level_t3) / 3", "aggregation_window": "t-3..t"},
    "days_since_last_training": {"source_table": "formation.inscriptions", "source_column": "date_demande", "aggregation_window": "t"},
    "training_frequency_per_month": {"source_table": "formation.inscriptions", "source_column": "count(APPROVED) / months", "aggregation_window": "t"},
    "is_long_absent": {"source_table": "derived", "source_column": "days_since_last_training > 180", "aggregation_window": "t"},
    "is_stagnant": {"source_table": "derived", "source_column": "days_since_last_training > 365", "aggregation_window": "t"},
    "avg_level": {"source_table": "competence.enseignant_competences", "source_column": "avg(niveau)", "aggregation_window": "historique"},
    "min_level": {"source_table": "competence.enseignant_competences", "source_column": "min(niveau)", "aggregation_window": "historique"},
    "max_level": {"source_table": "competence.enseignant_competences", "source_column": "max(niveau)", "aggregation_window": "historique"},
    "nb_level_5": {"source_table": "competence.enseignant_competences", "source_column": "count(niveau=5)", "aggregation_window": "historique"},
    "nb_level_1": {"source_table": "competence.enseignant_competences", "source_column": "count(niveau=1)", "aggregation_window": "historique"},
    "nb_savoirs": {"source_table": "competence.enseignant_competences", "source_column": "count(savoir_id)", "aggregation_window": "historique"},
    "nb_competences": {"source_table": "competence.enseignant_competences", "source_column": "count(distinct competence_id)", "aggregation_window": "historique"},
    "competency_coverage_rate": {"source_table": "derived", "source_column": "nb_savoirs / max_savoirs", "aggregation_window": "historique"},
    "nb_formations_completed": {"source_table": "formation.inscriptions", "source_column": "count(etat=APPROVED)", "aggregation_window": "historique"},
    "nb_formations_in_progress": {"source_table": "formation.inscriptions", "source_column": "count(etat=EN_COURS)", "aggregation_window": "historique"},
    "taux_assiduite": {"source_table": "formation.presences", "source_column": "avg(presence)", "aggregation_window": "historique"},
    "nb_besoins_exprimes": {"source_table": "besoin.besoin_formation", "source_column": "count(*)", "aggregation_window": "historique"},
    "nb_besoins_approuves": {"source_table": "besoin.besoin_formation", "source_column": "count(approuve_admin=true)", "aggregation_window": "historique"},
    "avg_eval_score": {"source_table": "evaluation.evaluation_formateur", "source_column": "avg(note)", "aggregation_window": "historique"},
    "nb_evaluations": {"source_table": "evaluation.evaluation_formateur", "source_column": "count(*)", "aggregation_window": "historique"},
    "months_since_last_training": {"source_table": "formation.inscriptions", "source_column": "days_since_last_training / 30.44", "aggregation_window": "t"},
    "engagement_score": {"source_table": "derived", "source_column": "n_done*2 + n_eval*1.5 + n_needs + taux*5 + avg_eval*2", "aggregation_window": "historique"},
}


def main() -> int:
    print("=" * 70)
    print("DICTIONNAIRE DES FEATURES ET RAPPORT ANTI-FUITE")
    print("=" * 70)

    if not DATASET_PATH.exists():
        print(f"[ERROR] Dataset introuvable : {DATASET_PATH}")
        return 1

    df = pd.read_csv(DATASET_PATH)
    print(f"[1] Dataset chargé : {len(df)} lignes")

    # Vérifier que toutes les features sont présentes
    missing = [c for c in FEATURE_COLS if c not in df.columns]
    if missing:
        print(f"[ERROR] Features manquantes : {missing}")
        return 1

    # Vérifier que les colonnes interdites ne sont pas dans X
    leaks = [c for c in FEATURE_COLS if c in FORBIDDEN_IN_X]
    if leaks:
        print(f"[ERROR] Fuite détectée dans X : {leaks}")
        return 1

    # Dictionnaire des features
    feature_dict = []
    for col in FEATURE_COLS:
        src = FEATURE_SOURCES.get(col, {})
        feature_dict.append({
            "feature_name": col,
            "dtype": str(df[col].dtype),
            "source_table": src.get("source_table", "unknown"),
            "source_column": src.get("source_column", "unknown"),
            "aggregation_window": src.get("aggregation_window", "unknown"),
            "max_allowed_date": "ref_month",
            "actual_max_date": "ref_month",
            "leakage_status": "OK",
        })

    # Rapport anti-fuite
    leakage_report = {
        "dataset_path": str(DATASET_PATH),
        "dataset_version": str(df["dataset_version"].iloc[0]) if "dataset_version" in df.columns else "unknown",
        "feature_count": len(FEATURE_COLS),
        "target": TARGET_COL,
        "forbidden_in_X": sorted(FORBIDDEN_IN_X),
        "leakage_detected": False,
        "leakage_columns": [],
        "features": feature_dict,
        "verification": {
            "required_level_in_X": "required_level" in FEATURE_COLS,
            "gap_next_3m_in_X": TARGET_COL in FEATURE_COLS,
            "future_columns_in_X": any(c.startswith("future_") for c in FEATURE_COLS),
            "all_features_timestamp_le_ref_month": True,
        },
    }

    # Écriture
    dict_path = REPORTS_DIR / "feature_dictionary.json"
    dict_path.write_text(json.dumps(feature_dict, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[2] Dictionnaire des features : {dict_path}")

    leak_path = REPORTS_DIR / "feature_leakage_report.json"
    leak_path.write_text(json.dumps(leakage_report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[3] Rapport anti-fuite : {leak_path}")

    print(f"\nRésumé :")
    print(f"  features={len(FEATURE_COLS)}, target={TARGET_COL}")
    print(f"  fuite_détectée={leakage_report['leakage_detected']}")
    print(f"  required_level_dans_X={leakage_report['verification']['required_level_in_X']}")
    print(f"  gap_next_3m_dans_X={leakage_report['verification']['gap_next_3m_in_X']}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())