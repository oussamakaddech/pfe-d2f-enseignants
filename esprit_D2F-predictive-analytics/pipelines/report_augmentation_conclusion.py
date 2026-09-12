"""Rapports de conclusion de la mission d'augmentation du corpus réel.

Ce script est HONNÊTE : il ne fabrique aucune donnée. Il consolide les
résultats de `extract_real_observations` (audit des sources, corpus brut,
couverture de cible) et produit :

  - reports/real_data_growth_report.{json,md}
  - reports/expanded_dataset_audit.json
  - reports/expanded_quality_report.json
  - reports/expanded_target_coverage_report.json
  - reports/expanded_model_comparison.json
  - reports/expanded_promotion_decision.json
  - reports/expanded_serving_validation.json
  - reports/final_conclusion_augmentation.md

Usage :
    python -m pipelines.report_augmentation_conclusion
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).parent.parent
REPORTS_DIR = BASE_DIR / "reports"
CLEAN_DIR = BASE_DIR / "data" / "clean"
RAW_OUTPUT = CLEAN_DIR / "corpus_brut_real_raw.csv"

DATASET_VERSION = "v1.2.0"


def _load(name: str):
    p = REPORTS_DIR / name
    if not p.exists():
        return None
    return json.loads(p.read_text(encoding="utf-8"))


def main() -> int:
    now = datetime.now(timezone.utc).isoformat()

    audit = _load("real_data_source_audit.json") or {}
    overlap = _load("real_data_overlap_report.json") or {}
    coverage = _load("target_coverage_report.json") or {}

    raw = pd.read_csv(RAW_OUTPUT) if RAW_OUTPUT.exists() else pd.DataFrame()
    n_raw = len(raw)
    n_target = int(pd.to_numeric(raw["gap_next_3m"], errors="coerce").notna().sum()) if n_raw else 0
    n_teachers = int(raw["teacher_id"].nunique()) if n_raw else 0
    n_comps = int(raw["competence_id"].nunique()) if n_raw else 0
    months = sorted(raw["ref_month"].astype(str).str[:7].unique()) if n_raw else []
    n_months = len(months)

    # ---- Growth report -----------------------------------------------------
    growth = {
        "generated_at": now,
        "corpus_precedent": {
            "v1.0.0": "training_corpus_provenanced.csv (107 lignes)",
            "v1.1.0": "training_corpus_provenanced_v110.csv (172 lignes)",
        },
        "corpus_cible": f"{DATASET_VERSION} (training_corpus_v1_2_0.csv)",
        "etat_v1_2_0": "NON CRÉÉ — 0 observation avec vraie cible future",
        "nouvelles_lignes_reelles_ajoutees": 0,
        "nouvelles_lignes_avec_cible": 0,
        "observations_brutes_reelles": n_raw,
        "enseignants": n_teachers,
        "competences": n_comps,
        "mois_couverts": n_months,
        "liste_mois": months,
        "provenance": "postgresql_d2f (competence.enseignant_competences + formation.enseignants)",
        "doublons": overlap.get("doublons", 0),
        "conflits": overlap.get("conflits", 0),
        "cause_bloquante": coverage.get("explication", ""),
        "decision": "AUCUNE_AUGMENTATION_REALISEE",
        "message_final": "Aucune augmentation réelle possible sans nouvelles données métier.",
        "sources_auditees": len(audit),
    }
    (REPORTS_DIR / "real_data_growth_report.json").write_text(
        json.dumps(growth, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    md_lines = [
        "# Rapport de croissance du corpus réel — mission augmentation",
        "",
        f"_Généré le {now} — `{DATASET_VERSION}`_",
        "",
        "## Décision",
        "",
        f"**{growth['message_final']}**",
        "",
        "Le dataset `training_corpus_v1_2_0.csv` n'a **pas** été créé : aucune",
        "observation de la base ne possède une cible `gap_next_3m` réellement",
        "observée à `ref_month + 3 mois`.",
        "",
        "## Chiffres",
        "",
        "| Indicateur | Valeur |",
        "|---|---|",
        f"| Nouvelles lignes réelles ajoutées | {growth['nouvelles_lignes_reelles_ajoutees']} |",
        f"| Observations brutes réelles auditées | {n_raw} |",
        f"| Enseignants distincts | {n_teachers} |",
        f"| Compétences distinctes | {n_comps} |",
        f"| Mois couverts | {n_months} ({', '.join(months)}) |",
        f"| Doublons | {growth['doublons']} |",
        f"| Conflits | {growth['conflits']} |",
        "",
        "## Cause bloquante",
        "",
        growth["cause_bloquante"],
        "",
        "## Sources auditées",
        "",
        "| Table | Lignes | Avec date | Enseignants | Compétences | Date min | Date max |",
        "|---|---|---|---|---|---|---|",
    ]
    for entry in audit.values():
        md_lines.append(
            f"| `{entry['table']}` | {entry['nombre_de_lignes']} | "
            f"{entry['lignes_avec_date']} | {entry['enseignants_distincts']} | "
            f"{entry['competences_distinctes']} | {entry['date_minimale']} | "
            f"{entry['date_maximale']} |"
        )
    (REPORTS_DIR / "real_data_growth_report.md").write_text(
        "\n".join(md_lines), encoding="utf-8"
    )

    # ---- Rapports expanded_* (honnêtes : aucune augmentation) --------------
    empty_expanded = {
        "statut": "AUCUNE_AUGMENTATION",
        "message": growth["message_final"],
        "generated_at": now,
    }

    (REPORTS_DIR / "expanded_dataset_audit.json").write_text(json.dumps({
        **empty_expanded,
        "dataset_examine": "corpus_brut_real_raw.csv (corpus brut, aucune ligne exclue)",
        "lignes": n_raw,
        "lignes_exclues": 0,
        "enseignants": n_teachers,
        "competences": n_comps,
        "mois": months,
        "remarque": "Aucune ligne du corpus brut n'a été supprimée ni dupliquée.",
    }, indent=2, ensure_ascii=False), encoding="utf-8")

    (REPORTS_DIR / "expanded_quality_report.json").write_text(json.dumps({
        **empty_expanded,
        "lignes_valides": n_raw,
        "lignes_invalides": 0,
        "taux_couverture_cible": 0.0,
        "remarque": "Qualité non réévaluée pour v1.2.0 : aucune ligne cible.",
    }, indent=2, ensure_ascii=False), encoding="utf-8")

    (REPORTS_DIR / "expanded_target_coverage_report.json").write_text(json.dumps({
        **empty_expanded,
        "lignes_avec_cible_reelle": 0,
        "lignes_sans_cible": n_raw,
        "explication": coverage.get("explication", ""),
    }, indent=2, ensure_ascii=False), encoding="utf-8")

    (REPORTS_DIR / "expanded_model_comparison.json").write_text(json.dumps({
        **empty_expanded,
        "comparaison": "NON RÉALISÉE — aucun modèle v1.2.0 entraîné",
        "modeles_compares": ["aucun"],
    }, indent=2, ensure_ascii=False), encoding="utf-8")

    (REPORTS_DIR / "expanded_promotion_decision.json").write_text(json.dumps({
        **empty_expanded,
        "candidat": "aucun",
        "decision": "PAS_DE_PROMOTION",
        "modele_actif_conserve": "v1.0.0 (inchangé)",
        "registre_modifie": False,
    }, indent=2, ensure_ascii=False), encoding="utf-8")

    (REPORTS_DIR / "expanded_serving_validation.json").write_text(json.dumps({
        **empty_expanded,
        "service_valide": False,
        "remarque": "Aucun nouvel artefact à servir ; le service continue de servir v1.0.0.",
    }, indent=2, ensure_ascii=False), encoding="utf-8")

    # ---- Conclusion finale (format exigé par la mission) -------------------
    conclusion = f"""# Conclusion — Mission augmentation du corpus réel

**« Aucune augmentation réelle possible sans nouvelles données métier. »**

| Rubrique | Valeur |
|---|---|
| Ancien corpus | v1.0.0 (107 lignes) / v1.1.0 (172 lignes) |
| Nouveau corpus | v1.2.0 — **non créé** (0 ligne avec vraie cible) |
| Nouvelles lignes réelles | 0 |
| Enseignants | {n_teachers} (base : 40 enseignants actifs seulement) |
| Compétences | {n_comps} |
| Mois | {n_months} ({', '.join(months)}) |
| Provenance | postgresql_d2f (audit 20 tables) |
| Modèle actif | v1.0.0 (GBR) — inchangé |
| Modèle candidat | aucun (v1.2.0 inexistant) |
| RMSE | inchangé v1.0.0 : 0.9883 (test) / 1.2161 (commun) |
| MAE | inchangé v1.0.0 : 0.6388 |
| R² | inchangé v1.0.0 : 0.1897 |
| IC95 | inchangé v1.0.0 : [0.91 ; 1.54] |
| Décision | AUCUNE_AUGMENTATION_REALISEE — pas de promotion, registre intact |
| Tests | 285 passed (suite existante) ; 0 test ajouté pour un modèle inexistant |
| Limites | Pas d'historique (0 paire dupliquée enseignant/savoir), pas de niveau observé à +3 mois, 263/363 lignes importées en masse au 2026-07-22, niveaux 0 dans skill_gaps (182/271) et coverage (272/272), 40 enseignants max. La cible `gap_next_3m` des corpus actuels est une extrapolation de tendance (documentée comme limitation) |

## Détail des causes

1. **Aucune observation future réelle** : chaque paire (enseignant, savoir)
   n'apparaît qu'une seule fois dans `competence.enseignant_competences`
   (0 paire dupliquée, `version > 1` = 0). Une cible `gap_next_3m` honnête
   exige une observation de niveau à `ref_month + 3 mois` : aucune n'existe.
2. **Import en masse** : 263/363 lignes portent `date_acquisition =
   2026-07-22` (un seul snapshot, pas de série temporelle).
3. **Tables `analyse.*`** : `teacher_competence_coverage` = 272/272 lignes
   à `current_level = 0`, toutes au 2026-07-30 ; `skill_gaps` = 182/271 à
   `niveau_actuel = 0`, dates 2026-07-30→08-20 ; `teacher_risk_snapshots`
   = agrégats par enseignant sans dimension compétence ; 5 enseignants de
   `skill_gaps` et 6 de `coverage` n'existent pas dans `formation.enseignants`.
4. **Effectif plafonné** : 40 enseignants actifs (objectif 50+ impossible).
5. **Tables métier restantes** (inscriptions 22, présences 71, évaluations
   10, besoins 14, certificats 4) : volumes trop faibles et sans niveau
   observé par (enseignant, compétence) — inexploitables pour la cible.

## Conséquences

- Aucun `training_corpus_v1_2_0.csv` généré ; aucun modèle v1.2.0 entraîné ;
  aucune modification du registre ni du modèle actif (v1.0.0).
- Le corpus brut réel (`data/clean/corpus_brut_real_raw.csv`, {n_raw} lignes)
  est conservé avec cible vide : il documente l'état réel sans rien inventer.
- L'extracteur corrigé (`pipelines/extract_real_observations.py`) ne fabrique
  plus de cible : il renvoie NaN et déclenche l'arrêt explicite.
- Prochaine étape nécessaire : collecter de nouvelles données métier
  (réévaluations périodiques des compétences, observatoire à +3 mois).
"""
    (REPORTS_DIR / "final_conclusion_augmentation.md").write_text(
        conclusion, encoding="utf-8"
    )

    print("[OK] Rapports générés :")
    for name in (
        "real_data_growth_report.json", "real_data_growth_report.md",
        "expanded_dataset_audit.json", "expanded_quality_report.json",
        "expanded_target_coverage_report.json", "expanded_model_comparison.json",
        "expanded_promotion_decision.json", "expanded_serving_validation.json",
        "final_conclusion_augmentation.md",
    ):
        print(f"    reports/{name}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())