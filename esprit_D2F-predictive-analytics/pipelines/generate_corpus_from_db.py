"""Genere le corpus d'entrainement temporel depuis la base PostgreSQL reelle.

Contrairement a generate_training_corpus.py (synthetique), ce script interroge
la vraie base `d2f` : competence.enseignant_competences, formation.inscriptions,
evaluation.evaluation_formateur, besoin.besoin_formation, formation.presences.

Pour chaque (enseignant, competence) avec suffisamment d'historique (>1 savoir),
on reconstruit l'historique t-3..t depuis les vraies dates d'acquisition.
Le target gap_next_3m est estime par la tendance observee sur l'historique
(extrapolation simple d'un pas de 3 mois, bornee [0,5]).

CORRECTION AUDIT DSI : le corpus exporte desormais une colonne `date_t`
(date du point le plus recent de l'historique) et est trie chronologiquement
(plus aucun shuffle) — ce qui permet au pipeline d'entrainement de realiser
un split TEMPOREL strict (train = avant le seuil, test = apres).
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
OUTPUT_PATH = CLEAN_DIR / "training_corpus_from_db.csv"

RANDOM_SEED = 42
np.random.seed(RANDOM_SEED)

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
TARGET_COL = "gap_next_3m"

NIVEAU_INT = {
    "N1_DEBUTANT": 1, "N2_ELEMENTAIRE": 2, "N3_INTERMEDIAIRE": 3,
    "N4_AVANCE": 4, "N5_EXPERT": 5,
    "DEBUTANT": 1, "INITIE": 2, "CONFIRME": 3, "AVANCE": 4, "EXPERT": 5,
    "NIVEAU_1": 1, "NIVEAU_2": 2, "NIVEAU_3": 3, "NIVEAU_4": 4, "NIVEAU_5": 5,
    "1": 1, "2": 2, "3": 3, "4": 4, "5": 5,
}


def level_int(v) -> int:
    if v is None:
        return 0
    if isinstance(v, (int, float)):
        return int(v)
    return NIVEAU_INT.get(str(v).upper(), 0)


def main() -> pd.DataFrame:
    db_url = os.environ.get(
        "DATABASE_URL",
        "postgresql://d2f:d2fpasswd@localhost:7432/d2f",
    )
    engine = create_engine(db_url)

    with engine.connect() as conn:
        savs = conn.execute(text("""
            SELECT ec.enseignant_id, ec.savoir_id, ec.niveau, ec.date_acquisition,
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
            ORDER BY ec.enseignant_id, competence_id, ec.date_acquisition
        """)).mappings().all()

        insc = conn.execute(text("""
            SELECT i.enseignant_id, i.formation_id, i.etat, i.date_demande, f.date_fin
            FROM formation.inscriptions i
            LEFT JOIN formation.formations f ON f.id_formation = i.formation_id
            WHERE i.date_demande IS NOT NULL
        """)).mappings().all()

        pres = conn.execute(text("""
            SELECT p.enseignant_id,
                   COUNT(*) FILTER (WHERE p.presence)::float / NULLIF(COUNT(*),0) AS rate
            FROM formation.presences p
            JOIN formation.seances s ON s.id_seance = p.seance_id
            GROUP BY p.enseignant_id
        """)).mappings().all()
        attendance = {r["enseignant_id"]: float(r["rate"] or 0.0) for r in pres}

        evals = conn.execute(text("""
            SELECT enseignant_id, AVG(note) AS avg_note, COUNT(*) AS nb
            FROM evaluation.evaluation_formateur GROUP BY enseignant_id
        """)).mappings().all()
        eval_map = {
            r["enseignant_id"]: (float(r["avg_note"] or 0.0), int(r["nb"]))
            for r in evals
        }

        besoins = conn.execute(text("""
            SELECT username AS uid, COUNT(*) AS nb,
                   COUNT(*) FILTER (WHERE approuve_admin = true) AS nb_ok
            FROM besoin.besoin_formation WHERE deleted_at IS NULL GROUP BY username
        """)).mappings().all()
        need_map = {r["uid"]: (int(r["nb"]), int(r["nb_ok"])) for r in besoins}

    today = pd.Timestamp.today().normalize()

    def _naive(ts):
        ts = pd.Timestamp(ts)
        return ts.tz_localize(None) if ts.tzinfo is not None else ts

    # ── Features globales par enseignant : MÊMES définitions que le serving
    # (predictor._teacher_feature_bundle / _global_features) pour éviter tout
    # écart train/serving sur les plages de features.
    last_acq_by_teacher: dict[str, pd.Timestamp] = {}
    for r in savs:
        if r["date_acquisition"]:
            d = _naive(r["date_acquisition"])
            t = r["enseignant_id"]
            if t not in last_acq_by_teacher or d > last_acq_by_teacher[t]:
                last_acq_by_teacher[t] = d

    formations_by_teacher: dict[str, list[dict]] = {}
    for i in insc:
        formations_by_teacher.setdefault(i["enseignant_id"], []).append({
            "etat": i["etat"],
            "date_demande": _naive(i["date_demande"]) if i["date_demande"] else None,
            "date_fin": _naive(i["date_fin"]) if i["date_fin"] else None,
        })

    n_done_by: dict[str, int] = {}
    n_prog_by: dict[str, int] = {}
    avg_delta_by: dict[str, float] = {}
    for tid2, fs in formations_by_teacher.items():
        comp = [f for f in fs if f["etat"] == "APPROVED" and f["date_fin"] and f["date_fin"] < today]
        inpr = [f for f in fs if f["etat"] in ("APPROVED", "EN_COURS")]
        n_done_by[tid2] = len(comp)
        n_prog_by[tid2] = len(inpr)
        ad = 0.0
        if len(comp) >= 2:
            ds_ = sorted(f["date_fin"] for f in comp if f["date_fin"])
            deltas = [(ds_[k + 1] - ds_[k]).days for k in range(len(ds_) - 1)]
            ad = float(np.mean(deltas)) if deltas else 0.0
        avg_delta_by[tid2] = ad

    # Groupe par (enseignant, competence)
    by_tc: dict[tuple[str, int], list[dict]] = {}
    for r in savs:
        key = (r["enseignant_id"], int(r["competence_id"]))
        by_tc.setdefault(key, []).append({
            "niveau": level_int(r["niveau"]),
            "date": pd.Timestamp(r["date_acquisition"]),
            "required": int(r["required_level"] or 3),
        })

    rows = []
    for (tid, cid), entries in sorted(by_tc.items()):
        if len(entries) < 2:
            continue  # pas assez d'historique pour une tendance

        entries.sort(key=lambda e: e["date"])
        levels = [e["niveau"] for e in entries]
        dates = [e["date"] for e in entries]
        required = entries[0]["required"] or 3

        # Historique t-3..t : 4 points (padding avec le plus ancien si besoin)
        hist = levels[-4:] if len(levels) >= 4 else ([levels[0]] * (4 - len(levels)) + levels)
        cur_t3, cur_t2, cur_t1, cur_t = hist
        lag32 = cur_t2 - cur_t3
        lag21 = cur_t1 - cur_t2
        lag1t = cur_t - cur_t1
        rolling = (cur_t - cur_t3) / 3.0

        # Target : extrapolation de la tendance sur 3 mois (bornee)
        future_level = float(np.clip(cur_t + rolling, 1, 5))
        gap_next = float(max(0, required - future_level))

        # Features engagement (définitions serving — voir _global_features)
        last_acq = last_acq_by_teacher.get(tid)
        if last_acq is not None:
            days_since_f = (today - last_acq).days
        else:
            days_since_f = 365
        months_since_f = days_since_f / 30.44

        taux = attendance.get(tid, 0.0)
        avg_note, nb_eval = eval_map.get(tid, (0.0, 0))
        nb_needs, nb_needs_ok = need_map.get(tid, (0, 0))
        n_done = n_done_by.get(tid, 0)
        n_prog = n_prog_by.get(tid, 0)
        ad = avg_delta_by.get(tid, 0.0)
        freq_month = (n_done / max(1.0, ad / 30.0)) if ad else 0.0

        row = {
            "teacher_id": tid,
            "competence_id": cid,
            "competence_code": f"C{cid}",
            "date_t": dates[-1].strftime("%Y-%m-%d"),
            "current_level_t3": cur_t3, "current_level_t2": cur_t2,
            "current_level_t1": cur_t1, "current_level_t": cur_t,
            "lag_gap_t3_t2": lag32, "lag_gap_t2_t1": lag21, "lag_gap_t1_t": lag1t,
            "rolling_tendance": rolling,
            "days_since_last_training": float(days_since_f),
            "training_frequency_per_month": float(freq_month),
            "is_long_absent": int(days_since_f > 180),
            "is_stagnant": int(days_since_f > 365),
            "avg_level": float(np.mean(levels)),
            "min_level": float(min(levels)),
            "max_level": float(max(levels)),
            "nb_level_5": float(sum(1 for lv in levels if lv == 5)),
            "nb_level_1": float(sum(1 for lv in levels if lv == 1)),
            "nb_savoirs": float(len(levels)),
            "nb_competences": float(len({k[1] for k in by_tc if k[0] == tid})),
            "competency_coverage_rate": float(len(levels)) / max(1, max(len(v) for k, v in by_tc.items() if k[0] == tid)),
            "nb_formations_completed": float(n_done),
            "nb_formations_in_progress": float(n_prog),
            "taux_assiduite": float(taux),
            "nb_besoins_exprimes": float(nb_needs),
            "nb_besoins_approuves": float(nb_needs_ok),
            "avg_eval_score": float(avg_note),
            "nb_evaluations": float(nb_eval),
            "months_since_last_training": float(months_since_f),
            "engagement_score": float(n_done * 2 + nb_eval * 1.5 + nb_needs + taux * 5 + avg_note * 2),
            "gap_next_3m": gap_next,
        }
        rows.append(row)

    df = pd.DataFrame(rows)
    if df.empty:
        raise RuntimeError("Aucune ligne generee — verifier la base")

    # AUDIT : plus de shuffle — tri chronologique par date_t pour permettre
    # un split temporel STRICT dans le pipeline d'entrainement.
    df = df.sort_values("date_t").reset_index(drop=True)
    if len(df) > 5000:
        df = df.head(5000)

    df.to_csv(OUTPUT_PATH, index=False)
    print(f"[OK] {len(df)} lignes -> {OUTPUT_PATH}")
    print(f"    couverture par enseignant : {df['teacher_id'].nunique()} enseignants")
    print(f"    features : {len(FEATURE_COLS)}")
    return df


if __name__ == "__main__":
    main()
