"""Constantes et utilitaires partagés du pipeline démo synthétique.

Ce module est le socle commun du pipeline expérimental DEMO_ML :
contrat de colonnes, hash canoniques, échelle de niveaux.

AVERTISSEMENT : tout dataset produit ici est 100 % synthétique
(``data_origin=SYNTHETIC``, ``is_synthetic=true``,
``institutional_verified=false``). Il ne doit jamais être présenté
comme institutionnel ni promu en PRODUCTION_ML.
"""
from __future__ import annotations

import hashlib
from typing import Iterable

import pandas as pd

SCALE_MIN = 1.0
SCALE_MAX = 5.0
GAP_MIN = 0.0
GAP_MAX = 5.0

DEMO_MODEL_NAME = "gap_predictor_temporal"
DEMO_MODEL_VERSION = "demo-gap-synthetic-v1.0.0"
DATASET_VERSION_DEFAULT = "synthetic-v1.0.0"
GENERATOR_ID = "synthetic_generator"

TEACHER_PREFIX = "SYN_T"

TARGET_COL = "gap_next_3m"

FEATURE_NAMES = [
    "current_level_t3", "current_level_t2", "current_level_t1", "current_level_t",
    "lag_gap_t3_t2", "lag_gap_t2_t1", "lag_gap_t1_t", "rolling_tendance",
    "days_since_last_training", "training_frequency_per_month", "is_long_absent", "is_stagnant",
    "avg_level", "min_level", "max_level", "nb_level_5", "nb_level_1",
    "nb_savoirs", "nb_competences", "competency_coverage_rate",
    "nb_formations_completed", "nb_formations_in_progress", "taux_assiduite",
    "nb_besoins_exprimes", "nb_besoins_approuves", "avg_eval_score", "nb_evaluations",
    "months_since_last_training", "engagement_score",
]

# Colonnes qui fuiraient la cible si elles entraient dans X.
FORBIDDEN_IN_X = frozenset({
    TARGET_COL,
    "future_gap", "future_observation", "future_evaluation", "future_attendance",
    "required_level", "required_level_t", "future_level_t3", "future_level_ref",
    "current_observation",  # observation pédagogique du mois courant — proxy, jamais feature
    "knowledge_difficulty_level",  # difficulté du savoir, pas une maîtrise enseignant
})

REQUIRED_COLUMNS = [
    "teacher_id", "competence_id", "department_id", "unit_id", "ref_month",
    "current_observation", "knowledge_difficulty_level", "gap_next_3m",
    "attendance_rate", "evaluation_score", "training_count",
    "stagnation_months", "need_count", "engagement_score",
    "date_t",
    *FEATURE_NAMES,
    "source_type", "source_id", "data_origin", "is_synthetic",
    "institutional_verified", "generation_seed", "generator_version",
    "dataset_version", "created_at",
]

PROVENANCE_COLUMNS = ["source_type", "source_id", "is_synthetic", "created_at", "dataset_version"]

DATASET_KIND = "demo-synthetic"


def canon_text(payload: str) -> bytes:
    """Normalisation canonique : UTF-8, CRLF -> LF, newline final."""
    text = payload.replace("\r\n", "\n").replace("\r", "\n")
    if not text.endswith("\n"):
        text += "\n"
    return text.encode("utf-8")


def canonical_df_hash(df: pd.DataFrame) -> str:
    """Hash canonique du dataset : colonnes ordonnées, lignes triées,
    index réinitialisé, UTF-8/LF, newline final (identique à
    ``dataset_provenance.file_hash`` + normalisation des fins de ligne)."""
    if df is None or df.empty:
        return hashlib.sha256(canon_text("")).hexdigest()
    canonical = df.copy().sort_values(by=df.columns.tolist()).reset_index(drop=True)
    payload = canonical.to_csv(index=False, lineterminator="\n")
    return hashlib.sha256(canon_text(payload)).hexdigest()


def schema_hash(feature_names: Iterable[str]) -> str:
    """Hash stable du contrat de features (ordre canonique alphabétique)."""
    payload = "\n".join(sorted(feature_names))
    return hashlib.sha256(canon_text(payload)).hexdigest()


def sha256_file(path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def coerce_bool(value) -> bool:
    if value is None:
        return False
    if isinstance(value, bool):
        return value
    if isinstance(value, (int, float)):
        return bool(value)
    return str(value).strip().lower() in ("1", "true", "yes", "oui", "vrai")
