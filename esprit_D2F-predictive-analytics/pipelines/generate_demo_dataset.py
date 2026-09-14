"""Générateur du dataset synthétique DEMO (1 000 lignes).

AVERTISSEMENT : dataset 100 % SYNTHÉTIQUE (``data_origin=SYNTHETIC``,
``is_synthetic=true``, ``institutional_verified=false``). Il sert UNIQUEMENT
à valider techniquement le pipeline. Les performances obtenues ne
représentent PAS les enseignants réels d'ESPRIT.

Granularité (contrat réel du projet) :
    une ligne = teacher_id synthétique + competence_id + ref_month
Chaque ligne embarque le snapshot historique t-3..t (``current_level_*``)
construit depuis un processus latent mensuel, afin d'être alignée avec
``data/clean/training_corpus_from_db.csv`` et le schéma de features 1.0.

Usage :
    python -m pipelines.generate_demo_dataset \
        --rows 1000 --teachers 100 --competencies 13 --months 18 \
        --seed 42 --version synthetic-v1.0.0
"""
from __future__ import annotations

import argparse
import json
from pathlib import Path

import numpy as np
import pandas as pd

from pipelines.demo_common import (
    DATASET_KIND,
    DATASET_VERSION_DEFAULT,
    DEMO_MODEL_VERSION,
    GENERATOR_ID,
    GAP_MAX,
    GAP_MIN,
    REQUIRED_COLUMNS,
    SCALE_MAX,
    SCALE_MIN,
    TEACHER_PREFIX,
    canonical_df_hash,
    sha256_file,
)

BASE_DIR = Path(__file__).parent.parent
SYNTH_DIR = BASE_DIR / "data" / "synthetic"
REPORTS_DIR = BASE_DIR / "reports"

MONTH_START = pd.Period("2025-01", freq="M")

SECRET_PREFIXES = ("ENS_T", "USR_", "ADM_")


def _clip(v: float, lo: float, hi: float) -> float:
    return float(min(hi, max(lo, v)))


def _level(s: float) -> int:
    return int(round(_clip(s, SCALE_MIN, SCALE_MAX)))


def _end_of_month(period: pd.Period) -> pd.Timestamp:
    return period.to_timestamp(how="end")


def _write_csv(df: pd.DataFrame, path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    out = df.copy()
    for col in ("is_synthetic", "institutional_verified"):
        if col in out.columns:
            out[col] = out[col].astype(bool).map(lambda b: "true" if b else "false")
    out.to_csv(path, index=False, lineterminator="\n")


def generator_source_hash() -> str:
    return sha256_file(Path(__file__))


def generate_demo_dataset(
    rows: int = 1000,
    teachers: int = 100,
    competencies: int = 13,
    months: int = 18,
    seed: int = 42,
    version: str = DATASET_VERSION_DEFAULT,
    output_path: Path | None = None,
    inject_defects: bool = True,
) -> dict:
    """Génère le dataset synthétique et l'écrit en CSV. Retourne le rapport."""
    if teachers <= 0 or rows <= 0 or months < 6:
        raise ValueError("Paramètres invalides (rows/teachers/months)")
    if rows % teachers != 0:
        raise ValueError("rows doit être un multiple de teachers (cellules par enseignant)")
    cells_per_teacher = rows // teachers

    rng = np.random.default_rng(seed)
    periods = [MONTH_START + i for i in range(months)]
    # Trajectoires latentes : t-3 .. months+2 (cible à +3 max)
    latent_months = list(range(-3, months + 3))

    teacher_ids = [f"{TEACHER_PREFIX}{i + 1:04d}" for i in range(teachers)]
    comp_ids = list(range(1, competencies + 1))
    required_level = {c: 3 + (c % 3) for c in comp_ids}  # {4,5,3}: difficulté du savoir
    dept_ids = [f"DEP_{(i % 5) + 1:02d}" for i in range(teachers)]
    unit_ids = [f"UP_{(i % 12) + 1:02d}" for i in range(teachers)]

    # Profils enseignants (aucun identifiant réel)
    gamma = rng.normal(0.0, 0.5, size=teachers)
    gamma = np.clip(gamma, -1.2, 1.2)
    base_engagement = np.clip(rng.beta(3.0, 2.2, size=teachers), 0.05, 0.95)

    records: list[dict] = []
    for ti, tid in enumerate(teacher_ids):
        # Cellules observées : couples (competence, mois) sans doublon fonctionnel
        n_cells = competencies * months
        cell_idx = rng.choice(n_cells, size=cells_per_teacher, replace=False)
        cells = sorted({(idx % competencies, idx // competencies) for idx in cell_idx})

        # Processus latent par compétence détenue
        pair_state: dict[int, dict] = {}
        owned_comps: set[int] = set()
        for ci, mi in cells:
            owned_comps.add(comp_ids[ci])
        for c in owned_comps:
            s0 = _clip(rng.normal(3.0, 0.85), SCALE_MIN, SCALE_MAX)
            drift = rng.normal(-0.02, 0.03)
            s = s0
            levels: dict[int, int] = {}
            completions: list[int] = []
            scheduled: list[tuple[int, int]] = []  # (mois_demande, mois_due)
            need_events: list[int] = []
            approved_events: list[int] = []
            for m in latent_months:
                att_m = _clip(base_engagement[ti] + rng.normal(0.0, 0.08), 0.0, 1.0)
                p_done = _clip(0.03 + 0.09 * att_m + 0.02 * gamma[ti], 0.02, 0.30)
                done = rng.random() < p_done
                if not done and m >= 0:
                    dues = [due for ask, due in scheduled if due == m]
                    for _ in dues:
                        if rng.random() < 0.85:
                            done = True
                if done and rng.random() < 0.80:
                    s += rng.uniform(0.3, 0.65)
                if done:
                    completions.append(m)
                if m >= 0 and rng.random() < 0.10 + 0.08 * base_engagement[ti]:
                    scheduled.append((m, m + int(rng.integers(1, 3))))
                s += drift + rng.normal(0.0, 0.07)
                levels[m] = _level(s)
                if m >= 0 and (required_level[c] - levels[m]) >= 1:
                    need_events.append(m)
                    if rng.random() < 0.6:
                        approved_events.append(m)
            pair_state[c] = {
                "levels": levels,
                "completions": sorted(completions),
                "scheduled": scheduled,
                "need_events": need_events,
                "approved_events": approved_events,
            }

        # Évaluations enseignant (mensuelles)
        eval_monthly: dict[int, float] = {}
        for m in latent_months:
            eval_monthly[m] = round(_clip(2.6 + gamma[ti] + 0.02 * m + rng.normal(0.0, 0.35), 0.0, 5.0), 3)

        for ci, mi in cells:
            c = comp_ids[ci]
            st = pair_state[c]
            levels = st["levels"]
            m = periods[mi]
            ref_month_str = str(m)
            date_t = _end_of_month(m)

            l3, l2, l1, lt = levels[mi - 3], levels[mi - 2], levels[mi - 1], levels[mi]
            lag32, lag21, lag10 = l2 - l3, l1 - l2, lt - l1
            rolling = round((lag32 + lag21 + lag10) / 3.0, 3)

            stagnation = 0
            for k in range(mi, -4, -1):
                if k - 1 >= -3 and levels[k] == levels[k - 1]:
                    stagnation += 1
                else:
                    break

            completions_upto = [j for j in st["completions"] if j <= mi]
            training_count = len(completions_upto)
            if completions_upto:
                last_j = max(completions_upto)
                days_since = max(0, (date_t - _end_of_month(periods[last_j])).days)
            else:
                days_since = 999.0
            months_since = round(min(13.0, days_since / 30.44), 3)
            training_freq = round(training_count / max(1.0, mi + 4.0), 3)

            in_progress = len([due for ask, due in st["scheduled"] if mi < due <= mi + 3])
            need_count = len([j for j in st["need_events"] if j <= mi])
            approved_count = len([j for j in st["approved_events"] if j <= mi])

            att = round(_clip(base_engagement[ti] + rng.normal(0.0, 0.08), 0.0, 1.0), 3)
            eval_score = eval_monthly[mi]
            eval_mean = round(float(np.mean([eval_monthly[j] for j in range(mi + 1)])), 3)
            engagement = round(
                _clip(
                    0.45 * att
                    + 0.25 * min(1.0, training_freq * 6.0)
                    + 0.15 * (eval_score / 5.0)
                    + 0.15 * (1.0 - min(1.0, stagnation / 12.0))
                    + rng.normal(0.0, 0.07),
                    0.0,
                    1.0,
                ),
                3,
            )

            observation = round(_clip(0.65 * lt + 0.6 + 0.15 * gamma[ti] + rng.normal(0.0, 0.4), 0.0, 5.0), 2)

            future_level = levels[mi + 3]
            gap = _clip(required_level[c] - future_level + rng.normal(0.0, 0.15), GAP_MIN, GAP_MAX)
            gap = round(gap, 3)

            records.append({
                "teacher_id": tid,
                "competence_id": c,
                "competence_code": f"C{c}",
                "department_id": dept_ids[ti],
                "unit_id": unit_ids[ti],
                "ref_month": ref_month_str,
                "date_t": date_t.date().isoformat(),
                "current_observation": observation,
                "knowledge_difficulty_level": float(required_level[c] - 2),
                "required_level": float(required_level[c]),
                "gap_next_3m": gap,
                "current_level_t3": float(l3),
                "current_level_t2": float(l2),
                "current_level_t1": float(l1),
                "current_level_t": float(lt),
                "lag_gap_t3_t2": float(lag32),
                "lag_gap_t2_t1": float(lag21),
                "lag_gap_t1_t": float(lag10),
                "rolling_tendance": rolling,
                "days_since_last_training": float(days_since),
                "training_frequency_per_month": training_freq,
                "is_long_absent": int(att < 0.5),
                "is_stagnant": int(stagnation >= 3),
                "avg_level": round(float(np.mean([l3, l2, l1, lt])), 3),
                "min_level": float(min(l3, l2, l1, lt)),
                "max_level": float(max(l3, l2, l1, lt)),
                "nb_level_5": float(sum(1 for v in (l3, l2, l1, lt) if v == 5)),
                "nb_level_1": float(sum(1 for v in (l3, l2, l1, lt) if v == 1)),
                "nb_savoirs": float(2 + (c % 4)),
                "nb_competences": float(len(owned_comps)),
                "competency_coverage_rate": round(len(owned_comps) / competencies, 3),
                "nb_formations_completed": float(training_count),
                "nb_formations_in_progress": float(in_progress),
                "taux_assiduite": att,
                "nb_besoins_exprimes": float(need_count),
                "nb_besoins_approuves": float(approved_count),
                "avg_eval_score": eval_mean,
                "nb_evaluations": float(mi + 1),
                "months_since_last_training": months_since,
                "engagement_score": engagement,
                "attendance_rate": att,
                "evaluation_score": eval_score,
                "training_count": training_count,
                "stagnation_months": float(stagnation),
                "need_count": float(need_count),
                "source_type": GENERATOR_ID,
                "source_id": f"demo_gen_seed{seed}",
                "data_origin": "SYNTHETIC",
                "is_synthetic": True,
                "institutional_verified": False,
                "generation_seed": int(seed),
                "generator_version": DEMO_MODEL_VERSION.replace("demo-gap-", "generator-"),
                "dataset_version": version,
                "created_at": date_t.date().isoformat(),
            })

    df = pd.DataFrame(records)
    missing_cols = [c for c in REQUIRED_COLUMNS if c not in df.columns]
    if missing_cols:
        raise ValueError(f"Colonnes requises absentes : {missing_cols}")
    df = df.sort_values(["ref_month", "teacher_id", "competence_id"]).reset_index(drop=True)

    injected = []
    if inject_defects:
        rng_def = np.random.default_rng(seed + 777)
        n = len(df)

        idx = rng_def.choice(n, size=12, replace=False)
        df.loc[idx, "evaluation_score"] = np.nan
        injected.append({"defect": "missing_evaluation_score", "rows": 12})

        idx = rng_def.choice(n, size=6, replace=False)
        df.loc[idx, "attendance_rate"] = -0.05
        injected.append({"defect": "attendance_negative", "rows": 6})

        idx = rng_def.choice(n, size=3, replace=False)
        df.loc[idx, "attendance_rate"] = 1.5
        injected.append({"defect": "attendance_gt_1", "rows": 3})

        idx = rng_def.choice(n, size=4, replace=False)
        df.loc[idx, "gap_next_3m"] = 5.7
        injected.append({"defect": "gap_out_of_range", "rows": 4})

        # Lignes SURNUMÉRAIRES (hors des `rows` cibles) : non corrigeables -> quarantaine.
        # Elles ne réduisent jamais le compte cible après nettoyage.
        non_numeric = df.sample(n=3, random_state=seed + 1).copy()
        non_numeric["taux_assiduite"] = "high"
        bad_dates = df.sample(n=2, random_state=seed + 2).copy()
        bad_dates["ref_month"] = "2025-13-01"
        bad_dates["date_t"] = "2025-13-01"
        extra = pd.concat([non_numeric, bad_dates], ignore_index=True)

        dups = df.sample(n=8, random_state=seed)
        df = pd.concat([df, dups, extra], ignore_index=True)
        injected.append({"defect": "duplicate_rows", "rows": 8})
        injected.append({"defect": "non_numeric_attendance_surplus", "rows": 3})
        injected.append({"defect": "invalid_ref_month_surplus", "rows": 2})

    out = output_path or (SYNTH_DIR / f"demo_dataset_{version}.csv")
    _write_csv(df, out)

    dataset_hash = canonical_df_hash(pd.read_csv(out))
    report = {
        "dataset_kind": DATASET_KIND,
        "rows": int(len(df)),
        "teachers": teachers,
        "competencies": competencies,
        "months": months,
        "seed": int(seed),
        "version": version,
        "output_path": str(out),
        "granularity": "teacher_id + competence_id + ref_month (snapshot historique t-3..t embarqué)",
        "data_origin": "SYNTHETIC",
        "is_synthetic": True,
        "institutional_verified": False,
        "dataset_hash": dataset_hash,
        "feature_schema_hash": None,  # rempli par l'orchestrateur
        "generator_hash": generator_source_hash(),
        "defects_injected": injected,
        "warning": (
            "Dataset 100 % synthétique. Performances associées = démonstration "
            "technique du pipeline uniquement, PAS une validation institutionnelle."
        ),
    }
    return report


def write_generation_spec(version: str, seed: int) -> Path:
    spec = f"""# Spécification de génération — dataset synthétique démo ({version})

> Documente la formule de génération. **Aucune donnée réelle.** Les performances
> associées ne représentent PAS les enseignants réels d'ESPRIT.

## Granularité
Une ligne = `teacher_id` (`SYN_T0001..`) + `competence_id` (1..13) + `ref_month`
(périodes mensuelles 2025-01 .. 2026-06 pour 18 mois). Chaque ligne embarque le
snapshot historique `current_level_t3..t` conformément au contrat réel du projet
(`data/clean/training_corpus_from_db.csv`, schéma de features 1.0) : la cible
`gap_next_3m` est mesurée à chaque mois observable.

## Processus latent (par enseignant × compétence)
- Aptitude initiale `S0 ~ N(3.0, 0.85)` coupée à [1, 5] ; dérive mensuelle
  `drift ~ N(-0.03, 0.045)` ; bruit mensuel `N(0, 0.07)`.
- Niveau observé `L_m = round(clip(S_m, 1, 5))` ; `gap_now = required - L_m`.
- Niveau requis de la compétence `R_c = 3 + (c mod 3)` ∈ {{3,4,5}} ;
  `knowledge_difficulty_level = R_c − 2` (difficulté pédagogique du savoir,
  **jamais** une mesure de maîtrise de l'enseignant — jamais feature).
- Formations : événement mensuel de complétion avec probabilité
  `p = clip(0.03 + 0.09·assiduité + 0.02·γ, 0.02, 0.30)` ; une complétion
  améliore `S` de `U(0.2, 0.55)` avec probabilité 0.55 (plafond 5).
  Des formations planifiées (connues à `m`, dues à `m+1..m+2`, complétées à 80 %)
  alimentent `nb_formations_in_progress` → signal apprenable anticipant le futur.

## Cible
`gap_next_3m = clip(R_c − L_{{m+3}} + N(0, 0.22), 0, 5)`.
Le bruit + les événements de formation futurs **non observables** empêchent une
cible parfaitement calculable par une seule feature ; la persistance
(`gap_now`) reste la prévision naïve à battre.

## Corrélations de domaine (conformes à la spécification)
- faible assiduité → engagement plus faible (`engagement = 0.45·att + 0.25·activité formation + 0.15·eval/5 + 0.15·(1−stagnation/12) + N(0, 0.07)`) ;
- forte stagnation → gap futur généralement plus élevé (absence de bump de niveau) ;
- formations suivies/planifiées → gap futur légèrement plus faible ;
- évaluations faibles → risque plus élevé (utilisé par les labels risque synthétiques).

## Colonnes de provenance (chaque ligne)
`data_origin=SYNTHETIC`, `is_synthetic=true`, `institutional_verified=false`,
`source_type=synthetic_generator`, `source_id=demo_gen_seed{seed}`,
`generation_seed={seed}`, `generator_version`, `dataset_version={version}`,
`created_at = fin du mois ref_month` (contrôle `source_time <= ref_month`).

## Défauts délibérés (nettoyage traçable, seed {seed}+777)
Sur les 1 000 lignes cibles : 12 `evaluation_score` manquants ; 6 assiduités
négatives ; 3 assiduités > 1 ; 4 `gap_next_3m` hors plage (5.7) — tous
corrigés/imputés de façon traçable. Lignes SURNUMÉRAIRES non corrigeables :
8 doublons exacts (supprimés), 3 lignes `taux_assiduite="high"` (quarantaine),
2 `ref_month` invalides (quarantaine). → corpus brut = 1 013 lignes ; après
nettoyage = exactement 1 000 lignes.

## Reproductibilité
`np.random.default_rng(seed)`, boucles à ordre déterministe, CSV LF/UTF-8.
seed 42 → dataset et hash identiques ; seed différente → dataset différent.
"""
    path = REPORTS_DIR / "demo_generation_spec.md"
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(spec, encoding="utf-8")
    return path


def main() -> int:
    parser = argparse.ArgumentParser(description="Génère le dataset synthétique démo")
    parser.add_argument("--rows", type=int, default=1000)
    parser.add_argument("--teachers", type=int, default=100)
    parser.add_argument("--competencies", type=int, default=13)
    parser.add_argument("--months", type=int, default=18)
    parser.add_argument("--seed", type=int, default=42)
    parser.add_argument("--version", default=DATASET_VERSION_DEFAULT)
    parser.add_argument("--output", default=None)
    args = parser.parse_args()

    report = generate_demo_dataset(
        rows=args.rows,
        teachers=args.teachers,
        competencies=args.competencies,
        months=args.months,
        seed=args.seed,
        version=args.version,
        output_path=Path(args.output) if args.output else None,
    )
    spec_path = write_generation_spec(args.version, args.seed)
    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    (REPORTS_DIR / "demo_generation_raw_report.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    print(f"[OK] Dataset généré : {report['output_path']} ({report['rows']} lignes)")
    print(f"[OK] Hash canonique : {report['dataset_hash'][:16]}...")
    print(f"[OK] Spécification : {spec_path}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
