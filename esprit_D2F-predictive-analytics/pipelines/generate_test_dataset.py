"""Génère un dataset de TEST de 1500 lignes (mêmes règles que le générateur simulé).

Objectif : jeu de données de test pour vérifier la MÉCANIQUE des modèles et du
pipeline à plus grande échelle (volume, split temporel, gouvernance).

GOUVERNANCE :
  - réutilise le générateur documenté (seed 42, mêmes distributions, mêmes tags)
  - data_origin=SIMULATED, is_synthetic=true, cibles M+3 OBSERVÉES
  - sortie dédiée : data/simulation/simulation_dataset_test1500.csv
  - manifest dédié : reports/simulation_manifest_test1500.json
  - le corpus de production (data/clean/simulation_dataset.csv, 10920 lignes)
    et son rapport NE SONT PAS touchés (sauvegarde/restauration)
  - warning : corpus 100% SIMULÉ -> valide la méthode, PAS la performance réelle

Usage :
    python -m pipelines.generate_test_dataset
"""
from __future__ import annotations

import json
from pathlib import Path

import pandas as pd

from pipelines import generate_simulation_dataset as gen

TARGET_ROWS = 1500
OUT_CSV = gen.BASE_DIR / "data" / "simulation" / "simulation_dataset_test1500.csv"
OUT_MANIFEST = gen.REPORTS_DIR / "simulation_manifest_test1500.json"
GEN_REPORT = gen.REPORTS_DIR / "simulation_generation_report.json"

# Dimensions reduites : 45 enseignants (5 departements reels) x 12 mois
# -> fenetre d'observation = 12 - 7 = 5 mois -> ~1800 lignes, retaillees a 1500
N_TEACHERS = 45
N_MONTHS = 12


def main() -> int:
    backup = GEN_REPORT.read_bytes() if GEN_REPORT.exists() else None

    gen.N_TEACHERS = N_TEACHERS
    gen.N_MONTHS = N_MONTHS

    print(f"[1] Generation (seed 42, {N_TEACHERS} enseignants, {N_MONTHS} mois)...")
    manifest = gen.generate_simulation_dataset(
        seed=42, output_path=OUT_CSV, manifest_path=OUT_MANIFEST
    )
    print(f"    -> {manifest['n_rows']} lignes, {manifest['n_teachers']} enseignants, "
          f"{manifest['n_months']} mois")

    if backup is not None:
        GEN_REPORT.write_bytes(backup)
        print("[2] Rapport de generation de production restaure (non touche)")

    df = pd.read_csv(OUT_CSV)
    if len(df) > TARGET_ROWS:
        df = df.sample(n=TARGET_ROWS, random_state=42).sort_values(
            ["teacher_id", "ref_month", "competence_id"]).reset_index(drop=True)
        print(f"[3] Retaillement deterministe : {manifest['n_rows']} -> {len(df)} lignes (seed 42)")

    gen._write_csv(df, OUT_CSV)
    dataset_hash = gen._canonical_hash(df)

    assert (df["data_origin"] == "SIMULATED").all()
    assert df["is_synthetic"].astype(str).str.lower().isin(["true", "1"]).all()
    assert df["is_extrapolated"].astype(str).str.lower().eq("false").all()
    assert df["target_observation_date"].notna().all()
    assert not (df["data_origin"] == gen.FORBIDDEN_ORIGIN).any()

    stats = {
        "n_rows": int(len(df)),
        "n_teachers": int(df["teacher_id"].nunique()),
        "n_months": int(df["ref_month"].nunique()),
        "n_competences": int(df["competence_id"].nunique()),
        "rows_per_month_mean": round(float(len(df) / df["ref_month"].nunique()), 1),
        "data_origin": "SIMULATED",
        "is_synthetic": True,
        "is_extrapolated": False,
        "generator_version": gen.GENERATOR_VERSION,
        "seed": 42,
        "dataset_hash_canonical": dataset_hash,
        "usage": "test de mecanique ML / pipeline - JAMAIS presente comme performance reelle",
    }
    OUT_MANIFEST.write_text(json.dumps(stats, indent=2, ensure_ascii=False), encoding="utf-8")

    print(f"[4] Ecrit : {OUT_CSV.name} | {stats['n_rows']} lignes | "
          f"{stats['n_teachers']} enseignants | {stats['n_months']} mois")
    print(f"    hash canonique : {dataset_hash[:16]}...  manifest : {OUT_MANIFEST.name}")
    print("[OK] Provenance : 100% SIMULATED, cibles M+3 observees, seed 42")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
