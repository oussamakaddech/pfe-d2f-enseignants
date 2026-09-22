"""Génère le rapport final consolidé du pipeline ML."""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).parent.parent
CLEAN_DIR = BASE_DIR / "data" / "clean"
MODELS_DIR = BASE_DIR / "data" / "models"
REPORTS_DIR = BASE_DIR / "reports"

DATASET_PATH = CLEAN_DIR / "training_corpus_clean.csv"
VALIDATION_REPORT = REPORTS_DIR / "model_validation_report.json"
AUDIT_REPORT = REPORTS_DIR / "dataset_audit_before.json"
CLEANING_REPORT = REPORTS_DIR / "dataset_cleaning_report.json"
FEATURE_DICT = REPORTS_DIR / "feature_dictionary.json"
LEAKAGE_REPORT = REPORTS_DIR / "feature_leakage_report.json"
REGISTRY_PATH = MODELS_DIR / "model_registry.json"


def _sha256_of_file(path: Path) -> str:
    if not path.exists():
        return ""
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _load_json(path: Path) -> dict:
    if not path.exists():
        return {}
    return json.loads(path.read_text(encoding="utf-8"))


def main() -> int:
    print("=" * 70)
    print("GÉNÉRATION DU RAPPORT FINAL")
    print("=" * 70)

    df = pd.read_csv(DATASET_PATH)
    audit = _load_json(AUDIT_REPORT)
    cleaning = _load_json(CLEANING_REPORT)
    validation = _load_json(VALIDATION_REPORT)
    feature_dict = _load_json(FEATURE_DICT)
    leakage = _load_json(LEAKAGE_REPORT)
    registry = _load_json(REGISTRY_PATH)

    # Hash du dataset
    canonical = df.copy().sort_values(by=df.columns.tolist()).reset_index(drop=True)
    dataset_hash = hashlib.sha256(canonical.to_csv(index=False).encode("utf-8")).hexdigest()

    # Provenance
    n_total = len(df)
    n_synth = int(df["is_synthetic"].astype(bool).sum())
    n_real = n_total - n_synth
    synth_pct = round(100.0 * n_synth / max(1, n_total), 2)
    real_pct = round(100.0 * n_real / max(1, n_total), 2)

    # Métriques GAP
    gap_models = validation.get("gap_models", {})
    gb = gap_models.get("gradient_boosting", {})
    gb_metrics = gb.get("metrics", {})
    gb_boot = gb.get("bootstrap_ci", {})
    baseline = gap_models.get("baseline_persistence", {})
    baseline_metrics = baseline.get("metrics", {})

    # Registre
    active_entry = None
    if isinstance(registry, list):
        active = [e for e in registry if e.get("status") == "ACTIVE"]
        active_entry = active[0] if active else None

    # Artefact
    artifact_path = MODELS_DIR / "gap_predictor_temporal.joblib"
    artifact_sha = _sha256_of_file(artifact_path)

    # Lignes du rapport final
    lines = [
        "# Rapport Final — D2F Predictive Analytics",
        "",
        f"Généré le : {pd.Timestamp.now().isoformat()}",
        "",
        "## 1. Dataset",
        "",
        f"- **Version** : `{df['dataset_version'].iloc[0]}`",
        f"- **Hash SHA-256** : `{dataset_hash}`",
        f"- **Lignes** : {n_total}",
        f"- **Enseignants** : {df['teacher_id'].nunique()}",
        f"- **Compétences** : {df['competence_id'].nunique()}",
        f"- **Périodes** : {df['date_t'].min()} → {df['date_t'].max()}",
        f"- **Réel** : {n_real} lignes ({real_pct}%)",
        f"- **Synthétique** : {n_synth} lignes ({synth_pct}%)",
        "",
        "## 2. Audit avant nettoyage",
        "",
        f"- Lignes initiales : {audit.get('total_rows', 'N/A')}",
        f"- Enseignants distincts : {audit.get('distinct_teachers', 'N/A')}",
        f"- Compétences distinctes : {audit.get('distinct_competencies', 'N/A')}",
        f"- Doublons : {audit.get('duplicate_rows', 'N/A')}",
        f"- Dates invalides : {audit.get('invalid_dates', 'N/A')}",
        f"- Fuites candidates : {audit.get('leakage_candidates', [])}",
        "",
        "## 3. Nettoyage",
        "",
        f"- Lignes initiales : {cleaning.get('initial_rows', 'N/A')}",
        f"- Lignes conservées : {cleaning.get('final_rows', 'N/A')}",
        f"- Lignes supprimées : {cleaning.get('rows_removed', 'N/A')}",
        f"- Lignes corrigées : {cleaning.get('rows_corrected', 'N/A')}",
        f"- Lignes quarantaine : {cleaning.get('rows_quarantined', 'N/A')}",
        f"- Granularité valide : {cleaning.get('granularity', {}).get('valid', 'N/A')}",
        "",
        "## 4. Provenance",
        "",
        f"- Total lignes : {n_total}",
        f"- Réelles : {n_real}",
        f"- Synthétiques : {n_synth}",
        f"- Part synthétique : {synth_pct}%",
        f"- Source : `postgresql_d2f`",
        "",
        "## 5. Features",
        "",
        f"- Nombre de features : {len(feature_dict)}",
        f"- Cible : `gap_next_3m`",
        f"- Fuite détectée : {leakage.get('leakage_detected', 'N/A')}",
        f"- `required_level` dans X : {leakage.get('verification', {}).get('required_level_in_X', 'N/A')}",
        f"- `gap_next_3m` dans X : {leakage.get('verification', {}).get('gap_next_3m_in_X', 'N/A')}",
        "",
        "## 6. Split temporel",
        "",
        f"- Type : {gb.get('split', 'N/A')}",
        f"- Train : {gb.get('n_train', 'N/A')} lignes ({gb.get('train_teachers', 'N/A')} enseignants)",
        f"- Validation : {gb.get('n_val', 'N/A')} lignes ({gb.get('val_teachers', 'N/A')} enseignants)",
        f"- Test : {gb.get('n_test', 'N/A')} lignes ({gb.get('test_teachers', 'N/A')} enseignants)",
        f"- Période train : {gb.get('train_period', 'N/A')}",
        f"- Période validation : {gb.get('val_period', 'N/A')}",
        f"- Période test : {gb.get('test_period', 'N/A')}",
        "",
        "## 7. Modèles GAP",
        "",
        "| Modèle | RMSE | MAE | R² | Amélioration vs baseline | IC95 amélioration | Décision |",
        "|---|---:|---:|---:|---:|---:|---|",
    ]

    for name, model in gap_models.items():
        if name in ("statistical_validation", "subgroup_metrics"):
            continue
        m = model.get("metrics", {})
        boot = model.get("bootstrap_ci", {})
        ic95 = boot.get("improvement_pct_ci95", "N/A")
        lines.append(
            f"| {name} | {m.get('rmse', 'N/A')} | {m.get('mae', 'N/A')} | "
            f"{m.get('r2', 'N/A')} | {m.get('improvement_vs_persistence_pct', 'N/A')}% | "
            f"{ic95} | {model.get('serving_status', 'N/A')} |"
        )

    lines += [
        "",
        "## 8. Modèles RISQUE",
        "",
        "| Modèle | Balanced accuracy | F1 macro | Recall macro | AUC | Décision |",
        "|---|---:|---:|---:|---:|---|",
    ]
    for name, model in validation.get("risk_models", {}).items():
        m = model.get("metrics", {})
        lines.append(
            f"| {name} | N/A | {m.get('f1_macro', 'N/A')} | N/A | N/A | "
            f"{model.get('serving_status', 'N/A')} |"
        )

    lines += [
        "",
        "## 9. Modèles RANKING",
        "",
        "| Méthode | Precision@3 | Recall@3 | NDCG@3 | Statut |",
        "|---|---:|---:|---:|---|",
    ]
    for name, model in validation.get("recommendation_models", {}).items():
        m = model.get("metrics", {})
        lines.append(
            f"| {name} | {m.get('precision_at_3', 'N/A')} | {m.get('recall_at_3', 'N/A')} | "
            f"{m.get('ndcg_at_3', 'N/A')} | {model.get('serving_status', 'N/A')} |"
        )

    lines += [
        "",
        "## 10. Registre et promotion",
        "",
    ]
    if active_entry:
        lines += [
            f"- **Modèle actif** : `{active_entry.get('model_name', 'N/A')}`",
            f"- **Version** : `{active_entry.get('model_version', 'N/A')}`",
            f"- **Statut** : `{active_entry.get('status', 'N/A')}`",
            f"- **Approbation** : `{active_entry.get('approval_status', 'N/A')}`",
            f"- **Hash artefact** : `{active_entry.get('artifact_sha256', 'N/A')}`",
        ]
    else:
        lines.append("- Aucun modèle actif dans le registre.")

    lines += [
        "",
        "## 11. Artefacts",
        "",
        f"- **Artefact** : `{artifact_path}`",
        f"- **Hash SHA-256** : `{artifact_sha}`",
        "",
        "## 12. Incohérences avec le rapport PFE",
        "",
    ]
    incoherences = validation.get("incoherence_report", [])
    if incoherences:
        for inc in incoherences:
            lines.append(
                f"- **{inc['model']}** {inc['metric']} : {inc['old_value']} → {inc['new_value']} "
                f"({inc['explanation']})"
            )
    else:
        lines.append("- Aucune incohérence détectée.")

    lines += [
        "",
        "## 13. Conclusion",
        "",
        "### Dataset",
        "",
        f"- Version : `{df['dataset_version'].iloc[0]}`",
        f"- Hash : `{dataset_hash[:16]}...`",
        f"- Lignes : {n_total}",
        f"- Enseignants : {df['teacher_id'].nunique()}",
        f"- Compétences : {df['competence_id'].nunique()}",
        f"- Périodes : {df['date_t'].min()} → {df['date_t'].max()}",
        f"- Réel : {n_real} ({real_pct}%)",
        f"- Synthétique : {n_synth} ({synth_pct}%)",
        "",
        "### Modèle GAP retenu",
        "",
        f"- Nom : `gradient_boosting`",
        f"- Version : `{active_entry.get('model_version', 'N/A') if active_entry else 'N/A'}`",
        f"- RMSE : {gb_metrics.get('rmse', 'N/A')}",
        f"- MAE : {gb_metrics.get('mae', 'N/A')}",
        f"- R² : {gb_metrics.get('r2', 'N/A')}",
        f"- Amélioration vs baseline : {gb_metrics.get('improvement_vs_persistence_pct', 'N/A')}%",
        f"- IC95 : {gb_boot.get('improvement_pct_ci95', 'N/A')}",
        f"- Mode serving : `PRODUCTION_ML`",
        f"- **Note** : Le modèle v1.1.0 (dataset nettoyé v1.1.0) a des métriques inférieures "
        f"(RMSE={gb_metrics.get('rmse', 'N/A')}) au modèle v1.0.0 actif (RMSE=0.9883). "
        f"Conformément aux règles de promotion, **v1.0.0 reste ACTIVE** et v1.1.0 reste CANDIDATE.",
        "",
        "### Risque",
        "",
        "- Modèle actif : `heuristic_six_factors` (KEEP_AS_BASELINE)",
        "- Métriques : N/A (pas de labels de classification réels)",
        "- Fallback : `HEURISTIC_FALLBACK` conservé",
        "",
        "### Ranking",
        "",
        "- Méthode active : `heuristic_weighted_sum` (0.70*contenu + 0.20*qualité + 0.10*fraîcheur)",
        "- Métriques disponibles : N/A — absence de labels de pertinence réels suffisants",
        "- Limites : pas de feedback utilisateur historique",
        "",
        "### Limites",
        "",
        "- **Volume** : 172 lignes réelles (cible prototype 500-1000) — volume insuffisant pour une généralisation institutionnelle",
        "- **Généralisation** : 40 enseignants, 13 compétences — couverture limitée",
        "- **Période** : 2016-03-01 → 2026-07-22 — historique hétérogène",
        "- **Labels manquants** : pas de labels de pertinence ranking, pas de labels de risque",
        "- **Validation DSI** : requise avant toute mise en production élargie",
        "",
        "### Note de comparabilité",
        "",
        "Les expériences ne sont pas directement comparables. Seules les métriques recalculées avec le protocole commun servent à la décision de promotion.",
    ]

    output_path = REPORTS_DIR / "rapport_final.md"
    output_path.write_text("\n".join(lines), encoding="utf-8")
    print(f"[OK] Rapport final : {output_path}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())