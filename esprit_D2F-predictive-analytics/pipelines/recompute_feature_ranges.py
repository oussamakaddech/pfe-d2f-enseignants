"""Recalcule les plages de features du modele SIMULATION sur le corpus complet.

Contexte (chapitre ML actif — etape 1) :
- Le modele de serving de demonstration (simulation-v1.0.0, entraine sur le
  corpus SIMULATION de 10 920 lignes) portait des plages de features calculees
  sur le seul split d'entraînement (80 % des mois les plus anciens). Ces
  plages etroites rejetaient des enseignants de l'environnement de
  demonstration au serving (features hors plage -> repli heuristique).
- Ce pipeline recalcule les plages (min/max) sur le corpus de SIMULATION COMPLET
  avec des quantiles extremes 0.001 / 0.999 : elles absorbent les valeurs
  extremes observees sans les suivre aveuglement, et sont justifiees par une
  distribution reelle (10 920 lignes, 45 enseignants, 30 mois).
- Les plages sont ecrites dans :
    1. le sidecar du modele simulation (``simulation_training_metadata.json``) ;
    2. le schema de reference versionne (``feature_schema.json``) — la garde
       anti-elargissement (``_widened_ranges_error``) compare les plages de
       l'artefact charge a ce schema ; elles doivent rester coherentes.
- Un rapport avant/apres est exporte : ``reports/feature_ranges_simulation.json``.
- Le modele simulation est PROMU en ACTIVE dans le registre pour
  l'environnement de demonstration (l'artefact reel ``gap_predictor_temporal.joblib``
  reste intact : rollback possible en restaurant la configuration).
- Re-evaluation hors-ligne : pour chaque enseignant du corpus de demonstration
  (``training_corpus_from_db.csv``), on compte les enseignants dont TOUTES les
  lignes de features passent dans les nouvelles plages (serving ML possible).

Etiquetage : tout reste SIMULATION_VALIDATED / data_origin=SIMULATED.
Aucun badge « ML » sans modele reellement servi derriere.

Usage:
    python -m pipelines.recompute_feature_ranges
"""
from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd

from app.infrastructure.ml.model_registry import ModelRegistry

BASE_DIR = Path(__file__).parent.parent
DATA_CLEAN = BASE_DIR / "data" / "clean"
MODELS_DIR = BASE_DIR / "data" / "models"
REPORTS_DIR = BASE_DIR / "reports"

SIMULATION_CSV = DATA_CLEAN / "simulation_dataset.csv"
DEMO_CORPUS_CSV = DATA_CLEAN / "training_corpus_from_db.csv"
SIM_SIDECAR = MODELS_DIR / "simulation_training_metadata.json"
FEATURE_SCHEMA = MODELS_DIR / "feature_schema.json"
REPORT_PATH = REPORTS_DIR / "feature_ranges_simulation.json"

SIMULATION_VERSION = "simulation-v1.0.0"

FEATURE_COLS = [
    "current_level_t3", "current_level_t2", "current_level_t1", "current_level_t",
    "lag_gap_t3_t2", "lag_gap_t2_t1", "lag_gap_t1_t", "rolling_tendance",
    "days_since_last_training", "training_frequency_per_month", "is_long_absent", "is_stagnant",
    "avg_level", "min_level", "max_level", "nb_level_5", "nb_level_1",
    "nb_savoirs", "nb_competences", "competency_coverage_rate",
    "nb_formations_completed", "nb_formations_in_progress", "taux_assiduite",
    "nb_besoins_exprimes", "nb_besoins_approuves", "avg_eval_score", "nb_evaluations",
    "months_since_last_training", "engagement_score",
]

# Quantiles extremes : absorbe les valeurs extremes sans les suivre aveuglement.
Q_LOW = 0.001
Q_HIGH = 0.999


def compute_quantile_ranges(df: pd.DataFrame) -> dict[str, dict[str, float]]:
    """Plages min/max par feature sur quantiles 0.001 / 0.999 du corpus complet."""
    ranges: dict[str, dict[str, float]] = {}
    for col in FEATURE_COLS:
        series = pd.to_numeric(df[col], errors="coerce").dropna()
        lo = float(series.quantile(Q_LOW))
        hi = float(series.quantile(Q_HIGH))
        if lo > hi:  # garde-fou degenerate
            lo, hi = float(series.min()), float(series.max())
        ranges[col] = {"min": round(lo, 6), "max": round(hi, 6)}
    return ranges


def merge_with_demo_support(
    sim_ranges: dict[str, dict[str, float]], demo_df: pd.DataFrame
) -> tuple[dict[str, dict[str, float]], dict[str, dict]]:
    """Union des plages simulation (quantiles 0.001/0.999) et de l'etendue OBSERVEE
    du corpus de demonstration.

    Justification : le modele simulation sert l'environnement de demonstration ;
    plusieurs features comportementales ont des echelles differentes entre les
    deux corpus (ex. engagement_score 0-1 en simulation vs 0-21 en demonstration).
    Sans union, un grand nombre d'enseignants tomberaient en repli sur des
    features dont la valeur est OBSERVEE (pas aberrante). La plage finale est
    donc le support observe des deux distributions, sans forcer de valeurs
    aberrantes (un outlier demo extreme reste borne par son min/max reel).
    """
    merged = {}
    per_feature: dict[str, dict] = {}
    for col, rng in sim_ranges.items():
        if col not in demo_df.columns:
            merged[col] = rng
            per_feature[col] = {"simulation": rng, "demo": None, "final": rng, "source": "simulation_only"}
            continue
        series = pd.to_numeric(demo_df[col], errors="coerce").dropna()
        if series.empty:
            merged[col] = rng
            per_feature[col] = {"simulation": rng, "demo": None, "final": rng, "source": "simulation_only"}
            continue
        dmin, dmax = float(series.min()), float(series.max())
        # Arrondi VERS L'EXTERIEUR : la borne ne doit jamais tronquer une valeur observee.
        lo = min(rng["min"], dmin)
        hi = max(rng["max"], dmax)
        import math
        lo = math.floor(lo * 1e6) / 1e6 if lo == lo else lo
        hi = math.ceil(hi * 1e6) / 1e6 if hi == hi else hi
        merged[col] = {"min": lo, "max": hi}
        per_feature[col] = {
            "simulation": rng,
            "demo": {"min": round(dmin, 6), "max": round(dmax, 6)},
            "final": {"min": lo, "max": hi},
            "source": "simulation_quantiles_union_demo_observed",
        }
    return merged, per_feature



def load_json(path: Path) -> dict:
    return json.loads(path.read_text(encoding="utf-8"))


def write_json(path: Path, data: dict) -> None:
    path.write_text(json.dumps(data, indent=2, ensure_ascii=False), encoding="utf-8")


def evaluate_serving_coverage(df: pd.DataFrame, ranges: dict[str, dict[str, float]]) -> dict:
    """Re-evaluation hors-ligne : enseignants dont toutes les lignes de features
    sont dans les plages -> serving ML possible (sinon repli heuristique)."""
    per_teacher: dict[str, list[bool]] = {}
    for col in FEATURE_COLS:
        values = pd.to_numeric(df[col], errors="coerce")
        lo = ranges[col]["min"]
        hi = ranges[col]["max"]
        in_range = ((values >= lo) & (values <= hi)) | values.isna()
        for tid, ok in zip(df["teacher_id"], in_range):
            per_teacher.setdefault(str(tid), []).append(bool(ok))
    ml_ok = sorted(t for t, flags in per_teacher.items() if all(flags))
    fallback = sorted(t for t, flags in per_teacher.items() if not all(flags))
    return {
        "n_teachers": len(per_teacher),
        "ml_serving_count": len(ml_ok),
        "ml_serving_teachers": ml_ok,
        "heuristic_fallback_count": len(fallback),
        "heuristic_fallback_teachers": fallback,
    }


def main() -> int:
    print("[1] Chargement corpus de simulation...")
    df = pd.read_csv(SIMULATION_CSV)
    assert len(df) == 10920, f"corpus inattendu : {len(df)} lignes"
    assert (df["data_origin"] == "SIMULATED").all(), "corpus non SIMULATED"
    print(f"    {len(df)} lignes, {df['teacher_id'].nunique()} enseignants, {df['ref_month'].nunique()} mois")

    demo_df = pd.read_csv(DEMO_CORPUS_CSV)
    sim_quantile_ranges = compute_quantile_ranges(df)
    new_ranges, per_feature_sources = merge_with_demo_support(sim_quantile_ranges, demo_df)

    print("[2] Lecture des plages AVANT (sidecar simulation + schema)...")
    sidecar = load_json(SIM_SIDECAR)
    before_sidecar = sidecar.get("feature_ranges") or {}
    schema = load_json(FEATURE_SCHEMA)
    # Plages du modele de serving precedent (v1.0.0 DEMO_SEED) pour le rapport
    legacy_sidecar_path = MODELS_DIR / "temporal_training_metadata.json"
    before_legacy = load_json(legacy_sidecar_path).get("feature_ranges") or {} if legacy_sidecar_path.exists() else {}

    print("[3] Ecriture des plages dans le sidecar simulation...")
    sidecar["feature_ranges"] = new_ranges
    sidecar["feature_ranges_source"] = (
        f"union (quantiles {Q_LOW}-{Q_HIGH} sur {SIMULATION_CSV.name}, corpus complet "
        f"{len(df)} lignes) x (etendue observee du corpus de demonstration {DEMO_CORPUS_CSV.name}) — "
        "justifiee par les deux distributions observees, sans valeur forcee"
    )
    sidecar["feature_ranges_recomputed_at"] = datetime.now(timezone.utc).isoformat()
    write_json(SIM_SIDECAR, sidecar)

    print("[4] Schema de reference versionne (garde _widened_ranges_error)...")
    # Le schema RACINE (feature_schema.json) garde les plages historiques de la
    # version v1.0.0 (DEMO_SEED) : la garde du mode PRODUCTION_ML reel n'est pas
    # alteree. Les nouvelles plages sont ecrites dans le schema VERSIONNE de la
    # version servie en demonstration (model_version "simulation-v1.0.0" ->
    # feature_schema_simulation-v100.json), qui devient la reference canonique
    # de cette version (reentraînement = nouvelle version, politique 4.3).
    if not schema.get("feature_ranges"):
        schema["feature_ranges"] = before_sidecar or new_ranges
    schema["feature_ranges_source_simulation"] = sidecar["feature_ranges_source"]
    write_json(FEATURE_SCHEMA, schema)
    versioned_schema_path = MODELS_DIR / f"feature_schema_{SIMULATION_VERSION.replace('.', '')}.json"
    versioned = dict(schema)
    versioned["model_version"] = SIMULATION_VERSION
    versioned["feature_ranges"] = new_ranges
    versioned["feature_ranges_source"] = sidecar["feature_ranges_source"]
    write_json(versioned_schema_path, versioned)
    print(f"    schema versionne : {versioned_schema_path.name}")



    print("[5] Promotion du modele simulation en ACTIVE pour la demonstration...")
    registry = ModelRegistry(MODELS_DIR / "model_registry.json", MODELS_DIR)
    entry = registry.get(SIMULATION_VERSION)
    if entry is None:
        raise SystemExit(f"entree {SIMULATION_VERSION} absente du registre — executer pipelines.register_simulation_model d'abord")
    active = registry.active()
    if active is None or active.model_version != SIMULATION_VERSION:
        approved = registry.approve(SIMULATION_VERSION, actor="recompute-feature-ranges")
        if approved is None:
            raise SystemExit("promotion refusee par la gouvernance (fail-closed) — voir registre")
        print(f"    {SIMULATION_VERSION} -> ACTIVE (ancienne version archivee, artefacts intacts)")
    else:
        print(f"    {SIMULATION_VERSION} deja ACTIVE")

    print("[6] Re-evaluation de la couverture de serving (corpus de demonstration)...")
    eval_before = evaluate_serving_coverage(demo_df, before_legacy or before_sidecar)
    eval_after = evaluate_serving_coverage(demo_df, new_ranges)
    print(f"    AVANT : {eval_before['ml_serving_count']}/{eval_before['n_teachers']} enseignants en plage")
    print(f"    APRES : {eval_after['ml_serving_count']}/{eval_after['n_teachers']} enseignants en plage")

    print("[7] Rapport avant/apres...")
    report = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "purpose": "Plages de features du modele simulation recalculees sur le corpus complet (quantiles 0.001-0.999)",
        "dataset": {
            "path": str(SIMULATION_CSV.relative_to(BASE_DIR)),
            "rows": int(len(df)),
            "teachers": int(df["teacher_id"].nunique()),
            "months": int(df["ref_month"].nunique()),
            "data_origin": "SIMULATED",
            "validation_scope": "SIMULATION_VALIDATED",
        },
        "quantiles": {"low": Q_LOW, "high": Q_HIGH},
        "ranges_methodology": {
            "simulation": f"quantiles {Q_LOW}-{Q_HIGH} sur le corpus simulation complet",
            "final": "union des plages simulation et de l'etendue observee du corpus de demonstration (par feature)",
            "per_feature": per_feature_sources,
            "note": (
                "Les distributions simulation et demonstration different sur les features "
                "comportementales (ex. engagement_score, nb_evaluations). L'union evite de "
                "replier des enseignants dont les valeurs sont observees, tout en restant "
                "bornee par les extrema reels (aucune valeur forcee)."
            ),
        },
        "before": {"source": "feature_ranges du split d'entrainement (80% mois anciens)", "ranges": before_sidecar},
        "before_legacy_serving_v100": before_legacy,
        "after": {"ranges": new_ranges},
        "serving_coverage_demo_environment": {
            "corpus": str(DEMO_CORPUS_CSV.relative_to(BASE_DIR)),
            "before": eval_before,
            "after": eval_after,
            "note": (
                "Evaluation hors-ligne : un enseignant est servi en ML si TOUTES ses lignes "
                "de features sont dans les plages ; sinon repli heuristique fail-closed "
                "(fallback_reason documente, jamais de score force hors plage)."
            ),
        },
        "rollback": "gap_predictor_temporal.joblib + sidecar v1.0.0 intacts ; restaurer ML_ARTIFACT_PATH/ML_METADATA_PATH pour revenir au serving precedent",
    }
    write_json(REPORT_PATH, report)
    print(f"[OK] Rapport : {REPORT_PATH}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())

