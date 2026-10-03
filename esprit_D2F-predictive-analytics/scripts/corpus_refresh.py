"""Régénère le corpus d'entraînement depuis les snapshots historisés.

GOUVERNANCE 7.6 (limite 2.3) : commande unique de croissance du corpus.
Contrairement à l'extraction initiale (extrapolation de tendance), ce script
construit le corpus depuis ``analyse.niveau_snapshot`` — les vraies mesures
mensuelles — SANS jamais extrapoler :

- une ligne (enseignant, savoir) n'est émise que si elle possède une paire
  de mesures réelles (t, t+3 mois) ;
- ``target_observation_date`` est TOUJOURS la date de la re-mesure réelle ;
- ``is_extrapolated`` est TOUJOURS false dans ce flux (aucune cible
  extrapolée n'est produite ici).

Usage :
    python -m scripts.corpus_refresh
    # ou via le Makefile : make corpus-refresh
"""
from __future__ import annotations

import os
from pathlib import Path

import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text

BASE_DIR = Path(__file__).parent.parent
CLEAN_DIR = BASE_DIR / "data" / "clean"
CLEAN_DIR.mkdir(parents=True, exist_ok=True)
OUTPUT_PATH = CLEAN_DIR / "training_corpus_from_snapshots.csv"

TARGET_HORIZON_DAYS = 92
MIN_HORIZON_DAYS = 60


def _db_url() -> str:
    return os.environ.get(
        "DATABASE_URL",
        "postgresql://d2f:d2fpasswd@localhost:7432/d2f",
    )


def main() -> pd.DataFrame:
    engine = create_engine(_db_url())
    with engine.connect() as conn:
        rows = conn.execute(text("""
            SELECT ns.teacher_id, ns.savoir_id, ns.niveau, ns.snapshot_date,
                   COALESCE(sc.competence_id, s.competence_id) AS competence_id
            FROM "analyse".niveau_snapshot ns
            LEFT JOIN competence.savoirs s ON s.id = ns.savoir_id
            LEFT JOIN competence.sous_competences sc ON sc.id = s.sous_competence_id
            ORDER BY ns.teacher_id, ns.savoir_id, ns.snapshot_date
        """)).mappings().all()

    if not rows:
        print("[STOP] Aucun snapshot disponible — lancez d'abord le scheduler"
              " (historiser_niveaux) pour remplir analyse.niveau_snapshot.")
        return pd.DataFrame()

    df = pd.DataFrame([
        {
            "teacher_id": r["teacher_id"],
            "savoir_id": int(r["savoir_id"]),
            "competence_id": int(r["competence_id"]) if r["competence_id"] else None,
            "niveau": int(r["niveau"]),
            "snapshot_date": pd.Timestamp(r["snapshot_date"]),
        }
        for r in rows
    ])
    df = df[df["competence_id"].notna()]

    # Paires (t, t+3 mois) réelles par (teacher, competence) : cible mesurée.
    corpus_rows: list[dict] = []
    for (tid, cid), group in df.groupby(["teacher_id", "competence_id"]):
        group = group.sort_values("snapshot_date")
        levels = group["niveau"].tolist()
        dates = group["snapshot_date"].tolist()
        for i in range(len(levels) - 1):
            delta_days = (dates[-1] - dates[i]).days if i == len(levels) - 2 else None
            # Dernière ligne du groupe = point t le plus récent ; on cherche
            # la re-mesure ~3 mois plus tard.
            break
        if len(levels) < 2:
            continue
        # Fenêtre [t+2 mois, t+4 mois] : re-mesure réelle obligatoire.
        base_date = dates[0]
        lo = base_date + pd.Timedelta(days=MIN_HORIZON_DAYS)
        hi = base_date + pd.Timedelta(days=TARGET_HORIZON_DAYS + 31)
        future = [
            (lvl, d) for lvl, d in zip(levels[1:], dates[1:])
            if lo <= d <= hi
        ]
        if not future:
            continue
        obs_level, obs_date = future[0]
        corpus_rows.append({
            "teacher_id": tid,
            "competence_id": int(cid),
            "date_t": base_date.strftime("%Y-%m-%d"),
            "level_t": float(levels[0]),
            "gap_next_3m": float(max(0.0, 3.0 - float(obs_level))),
            "target_observation_date": obs_date.strftime("%Y-%m-%d"),
            "is_extrapolated": False,
            "source_type": "niveau_snapshot",
            "is_synthetic": False,
            "dataset_version": "snapshots_v1",
        })

    out = pd.DataFrame(corpus_rows)
    if out.empty:
        print("[STOP] Aucune paire de mesures (t, t+3 mois) réelle dans les"
              " snapshots. Le corpus extrapolé actuel reste en vigueur ;"
              " aucune ligne n'a été imputée.")
        return out

    out = out.sort_values("date_t").reset_index(drop=True)
    out.to_csv(OUTPUT_PATH, index=False)
    print(f"[OK] {len(out)} lignes (cibles réelles uniquement) -> {OUTPUT_PATH}")
    print(f"    re-mesures reelles : {out['target_observation_date'].nunique()} dates distinctes")
    return out


if __name__ == "__main__":
    main()
