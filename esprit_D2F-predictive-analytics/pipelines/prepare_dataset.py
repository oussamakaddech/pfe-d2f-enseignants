"""Préparation du dataset d'entraînement avec provenance par ligne.

Ce script transforme le corpus réel (training_corpus_from_db.csv) en un
dataset versionné avec les colonnes de provenance obligatoires :

    source_type, source_id, is_synthetic, created_at, dataset_version

Le pourcentage synthétique est calculé depuis les lignes du dataset, jamais
lu depuis une variable arbitraire.

Usage :
    python -m pipelines.prepare_dataset --dataset-version v1.0.0
"""
from __future__ import annotations

import argparse
import hashlib
import os
from datetime import datetime, timezone
from pathlib import Path

import numpy as np
import pandas as pd

BASE_DIR = Path(__file__).parent.parent
CLEAN_DIR = BASE_DIR / "data" / "clean"
REAL_CORPUS = CLEAN_DIR / "training_corpus_from_db.csv"
SYNTH_CORPUS = CLEAN_DIR / "training_corpus.csv"
OUTPUT_PATH = CLEAN_DIR / "training_corpus_provenanced.csv"

RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)

PROVENANCE_COLUMNS = [
    "source_type",
    "source_id",
    "is_synthetic",
    "created_at",
    "dataset_version",
]


def _dataset_hash(df: pd.DataFrame) -> str:
    canonical = df.copy().sort_values(by=df.columns.tolist()).reset_index(drop=True)
    payload = canonical.to_csv(index=False).encode("utf-8")
    return hashlib.sha256(payload).hexdigest()


def prepare_dataset(dataset_version: str = "v1.0.0") -> pd.DataFrame:
    """Construit le dataset versionné avec provenance par ligne."""
    if not REAL_CORPUS.exists():
        raise FileNotFoundError(
            f"Corpus réel introuvable : {REAL_CORPUS}. "
            "Exécutez d'abord : python -m pipelines.generate_corpus_from_db"
        )

    real = pd.read_csv(REAL_CORPUS)
    if real.empty:
        raise RuntimeError("Corpus réel vide")

    # Provenance : toutes les lignes du corpus réel sont marquées réelles.
    now = datetime.now(timezone.utc).isoformat()
    real["source_type"] = "postgresql_d2f"
    real["source_id"] = real["teacher_id"].astype(str) + "_" + real["competence_id"].astype(str)
    real["is_synthetic"] = False
    real["created_at"] = real.get("date_t", pd.Series([now] * len(real)))
    real["dataset_version"] = dataset_version

    # Le corpus synthétique n'est ajouté QUE si les données réelles sont
    # insuffisantes (honorer l'interdiction de remplacer le réel par le
    # synthétique uniquement pour passer le seuil de provenance).
    min_real = int(os.environ.get("ML_MIN_REAL_ROWS", "50"))
    synth_rows = 0
    df = real
    if len(real) < min_real and SYNTH_CORPUS.exists():
        synth = pd.read_csv(SYNTH_CORPUS)
        if not synth.empty:
            synth["source_type"] = "synthetic_generator"
            synth["source_id"] = synth["teacher_id"].astype(str) + "_" + synth["competence_code"].astype(str)
            synth["is_synthetic"] = True
            synth["created_at"] = now
            synth["dataset_version"] = dataset_version
            common = [c for c in real.columns if c in synth.columns]
            synth = synth[common]
            real = real[common]
            df = pd.concat([real, synth], ignore_index=True)
            synth_rows = len(synth)

    # Tri chronologique stable (pas de shuffle) pour le split temporel.
    if "date_t" in df.columns:
        df = df.sort_values("date_t").reset_index(drop=True)

    df.to_csv(OUTPUT_PATH, index=False)

    total = len(df)
    n_real = int((~df["is_synthetic"]).sum())
    n_synth = int(df["is_synthetic"].sum())
    print(f"[OK] Dataset préparé : {OUTPUT_PATH}")
    print(f"    total={total} réelles={n_real} synthétiques={n_synth}")
    print(f"    synthetic_share_pct={100.0 * n_synth / max(1, total):.2f}%")
    print(f"    dataset_version={dataset_version}")
    print(f"    dataset_hash={_dataset_hash(df)}")
    return df


def main() -> int:
    parser = argparse.ArgumentParser(description="Prépare le dataset avec provenance")
    parser.add_argument("--dataset-version", default="v1.0.0", help="Version du dataset")
    args = parser.parse_args()
    prepare_dataset(args.dataset_version)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())