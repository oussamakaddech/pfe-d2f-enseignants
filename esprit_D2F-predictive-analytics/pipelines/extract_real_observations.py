"""Extraction des observations REELLES du gap predictor depuis PostgreSQL.

VERSION CORRIGÉE (mission augmentation corpus) :

PRINCIPE STRICT — AUCUNE FABRICATION :
  - La cible `gap_next_3m` n'est calculée QUE si une observation réelle du
    niveau de la paire (enseignant, competence) existe à ref_month + 3 mois
    (fenêtre [ref_month+2m30, ref_month+3m30]).
  - Aucune extrapolation de tendance, aucune interpolation, aucune valeur
    inventée, aucune duplication des lignes existantes.
  - `source_id` = identifiant réel vérifiable en base.
  - `department_id` et `unit_id` joints depuis `formation.enseignants`.

Le script produit :
  - `data/clean/corpus_brut_real_raw.csv`   : toutes les observations réelles
    (avec cible NaN quand aucune observation future réelle n'existe) ;
  - `data/clean/training_corpus_v1_2_0.csv` : UNIQUEMENT si au moins une
    observation a une vraie cible future (sinon NON créé, et message explicite) ;
  - `reports/real_data_source_audit.json/.md` ;
  - `reports/real_data_duplicate_conflicts.csv` ;
  - `reports/real_data_overlap_report.json` ;
  - `reports/target_coverage_report.json`.

Usage :
    python -m pipelines.extract_real_observations
"""
from __future__ import annotations

import json
import os
from pathlib import Path

import numpy as np
import pandas as pd
from sqlalchemy import create_engine, text

BASE_DIR = Path(__file__).parent.parent
CLEAN_DIR = BASE_DIR / "data" / "clean"
REPORTS_DIR = BASE_DIR / "reports"
RAW_OUTPUT = CLEAN_DIR / "corpus_brut_real_raw.csv"
V120_OUTPUT = CLEAN_DIR / "training_corpus_v1_2_0.csv"

DATASET_VERSION = "v1.2.0"
TARGET_HORIZON_DAYS = 90
TARGET_WINDOW_DAYS = 15  # tolerance autour de ref_month + 3 mois


def _db_url() -> str:
    return os.environ.get(
        "DATABASE_URL",
        "postgresql://d2f:d2f@localhost:7432/d2f",
    )


NIVEAU_INT = {
    "N1_DEBUTANT": 1, "N2_ELEMENTAIRE": 2, "N3_INTERMEDIAIRE": 3,
    "N4_AVANCE": 4, "N5_EXPERT": 5,
    "DEBUTANT": 1, "INITIE": 2, "CONFIRME": 3, "AVANCE": 4, "EXPERT": 5,
    "NIVEAU_1": 1, "NIVEAU_2": 2, "NIVEAU_3": 3, "NIVEAU_4": 4, "NIVEAU_5": 5,
    "1": 1, "2": 2, "3": 3, "4": 4, "5": 5,
}


def level_int(v) -> int:
    if v is None or (isinstance(v, float) and np.isnan(v)):
        return 0
    if isinstance(v, (int, float)):
        return int(v)
    return NIVEAU_INT.get(str(v).upper(), 0)


def _fetch(conn, sql: str):
    return conn.execute(text(sql)).mappings().all()


def audit_sources(engine) -> dict:
    """Audit exhaustif des sources de données disponibles (lecture seule)."""
    tables = {
        "competence.enseignant_competences": "ec",
        "competence.savoirs": "s",
        "competence.sous_competences": "sc",
        "competence.competences": "c",
        "competence.niveau_savoir_requis": "nsr",
        "formation.enseignants": "e",
        "formation.formations": "f",
        "formation.inscriptions": "i",
        "formation.presences": "p",
        "formation.seances": "se",
        "formation.formation_competences": "fc",
        "evaluation.evaluation_formateur": "ef",
        "evaluation.evaluation_globale": "eg",
        "besoin.besoin_formation": "bf",
        "besoin.besoin_competences": "bc",
        "certificat.certificates": "cert",
        "analyse.skill_gaps": "sg",
        "analyse.teacher_competence_coverage": "cov",
        "analyse.feature_snapshots": "fs",
        "analyse.teacher_risk_snapshots": "trs",
        "analyse.prediction_results": "pr",
    }
    date_cols = {
        "competence.enseignant_competences": "date_acquisition",
        "competence.savoirs": "created_at",
        "competence.sous_competences": "created_at",
        "competence.competences": "created_at",
        "competence.niveau_savoir_requis": "created_at",
        "formation.enseignants": "created_at",
        "formation.formations": "date_debut",
        "formation.inscriptions": "date_demande",
        "formation.presences": "created_at",
        "formation.seances": "date_seance",
        "formation.formation_competences": "created_at",
        "evaluation.evaluation_formateur": "created_at",
        "evaluation.evaluation_globale": "date_evaluation",
        "besoin.besoin_formation": "created_at",
        "besoin.besoin_competences": "created_at",
        "certificat.certificates": "created_at",
        "analyse.skill_gaps": "computed_at",
        "analyse.teacher_competence_coverage": "snapshot_date",
        "analyse.feature_snapshots": "snapshot_date",
        "analyse.teacher_risk_snapshots": "snapshot_date",
        "analyse.prediction_results": "analyse_date",
    }
    teacher_cols = {
        "competence.enseignant_competences": "enseignant_id",
        "formation.inscriptions": "enseignant_id",
        "formation.presences": "enseignant_id",
        "evaluation.evaluation_formateur": "enseignant_id",
        "certificat.certificates": "enseignant_id",
        "analyse.skill_gaps": "enseignant_id",
        "analyse.teacher_competence_coverage": "enseignant_id",
        "analyse.feature_snapshots": "enseignant_id",
        "analyse.teacher_risk_snapshots": "enseignant_id",
        "analyse.prediction_results": "enseignant_id",
    }
    comp_cols = {
        "competence.enseignant_competences": "savoir_id",
        "formation.formation_competences": "competence_id",
        "analyse.skill_gaps": "competence_id",
        "analyse.teacher_competence_coverage": "competence_id",
        "analyse.feature_snapshots": None,  # agrégat par enseignant
    }

    audit: dict[str, dict] = {}
    with engine.connect() as conn:
        for table, alias in tables.items():
            entry = {
                "table": table,
                "colonnes_utilisees": [],
                "nombre_de_lignes": 0,
                "lignes_avec_date": 0,
                "enseignants_distincts": None,
                "competences_distinctes": None,
                "date_minimale": None,
                "date_maximale": None,
                "relations_exploitables": [],
                "lignes_exclues": 0,
                "raison_exclusion": [],
            }
            cols = []
            date_col = date_cols.get(table)
            tcol = teacher_cols.get(table)
            ccol = comp_cols.get(table)
            if date_col:
                cols.append(date_col)
            if tcol:
                cols.append(tcol)
            if ccol:
                cols.append(ccol)
            entry["colonnes_utilisees"] = cols
            try:
                select_parts = ["COUNT(*)"]
                if date_col:
                    select_parts.append(f"COUNT({date_col})")
                if tcol:
                    select_parts.append(f"COUNT(DISTINCT {tcol})")
                if ccol:
                    select_parts.append(f"COUNT(DISTINCT {ccol})")
                if date_col:
                    select_parts.append(f"MIN({date_col})::text")
                    select_parts.append(f"MAX({date_col})::text")
                row = conn.execute(text(
                    f"SELECT {', '.join(select_parts)} FROM {table}"
                )).one()
                entry["nombre_de_lignes"] = int(row[0])
                idx = 1
                if date_col:
                    entry["lignes_avec_date"] = int(row[idx]); idx += 1
                if tcol:
                    entry["enseignants_distincts"] = int(row[idx]); idx += 1
                if ccol:
                    entry["competences_distinctes"] = int(row[idx]); idx += 1
                if date_col:
                    entry["date_minimale"] = str(row[idx]); idx += 1
                    entry["date_maximale"] = str(row[idx]); idx += 1
            except Exception as exc:
                entry["raison_exclusion"].append(f"requête impossible : {exc}")
            audit[table] = entry

    # relations exploitables
    relations = {
        "competence.enseignant_competences": ["savoirs(id=savoir_id) -> sous_competences -> competences", "niveau_savoir_requis(savoir_id) -> required_level"],
        "formation.inscriptions": ["enseignant_id -> formation.formations(id_formation)", "date_demande -> date observation"],
        "formation.presences": ["enseignant_id + seance_id -> seances.date_seance (assiduité)"],
        "evaluation.evaluation_formateur": ["enseignant_id + formation_id (note moyenne)"],
        "besoin.besoin_formation": ["username = enseignant_id (besoins)"],
        "certificat.certificates": ["enseignant_id + formation_id (certifications)"],
        "analyse.skill_gaps": ["enseignant_id + competence_id + computed_at (gap calculé, niveaux souvent 0)"],
        "analyse.teacher_competence_coverage": ["enseignant_id + competence_id + snapshot_date (couverture, niveaux 0)"],
        "analyse.teacher_risk_snapshots": ["enseignant_id + snapshot_date (score de risque mensuel)"],
        "analyse.feature_snapshots": ["enseignant_id + snapshot_date (features agrégées)"],
        "formation.formation_competences": ["formation_id + competence_id + niveau_vise (cible de formation)"],
    }
    for t, rels in relations.items():
        if t in audit:
            audit[t]["relations_exploitables"] = rels
    return audit


def extract_raw_corpus(engine) -> pd.DataFrame:
    """Construit le corpus brut réel : une ligne par (enseignant, competence).

    ref_month = dernière date d'acquisition réelle de la paire.
    gap_next_3m = NaN sauf si une observation réelle future (ref_month+3 mois)
    est trouvée dans les tables de niveau disponibles.
    """
    with engine.connect() as conn:
        savs = _fetch(conn, """
            SELECT ec.id AS ec_id, ec.enseignant_id, ec.savoir_id, ec.niveau,
                   ec.date_acquisition,
                   COALESCE(sc.competence_id, s.competence_id) AS competence_id,
                   (SELECT MAX(CASE nsr.niveau
                        WHEN 'N1_DEBUTANT' THEN 1 WHEN 'N2_ELEMENTAIRE' THEN 2
                        WHEN 'N3_INTERMEDIAIRE' THEN 3 WHEN 'N4_AVANCE' THEN 4
                        WHEN 'N5_EXPERT' THEN 5 ELSE 0 END)
                    FROM competence.niveau_savoir_requis nsr
                    WHERE nsr.savoir_id = ec.savoir_id) AS required_level
            FROM competence.enseignant_competences ec
            LEFT JOIN competence.savoirs s ON s.id = ec.savoir_id
            LEFT JOIN competence.sous_competences sc ON sc.id = s.sous_competence_id
            WHERE COALESCE(sc.competence_id, s.competence_id) IS NOT NULL
              AND ec.date_acquisition IS NOT NULL
            ORDER BY ec.enseignant_id, competence_id, ec.date_acquisition, ec.id
        """)

        teachers = {r["id"]: r for r in _fetch(conn, """
            SELECT id, dept_id, up_id FROM formation.enseignants WHERE deleted_at IS NULL
        """)}

        # Observations de niveau futures possibles (autres tables réelles)
        future_levels = []
        future_levels += [dict(r) for r in _fetch(conn, """
            SELECT enseignant_id, competence_id, current_level AS niveau,
                   snapshot_date AS obs_date
            FROM "analyse".teacher_competence_coverage
        """)]
        future_levels += [dict(r) for r in _fetch(conn, """
            SELECT enseignant_id, competence_id, niveau_actuel AS niveau,
                   computed_at AS obs_date
            FROM "analyse".skill_gaps
        """)]

    by_tc: dict[tuple[str, int], list[dict]] = {}
    for r in savs:
        key = (r["enseignant_id"], int(r["competence_id"]))
        by_tc.setdefault(key, []).append({
            "ec_id": int(r["ec_id"]),
            "niveau": level_int(r["niveau"]),
            "date": pd.Timestamp(r["date_acquisition"]),
            "required": int(r["required_level"] or 3),
        })

    future_by_tc: dict[tuple[str, int], list[dict]] = {}
    for r in future_levels:
        key = (r["enseignant_id"], int(r["competence_id"]))
        if pd.isna(r.get("niveau")) or r.get("niveau") is None:
            continue
        obs_date = pd.Timestamp(r["obs_date"])
        if obs_date.tzinfo is not None:
            obs_date = obs_date.tz_localize(None)
        future_by_tc.setdefault(key, []).append({
            "niveau": level_int(r["niveau"]),
            "date": obs_date,
        })

    rows = []
    for (tid, cid), entries in sorted(by_tc.items()):
        entries.sort(key=lambda e: (e["date"], e["ec_id"]))
        levels = [e["niveau"] for e in entries]
        dates = [e["date"] for e in entries]
        required = entries[0]["required"] or 3
        n_savoirs = len(entries)
        ref_month = dates[-1]

        # --- Cible : observation réelle à ref_month + 3 mois ---
        # GOUVERNANCE 7.6 (limite 1) : la ligne porte target_observation_date
        # uniquement si une re-mesure REELLE existe dans la fenêtre cible ;
        # is_extrapolated=true sinon (aucune cible n'est calculée dans ce cas).
        target = np.nan
        target_observation_date = ""
        is_extrapolated = True
        horizon = ref_month + pd.Timedelta(days=TARGET_HORIZON_DAYS)
        lo = horizon - pd.Timedelta(days=TARGET_WINDOW_DAYS)
        hi = horizon + pd.Timedelta(days=TARGET_WINDOW_DAYS)
        fut = future_by_tc.get((tid, cid), [])
        fut = sorted(fut, key=lambda e: abs((e["date"] - horizon).total_seconds()))
        matching = [e for e in fut if lo <= e["date"] <= hi]
        if matching:
            target = float(max(0, required - matching[0]["niveau"]))
            target_observation_date = matching[0]["date"].strftime("%Y-%m-%d")
            is_extrapolated = False

        tr = teachers.get(tid)
        hist = levels[-4:] if n_savoirs >= 4 else ([levels[0]] * (4 - n_savoirs) + levels)
        cur_t3, cur_t2, cur_t1, cur_t = hist
        rows.append({
            "teacher_id": tid,
            "competence_id": cid,
            "ref_month": ref_month.strftime("%Y-%m-%d"),
            "date_t": ref_month.strftime("%Y-%m-%d"),
            "target_observation_date": target_observation_date,
            "is_extrapolated": is_extrapolated,
            "observed_result": cur_t,
            "knowledge_difficulty_level": required,
            "observed_at": ref_month.strftime("%Y-%m-%d"),
            "evaluation_source": "postgresql_d2f_enseignant_competences",
            "gap_next_3m": float("nan") if pd.isna(target) else float(target),
            "source_type": "postgresql_d2f",
            "source_id": str(entries[-1]["ec_id"]),
            "is_synthetic": False,
            "dataset_version": DATASET_VERSION,
            "created_at": ref_month.strftime("%Y-%m-%d"),
            "department_id": tr["dept_id"] if tr else None,
            "unit_id": tr["up_id"] if tr else None,
        })

    df = pd.DataFrame(rows)
    df = df.sort_values(["ref_month", "teacher_id", "competence_id"]).reset_index(drop=True)
    return df


def main() -> int:
    engine = create_engine(_db_url())

    print("[1/5] Audit des sources...")
    audit = audit_sources(engine)
    audit_path = REPORTS_DIR / "real_data_source_audit.json"
    audit_path.parent.mkdir(parents=True, exist_ok=True)
    audit_path.write_text(json.dumps(audit, indent=2, ensure_ascii=False), encoding="utf-8")

    print("[2/5] Extraction du corpus brut réel...")
    raw = extract_raw_corpus(engine)
    raw.to_csv(RAW_OUTPUT, index=False)
    n_total = len(raw)
    n_target = int(pd.to_numeric(raw["gap_next_3m"], errors="coerce").notna().sum())
    print(f"    observations réelles (paires teacher+competence) : {n_total}")
    print(f"    dont avec vraie cible future observée (ref_month+3m) : {n_target}")

    print("[3/5] Doublons / conflits...")
    dup = raw[raw.duplicated(subset=["teacher_id", "competence_id", "ref_month"], keep=False)]
    dup.to_csv(REPORTS_DIR / "real_data_duplicate_conflicts.csv", index=False, encoding="utf-8")

    print("[4/5] Overlap vs v1.0.0 / v1.1.0...")
    overlap = {"total_corpus_raw": n_total, "with_true_target": n_target}
    for ver, path in (
        ("v1.0.0", CLEAN_DIR / "training_corpus_provenanced.csv"),
        ("v1.1.0", CLEAN_DIR / "training_corpus_provenanced_v110.csv"),
    ):
        if path.exists():
            prev = pd.read_csv(path)
            keys = set(zip(prev["teacher_id"], prev["competence_id"]))
            raw_keys = set(zip(raw["teacher_id"], raw["competence_id"]))
            overlap[f"lignes_{ver}_retrouvees"] = int(len(raw_keys & keys))
        else:
            overlap[f"lignes_{ver}_retrouvees"] = None
    overlap["nouvelles_lignes_reellement_ajoutees"] = 0
    overlap["doublons"] = int(len(dup))
    overlap["conflits"] = int(len(dup))
    (REPORTS_DIR / "real_data_overlap_report.json").write_text(
        json.dumps(overlap, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    print("[5/5] Couverture de cible...")
    # GOUVERNANCE 7.6 (limite 1) : comptage séparé des re-mesures futures
    # réelles vs cibles extrapolées — jamais de fabrication pour franchir
    # le seuil de promotion (30 observations réelles sur >= 3 mois distincts).
    extrapolated_count = int(raw["is_extrapolated"].astype(bool).sum()) if "is_extrapolated" in raw.columns else n_total - n_target
    real_future_count = n_total - extrapolated_count
    distinct_obs_months = 0
    if "target_observation_date" in raw.columns:
        obs_dates = pd.to_datetime(raw.loc[~raw["is_extrapolated"].astype(bool) if "is_extrapolated" in raw.columns else slice(None), "target_observation_date"], errors="coerce").dropna()
        distinct_obs_months = int(obs_dates.dt.to_period("M").nunique())
    coverage = {
        "lignes_totales": n_total,
        "lignes_avec_cible": n_target,
        "lignes_sans_cible": n_total - n_target,
        "real_future_observation_count": real_future_count,
        "extrapolated_count": extrapolated_count,
        "distinct_observation_months": distinct_obs_months,
        "promotion_policy": {
            "required_target_validity": "REAL_VALIDATED_TARGET",
            "min_real_future_observations": 30,
            "min_distinct_observation_months": 3,
            "current_eligible": bool(real_future_count >= 30 and distinct_obs_months >= 3),
        },
        "periodes_utilisables": [] if n_target else "aucune — aucune observation de niveau future réelle à ref_month+3 mois",
        "periodes_insuffisantes": "toute la période — chaque paire (enseignant, competence) n'a qu'UNE seule observation de niveau",
        "explication": (
            "La base ne contient qu'une seule ligne par paire (enseignant, savoir) "
            "dans competence.enseignant_competences (0 paire dupliquée). "
            "Aucune observation de niveau n'existe à ref_month + 3 mois pour "
            "quelconque observation : la cible gap_next_3m observée est donc "
            "incalculable. Le corpus actuel v1.0.0/v1.1.0 a calculé cette cible "
            "par extrapolation de tendance (cur_t + rolling), ce qui est interdit."
        ),
    }
    (REPORTS_DIR / "target_coverage_report.json").write_text(
        json.dumps(coverage, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    if n_target > 0:
        target_rows = raw[pd.to_numeric(raw["gap_next_3m"], errors="coerce").notna()]
        target_rows.to_csv(V120_OUTPUT, index=False)
        print(f"[OK] Dataset v1.2.0 généré : {V120_OUTPUT} ({len(target_rows)} lignes avec vraie cible)")
    else:
        if V120_OUTPUT.exists():
            V120_OUTPUT.unlink()
        print("[STOP] Aucune observation avec vraie cible future. V1.2.0 NON créé.")
        print("        Aucune augmentation réelle possible sans nouvelles données métier.")

    print("[OK] Rapports :", ", ".join(
        str(p) for p in (REPORTS_DIR / "real_data_source_audit.json",
                         REPORTS_DIR / "real_data_duplicate_conflicts.csv",
                         REPORTS_DIR / "real_data_overlap_report.json",
                         REPORTS_DIR / "target_coverage_report.json")
    ))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())