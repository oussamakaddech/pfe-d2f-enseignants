"""Export du corpus d'entrainement vers le dossier `colab/` (demo Google Colab - jury).

Ce script est LECTURE SEUL sur la base : il rejoue l'extraction officielle
`pipelines.generate_corpus_from_db.main()` deux fois :
  1. sans exclusion  -> corpus BRUT (evaluations reelles + seeds de demonstration) ;
  2. avec --exclude-seeds -> le meme corpus apres application du critere officiel
     `created_by LIKE 'seed%'` du pipeline.
La difference de cles (teacher_id, competence_id, date_t) permet de marquer
`is_demo_seed=1` sur les lignes de demonstration dans le CSV brut, sans rien
recoder : la marque est DERIVEE du pipeline officiel, pas reinventee.

Sorties :
  colab/data/training_corpus_brut_d2f.csv    (brut, + colonne is_demo_seed)
  colab/data/training_corpus_serve_v130.csv  (corpus servi v1.3.0, copie)
  colab/data/training_corpus_from_db_217.csv (copie de l'extraction anterieure)

Usage :
  set DATABASE_URL=postgresql://d2f:d2fpasswd@localhost:7432/d2f
  python colab/export_corpus_colab.py
"""
from __future__ import annotations

import os
import shutil
import sys
from pathlib import Path

import pandas as pd

BASE_DIR = Path(__file__).resolve().parent.parent  # esprit_D2F-predictive-analytics
sys.path.insert(0, str(BASE_DIR))

from pipelines import generate_corpus_from_db as gen  # noqa: E402

COLAB_DATA = Path(__file__).resolve().parent / "data"
COLAB_DATA.mkdir(parents=True, exist_ok=True)

DB_URL = os.environ.get("DATABASE_URL", "postgresql://d2f:d2fpasswd@localhost:7432/d2f")
os.environ["DATABASE_URL"] = DB_URL

RAW_OUT = COLAB_DATA / "training_corpus_brut_d2f.csv"
SERVED_OUT = COLAB_DATA / "training_corpus_serve_v130.csv"
LEGACY_OUT = COLAB_DATA / "training_corpus_from_db_217.csv"

KEY = ["teacher_id", "competence_id", "date_t"]


def main() -> None:
    print("1/3 extraction BRUTE (seeds inclus)...")
    raw = gen.main(grain="competence", exclude_seeds=False,
                   output_path=RAW_OUT, dataset_version="v1.3.0")

    print("2/3 extraction SANS seeds (critere officiel created_like 'seed%')...")
    real = gen.main(grain="competence", exclude_seeds=True,
                    output_path=COLAB_DATA / "_tmp_real.csv", dataset_version="v1.3.0")

    real_keys = set(map(tuple, real[KEY].values))
    raw["_key"] = list(map(tuple, raw[KEY].values))
    raw["is_demo_seed"] = (~raw["_key"].isin(real_keys)).astype(int)
    raw = raw.drop(columns="_key")

    n_seed = int(raw["is_demo_seed"].sum())
    print(f"   brut={len(raw)} lignes | seeds de demonstration marques={n_seed} "
          f"| reelles={len(raw) - n_seed}")

    raw.to_csv(RAW_OUT, index=False)
    (COLAB_DATA / "_tmp_real.csv").unlink(missing_ok=True)

    print("3/3 copies du corpus servi v1.3.0 et de l'extraction anterieure...")
    shutil.copyfile(BASE_DIR / "data" / "clean" / "training_corpus_provenanced.csv", SERVED_OUT)
    shutil.copyfile(BASE_DIR / "data" / "clean" / "training_corpus_from_db.csv", LEGACY_OUT)

    served = pd.read_csv(SERVED_OUT)
    served_keys = set(map(tuple, served[KEY].values))
    raw_keys = set(map(tuple, raw[KEY].values))
    print(f"[OK] corpus servi v1.3.0 : {len(served)} lignes, "
          f"incluses dans le brut sans seeds : {len(served_keys & raw_keys)}/{len(served_keys)}")
    print(f"[OK] fichiers ecrits dans {COLAB_DATA}")


if __name__ == "__main__":
    main()
