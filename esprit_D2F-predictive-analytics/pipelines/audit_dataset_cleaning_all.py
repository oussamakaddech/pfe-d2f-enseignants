"""Audit conjugue DATASETS + NETTOYAGE pour tous les corpus du module d'analyse predictive.

Lecture seule : aucun dataset ni modele n'est modifie.
Sortie :
  reports/audit_dataset_cleaning_all.json
  reports/audit_dataset_cleaning_all.md

Contenu par dataset :
- volumetrie (lignes/colonnes/periode), features canoniques presentes,
- qualite : manquants, doublons exacts, doublons fonctionnels, valeurs non numeriques,
  hors plage metier, negatifs, colonnes constantes (info morte), part de zeros,
- provenance (is_synthetic / data_origin) et cible (distribution, hors plage),
- incoherences d'echelle INTER-CORPUS detectees automatiquement (meme colonne, echelles
  disjointes) : ex. engagement_score.
Le bloc `cleaning_ledger` verifie EN DIRECT les operations de nettoyage annoncees :
recoupement des cles entre corpus brut et corpus nettoye, lignes supprimees, quarantaine.
"""
from __future__ import annotations

import hashlib
import json
from pathlib import Path

import numpy as np
import pandas as pd

BASE = Path(__file__).parent.parent
OUT_JSON = BASE / "reports" / "audit_dataset_cleaning_all.json"
OUT_MD = BASE / "reports" / "audit_dataset_cleaning_all.md"

TARGET = "gap_next_3m"
CANONICAL_FEATURES = [
    "current_level_t3", "current_level_t2", "current_level_t1", "current_level_t",
    "lag_gap_t3_t2", "lag_gap_t2_t1", "lag_gap_t1_t", "rolling_tendance",
    "days_since_last_training", "training_frequency_per_month", "is_long_absent", "is_stagnant",
    "avg_level", "min_level", "max_level", "nb_level_5", "nb_level_1",
    "nb_savoirs", "nb_competences", "competency_coverage_rate",
    "nb_formations_completed", "nb_formations_in_progress", "taux_assiduite",
    "nb_besoins_exprimes", "nb_besoins_approuves", "avg_eval_score", "nb_evaluations",
    "months_since_last_training", "engagement_score",
]
LEAKAGE_COLS = ["gap_next_3m", "required_level", "required_level_t", "knowledge_difficulty_level",
                "target_observation_date"]
# Plages metier (bornes fixes). (None) = pas de borne haute.
RANGES = {
    "current_level_t3": (1, 5), "current_level_t2": (1, 5),
    "current_level_t1": (1, 5), "current_level_t": (1, 5),
    "gap_next_3m": (0, 5), "taux_assiduite": (0, 1), "avg_eval_score": (0, 5),
    "competency_coverage_rate": (0, 1),
    "days_since_last_training": (0, None), "months_since_last_training": (0, None),
    "nb_savoirs": (0, None), "nb_competences": (0, None), "nb_evaluations": (0, None),
    "nb_formations_completed": (0, None), "nb_formations_in_progress": (0, None),
    "nb_besoins_exprimes": (0, None), "nb_besoins_approuves": (0, None),
    "nb_level_1": (0, None), "nb_level_5": (0, None),
    "training_frequency_per_month": (0, 10),
}
# Colonnes volontairement exclues du controle d'echelle inter-corpus (identifiants/dates).
SCALE_EXEMPT = {"teacher_id", "competence_id", "competence_code", "ref_month", "date_t",
                "created_at", "target_observation_date", "dataset_version", "source_id"}

DATASETS = [
    # (label, chemin relatif, nature)
    ("corpus_servi_v1.1.0", "data/clean/training_corpus_provenanced_v110.csv",
     "DEMO_SEED (217 observations construites par l'auteur, cible M+3 extrapolee)"),
    ("corpus_auteur_217", "data/clean/training_corpus_from_db.csv",
     "DEMO_SEED (extraction brute avant mise en forme du corpus servi)"),
    ("simulation_10920", "data/clean/simulation_dataset.csv",
     "SIMULATED (generateur documente, seed 42, cible M+3 observee)"),
    ("simulation_test1500", "data/simulation/simulation_dataset_test1500.csv",
     "SIMULATED (echantillon volume 1500 lignes)"),
    ("synthetique_brut_1013", "data/synthetic/demo_dataset_synthetic-v1.0.0.csv",
     "SYNTHETIC (corpus de demonstration brut, defauts deliberes)"),
    ("synthetique_clean_1000", "data/synthetic/demo_dataset_synthetic-v1.0.0_clean.csv",
     "SYNTHETIC (corpus de demonstration apres nettoyage)"),
    ("legacy_5000", "data/clean/training_corpus.csv",
     "MIXED/UNKNOWN (ancien corpus de mise au point, sans date_t)"),
]

# Paires (brut -> nettoye) pour la verification directe du nettoyage.
CLEANING_PAIRS = [
    {
        "label": "synthetique_demo",
        "raw": "data/synthetic/demo_dataset_synthetic-v1.0.0.csv",
        "clean": "data/synthetic/demo_dataset_synthetic-v1.0.0_clean.csv",
        "keys": ["teacher_id", "competence_id", "ref_month"],
        "expected_report": "reports/demo_cleaning_report.json",
        "claimed": "1013 -> 1000 (8 doublons exacts, 3 taux_assiduite='high', 2 ref_month invalides)",
    },
    {
        "label": "corpus_reel_v1.1.0",
        "raw": "data/clean/training_corpus_from_db_v110.csv",
        "clean": "data/clean/training_corpus_provenanced_v110.csv",
        "keys": ["teacher_id", "competence_id", "date_t"],
        "expected_report": "reports/dataset_cleaning_report.json",
        "claimed": "172 -> 172 (mise en forme provenancee du corpus servi, aucune ligne inventee)",
    },
]

# Généalogie : tous les fichiers derives du corpus reel de l'application.
# Le corpus servi est `training_corpus_provenanced_v110.csv` (172 lignes).
GENEALOGY_REF = "data/clean/training_corpus_provenanced_v110.csv"
GENEALOGY_FILES = [
    ("corpus_brut_real_raw_v1.2.0", "data/clean/corpus_brut_real_raw.csv"),
    ("from_db_v110", "data/clean/training_corpus_from_db_v110.csv"),
    ("provenanced_v110_servi", "data/clean/training_corpus_provenanced_v110.csv"),
    ("training_corpus_clean", "data/clean/training_corpus_clean.csv"),
    ("from_db_217", "data/clean/training_corpus_from_db.csv"),
    ("provenanced_217", "data/clean/training_corpus_provenanced.csv"),
    ("legacy_5000_sans_date", "data/clean/training_corpus.csv"),
]

def _dataset_hash(df: pd.DataFrame) -> str:
    canonical = df.copy().sort_values(by=df.columns.tolist()).reset_index(drop=True)
    return hashlib.sha256(canonical.to_csv(index=False).encode("utf-8")).hexdigest()


def _functional_keys(df: pd.DataFrame) -> list[str] | None:
    for keys in (["teacher_id", "competence_id", "ref_month"],
                 ["teacher_id", "competence_id", "date_t"],
                 ["teacher_id", "date_t"], ["ref_month"]):
        if all(k in df.columns for k in keys):
            return keys
    return None


def _norm_key_col(s: pd.Series) -> pd.Series:
    """Normalise une colonne de cle : 2025-01 et 2025-01-01 -> 2025-01 ; 1.0 -> 1."""
    txt = s.astype(str).str.strip()
    if txt.str.match(r"^\d{4}-\d{2}(-\d{2})?$").all():
        return pd.to_datetime(txt, errors="coerce").dt.to_period("M").astype(str)
    num = pd.to_numeric(txt, errors="coerce")
    if num.notna().all() and bool((num % 1 == 0).all()):
        return num.astype("int64").astype(str)
    return txt


def _row_keys(df: pd.DataFrame, keys: list[str]) -> pd.Series:
    parts = [_norm_key_col(df[k]) for k in keys]
    out = parts[0]
    for p in parts[1:]:
        out = out + "|" + p
    return out


def _numeric_profile(df: pd.DataFrame) -> dict:
    """Non numeriques, hors plage, negatifs, colonnes constantes, part de zeros, plages."""
    non_numeric: dict[str, int] = {}
    out_of_range: dict[str, dict] = {}
    negatives: dict[str, int] = {}
    observed: dict[str, dict[str, float]] = {}
    constants: list[str] = []
    zero_share: dict[str, float] = {}

    for col in df.columns:
        if col in SCALE_EXEMPT:
            continue
        raw = df[col]
        num = pd.to_numeric(raw, errors="coerce")
        if not num.notna().any():
            continue
        n_bad = int(num.isna().sum() - raw.isna().sum())
        if n_bad > 0:
            non_numeric[col] = n_bad
        observed[col] = {"min": round(float(num.min()), 4), "max": round(float(num.max()), 4)}
        if col in RANGES:
            lo, hi = RANGES[col]
            n_lo = int((num < lo).sum())
            n_hi = int((num > hi).sum()) if hi is not None else 0
            if n_lo or n_hi:
                out_of_range[col] = {"below_lo": n_lo, "above_hi": n_hi, "lo": lo, "hi": hi}
            if lo == 0 and n_lo:
                negatives[col] = n_lo
        if num.nunique(dropna=True) <= 1:
            constants.append(col)
        share_zero = float((num == 0).mean())
        if share_zero > 0.5:
            zero_share[col] = round(share_zero, 4)

    return {
        "non_numeric_values": non_numeric,
        "out_of_range": out_of_range,
        "negative_values": negatives,
        "observed_ranges": observed,
        "constant_columns": constants,
        "zero_share_gt_50pct": zero_share,
    }


def audit_dataset(label: str, rel: str, nature: str) -> dict:
    path = BASE / rel
    if not path.exists():
        return {"dataset": label, "path": rel, "nature": nature, "status": "ABSENT"}

    df = pd.read_csv(path)
    out: dict[str, object] = {
        "dataset": label,
        "path": rel,
        "nature": nature,
        "status": "PRESENT",
        "rows": int(len(df)),
        "columns": int(len(df.columns)),
        "hash_canonique": _dataset_hash(df),
    }

    for date_col in ("date_t", "ref_month"):
        if date_col in df.columns:
            dates = pd.to_datetime(df[date_col], errors="coerce")
            out["date_column"] = date_col
            out["min_date"] = str(dates.min().date()) if dates.notna().any() else None
            out["max_date"] = str(dates.max().date()) if dates.notna().any() else None
            if dates.notna().any():
                out["distinct_months"] = int(dates.dt.to_period("M").nunique())
            out["invalid_dates"] = int(dates.isna().sum())
            break

    present = [c for c in CANONICAL_FEATURES if c in df.columns]
    out["canonical_features_present"] = len(present)
    out["canonical_features_total"] = len(CANONICAL_FEATURES)
    out["canonical_features_missing"] = [c for c in CANONICAL_FEATURES if c not in df.columns]

    missing = {c: int(n) for c, n in df.isna().sum().items() if int(n) > 0}
    out["missing_values_total"] = int(sum(missing.values()))
    out["missing_values"] = missing

    out["duplicate_rows_exact"] = int(df.duplicated().sum())
    keys = _functional_keys(df)
    out["functional_keys"] = keys
    out["duplicate_rows_functional"] = int(df.duplicated(subset=keys).sum()) if keys else None
    out["distinct_teachers"] = int(df["teacher_id"].nunique()) if "teacher_id" in df.columns else None

    out.update(_numeric_profile(df))

    provenance: dict[str, object] = {}
    if "is_synthetic" in df.columns:
        n_syn = int(pd.to_numeric(df["is_synthetic"], errors="coerce").fillna(0).astype(int).sum())
        provenance["synthetic_rows"] = n_syn
        provenance["real_rows"] = int(len(df) - n_syn)
        provenance["synthetic_share_pct"] = round(100.0 * n_syn / max(len(df), 1), 2)
    if "is_extrapolated" in df.columns:
        provenance["extrapolated_rows"] = int(
            pd.to_numeric(df["is_extrapolated"], errors="coerce").fillna(0).astype(int).sum())
    if "data_origin" in df.columns:
        provenance["data_origin_counts"] = {str(k): int(v) for k, v in df["data_origin"].value_counts().items()}
    if "dataset_version" in df.columns:
        provenance["dataset_version_counts"] = {
            str(k): int(v) for k, v in df["dataset_version"].value_counts().items()}
    out["provenance"] = provenance

    if TARGET in df.columns:
        y = pd.to_numeric(df[TARGET], errors="coerce")
        out["target"] = {
            "min": round(float(y.min()), 4), "max": round(float(y.max()), 4),
            "mean": round(float(y.mean()), 4), "std": round(float(y.std()), 4),
            "zeros": int((y == 0).sum()), "nan": int(y.isna().sum()),
            "out_of_0_5": int(((y < 0) | (y > 5)).sum()),
        }

    out["leakage_columns_present"] = [c for c in LEAKAGE_COLS if c in df.columns]
    return out


def audit_cleaning_pair(pair: dict) -> dict:
    """Verifie EN DIRECT une operation de nettoyage annoncee (corpus brut -> corpus nettoye)."""
    raw_path, clean_path = BASE / pair["raw"], BASE / pair["clean"]
    res: dict[str, object] = {
        "label": pair["label"],
        "raw": pair["raw"],
        "clean": pair["clean"],
        "keys": pair["keys"],
        "claimed": pair["claimed"],
        "expected_report": pair["expected_report"],
        "expected_report_exists": (BASE / pair["expected_report"]).exists(),
    }
    if not raw_path.exists() or not clean_path.exists():
        res["status"] = "NON_VERIFIABLE (fichier absent)"
        return res

    raw, clean = pd.read_csv(raw_path), pd.read_csv(clean_path)
    keys = pair["keys"]
    raw_keys, clean_keys = _row_keys(raw, keys), _row_keys(clean, keys)
    raw_set, clean_set = set(raw_keys), set(clean_keys)
    removed_keys = sorted(raw_set - clean_set)
    added_keys = sorted(clean_set - raw_set)

    res.update({
        "status": "VERIFIE",
        "raw_rows": int(len(raw)),
        "clean_rows": int(len(clean)),
        "distinct_raw_keys": int(len(raw_set)),
        "distinct_clean_keys": int(len(clean_set)),
        "rows_removed_keys": int(len(removed_keys)),
        "rows_added_not_in_raw": int(len(added_keys)),
        "clean_is_subset_of_raw": bool(clean_set <= raw_set),
        "raw_duplicates_exact": int(raw.duplicated().sum()),
        "raw_duplicates_functional": int(raw_keys.duplicated().sum()),
        "collapse_duplicates_rows": int(len(raw) - len(raw_set)),
        "clean_duplicates_exact": int(clean.duplicated().sum()),
        "clean_duplicates_functional": int(clean_keys.duplicated().sum()),
        "keys_unique_after": bool(clean_keys.is_unique),
        "removed_keys_sample": removed_keys[:5],
        # Invariant verifiable : toutes les cles du nettoye viennent du brut, et le delta
        # de cles distinctes explique exactement le volume final.
        "claim_matches": bool(clean_set <= raw_set and len(raw_set) - len(removed_keys) == len(clean)),
    })
    if len(removed_keys) == 0:
        res["key_diff_note"] = ("les lignes supprimees partageaient toutes leur cle avec une ligne "
                                "conservee : la suppression est invisible au niveau des cles "
                                "(voir collapse_duplicates_rows / quarantaine)")

    # Hypotheses de suppression : historique de lag incomplet (niveaux historiques a 0).
    hist_cols = [c for c in ("current_level_t3", "current_level_t2", "current_level_t1") if c in raw.columns]
    if hist_cols and removed_keys:
        hist_zero = (raw[hist_cols].apply(pd.to_numeric, errors="coerce").fillna(0) == 0).any(axis=1)
        removed_mask = raw_keys.isin(set(removed_keys))
        res["incomplete_history_check"] = {
            "columns": hist_cols,
            "removed_share_with_zero_history": round(float(hist_zero[removed_mask].mean()), 4)
            if removed_mask.any() else None,
            "kept_share_with_zero_history": round(float(hist_zero[~removed_mask].mean()), 4)
            if (~removed_mask).any() else None,
        }

    quarantine = BASE / "reports" / "demo_quarantine.csv"
    if pair["label"] == "synthetique_demo" and quarantine.exists():
        q = pd.read_csv(quarantine)
        res["quarantine_file"] = {
            "path": "reports/demo_quarantine.csv",
            "rows": int(len(q)),
            "columns": list(q.columns),
        }
    return res


def detect_scale_conflicts(audits: list[dict]) -> list[dict]:
    """Detecte les colonnes a echelle INCOHERENTE entre corpus.

    CRITIQUE  : intervalles disjoints, ou colonne entierement nulle (feature morte) dans
                au moins un corpus -> non comparable / information absente d'un cote.
    A EXAMINER: ecart de plage > x5 sans disjointure (volume ou couverture temporelle
                differents) -> a confirmer avant tout entrainement croise.
    """
    conflicts = []
    for col in CANONICAL_FEATURES:
        per = {a["dataset"]: a["observed_ranges"][col] for a in audits
               if a.get("status") == "PRESENT" and col in a.get("observed_ranges", {})}
        if len(per) < 2:
            continue
        maxima = [v["max"] for v in per.values()]
        minima = [v["min"] for v in per.values()]
        top, lowest_max = max(maxima), min(maxima)
        disjoint = min(maxima) < max(minima)
        ratio = top / lowest_max if lowest_max > 0 else (float("inf") if top > 0 else 1.0)
        if not disjoint and ratio <= 5:
            continue
        dead = [k for k, v in per.items() if v["min"] == 0.0 and v["max"] == 0.0]
        reasons = []
        if disjoint:
            reasons.append("intervalles disjoints")
        if lowest_max == 0:
            reasons.append("entierement nulle dans au moins un corpus")
        elif np.isfinite(ratio):
            reasons.append(f"ecart de plage x{ratio:.1f}")
        if dead:
            reasons.append("constante nulle : " + ", ".join(dead))
        conflicts.append({
            "column": col,
            "per_dataset": per,
            "disjoint_intervals": bool(disjoint),
            "max_ratio_between_corpora": round(ratio, 2) if np.isfinite(ratio) else None,
            "dead_in_corpora": dead,
            "severity": "CRITIQUE" if (disjoint or lowest_max == 0) else "A EXAMINER",
            "reason": " ; ".join(reasons),
        })
    conflicts.sort(key=lambda c: (c["severity"] != "CRITIQUE", c["column"]))
    return conflicts


def audit_genealogy() -> dict:
    """Verifie par recoupement de cles quels fichiers sont le MEME corpus sous une autre forme,
    et lesquels sont des extractions DIFFERENTES (perimetre/date de perimetre distincts).
    Reference = corpus servi `training_corpus_provenanced_v110.csv` (172 lignes)."""
    ref_path = BASE / GENEALOGY_REF
    if not ref_path.exists():
        return {"status": "NON_VERIFIABLE (corpus servi absent)", "reference": GENEALOGY_REF}
    ref = pd.read_csv(ref_path)
    ref_keys = set(_row_keys(ref, ["teacher_id", "competence_id", "date_t"]))

    files, warnings = [], []
    for label, rel in GENEALOGY_FILES:
        path = BASE / rel
        if not path.exists():
            files.append({"label": label, "path": rel, "status": "ABSENT"})
            continue
        df = pd.read_csv(path)
        key_cols = [c for c in ("teacher_id", "competence_id", "date_t") if c in df.columns]
        if "teacher_id" not in key_cols:
            files.append({"label": label, "path": rel, "status": "PRESENT",
                          "rows": int(len(df)), "note": "pas de cle enseignant/competence/periode"})
            continue
        keys = set(_row_keys(df, key_cols))
        dates = pd.to_datetime(df["date_t"], errors="coerce") if "date_t" in df.columns else None
        entry = {
            "label": label,
            "path": rel,
            "status": "PRESENT",
            "rows": int(len(df)),
            "columns": int(len(df.columns)),
            "distinct_keys": len(keys),
            "distinct_teachers": int(df["teacher_id"].nunique()),
            "min_date": str(dates.min().date()) if dates is not None and dates.notna().any() else None,
            "max_date": str(dates.max().date()) if dates is not None and dates.notna().any() else None,
        }
        if label == "provenanced_v110_servi":
            entry["role"] = "REFERENCE (corpus servi v1.1.0)"
        else:
            shared = len(keys & ref_keys)
            entry.update({
                "keys_shared_with_served": shared,
                "keys_lost_vs_served": len(keys - ref_keys),
                "keys_absent_vs_served": len(ref_keys - keys),
                "coverage_of_served_pct": round(100.0 * shared / max(len(ref_keys), 1), 2),
                "same_corpus_as_served": bool(keys == ref_keys),
            })
            if 0 < shared < len(ref_keys):
                entry["role"] = "EXTRACTION DIFFERENTE (perimetre partiellement different)"
                warnings.append(
                    f"`{rel}` n'est PAS la source du corpus servi : {entry['keys_absent_vs_served']} cles "
                    f"du corpus servi y sont absentes et {entry['keys_lost_vs_served']} de ses cles "
                    f"n'existent pas dans le corpus servi (recouvrement {entry['coverage_of_served_pct']}%).")
            elif shared == len(ref_keys):
                entry["role"] = "meme corpus, autre forme (recouvrement total des cles)"
    return {"status": "VERIFIE", "reference": GENEALOGY_REF, "reference_rows": int(len(ref)),
            "files": files, "warnings": warnings}
def _y(v) -> str:
    return "oui" if v else "non"


def _render_inventory(datasets: list[dict]) -> list[str]:
    lines = [
        "# Audit — datasets et nettoyage (module Analyse predictive)",
        "",
        "Genere par `pipelines/audit_dataset_cleaning_all.py` — **lecture seule**",
        "(aucun dataset, aucun modele, aucun registre modifie).",
        "",
        "Cible supervisee : `gap_next_3m` (0-5). Les colonnes de fuite (`gap_next_3m`,",
        "`required_level`, `target_observation_date`) sont presentes dans les fichiers",
        "mais **exclues de X** par les pipelines d'entrainement.",
        "",
        "## 1. Inventaire et qualite par dataset",
        "",
        "| Dataset | Lignes | Col. | Features canoniques | Provenance | Periode | Manquants | Doublons exacts | Doublons fonctionnels | Col. hors plage | Col. non numeriques | Col. constantes |",
        "|---|---|---|---|---|---|---|---|---|---|---|---|",
    ]
    for a in datasets:
        if a.get("status") != "PRESENT":
            lines.append(f"| `{a['dataset']}` | — | — | — | — | — | — | — | — | — | — | **ABSENT** |")
            continue
        prov = a.get("provenance", {})
        prov_txt = prov.get("data_origin_counts")
        if isinstance(prov_txt, dict):
            prov_txt = "\\|".join(f"{k}:{v}" for k, v in prov_txt.items())
        elif not prov_txt:
            prov_txt = (f"synthetic {prov.get('synthetic_share_pct')}%" if prov else "n/a")
        period = f"{a.get('min_date')} → {a.get('max_date')}" if a.get("min_date") else "n/a"
        lines.append(
            f"| `{a['dataset']}` | {a['rows']} | {a['columns']} | "
            f"{a['canonical_features_present']}/{a['canonical_features_total']} | {prov_txt} | {period} | "
            f"{a['missing_values_total']} | {a['duplicate_rows_exact']} | {a['duplicate_rows_functional']} | "
            f"{len(a['out_of_range'])} | {len(a['non_numeric_values'])} | {len(a['constant_columns'])} |"
        )
    return lines


def _render_details(datasets: list[dict]) -> list[str]:
    lines = ["", "## 2. Detail par dataset", ""]
    for a in datasets:
        if a.get("status") != "PRESENT":
            lines += [f"### `{a['dataset']}` — ABSENT sur disque", ""]
            continue
        lines += [
            f"### `{a['dataset']}` — {a['rows']} lignes, {a['columns']} colonnes",
            "",
            f"- Nature : {a['nature']}",
            f"- Hash canonique (SHA-256, tri de toutes les colonnes) : `{a['hash_canonique']}`",
            f"- Enseignants distincts : {a.get('distinct_teachers')}",
            f"- Date : colonne `{a.get('date_column')}` — {a.get('min_date')} → {a.get('max_date')}"
            f" ({a.get('distinct_months')} mois distincts, {a.get('invalid_dates')} date invalide)",
            f"- Cles fonctionnelles utilisees pour les doublons : `{a.get('functional_keys')}`",
        ]
        t = a.get("target")
        if t:
            lines.append(
                f"- Cible `{TARGET}` : min {t['min']} / max {t['max']} / moyenne {t['mean']} "
                f"/ ecart-type {t['std']} / zeros {t['zeros']} / NaN {t['nan']} / hors [0,5] {t['out_of_0_5']}")
        lines.append(f"- Valeurs manquantes : {a['missing_values'] or 'aucune'}")
        if a["non_numeric_values"]:
            lines.append(f"- Valeurs non numeriques (presentes mais non convertibles) : {a['non_numeric_values']}")
        if a["out_of_range"]:
            lines.append(f"- Valeurs hors plage metier : {a['out_of_range']}")
        if a["negative_values"]:
            lines.append(f"- Valeurs negatives : {a['negative_values']}")
        if a["constant_columns"]:
            lines.append(f"- Colonnes constantes (information nulle) : {a['constant_columns']}")
        if a["zero_share_gt_50pct"]:
            lines.append(f"- Colonnes remplies de zeros (>50%) : {a['zero_share_gt_50pct']}")
        if a.get("canonical_features_missing"):
            lines.append(f"- Features canoniques absentes : {a['canonical_features_missing']}")
        lines.append("")
    return lines


def _render_cleaning(ledger: list[dict]) -> list[str]:
    lines = [
        "", "## 3. Nettoyage — verification en direct (brut → nettoye)", "",
        "Les lignes supprimees sont identifiees par recoupement des cles fonctionnelles normalisees",
        "(`teacher_id` + `competence_id` + periode, format `2025-01` et `2025-01-01` unifies).",
        "",
        "| Operation | Lignes brut | Cles distinctes brut | Lignes nettoyees | Cles distinctes nettoyees | Cles supprimees | Cles ajoutees | Nettoye ⊆ brut | Doublons fonctionnels apres | Conforme a l'invariant |",
        "|---|---|---|---|---|---|---|---|---|---|",
    ]
    for l in ledger:
        if l.get("status") != "VERIFIE":
            lines.append(f"| {l['label']} | — | — | — | — | — | — | — | — | {l.get('status')} |")
            continue
        lines.append(
            f"| {l['label']} | {l['raw_rows']} | {l['distinct_raw_keys']} | {l['clean_rows']} | "
            f"{l['distinct_clean_keys']} | {l['rows_removed_keys']} | {l['rows_added_not_in_raw']} | "
            f"{_y(l['clean_is_subset_of_raw'])} | {l['clean_duplicates_functional']} | {_y(l['claim_matches'])} |")
    lines.append("")
    for l in ledger:
        if l.get("status") != "VERIFIE":
            continue
        lines += [
            f"### {l['label']}",
            "",
            f"- Annonce auditee : {l['claimed']}",
            f"- Mesure : {l['raw_rows']} lignes brut → {l['clean_rows']} lignes nettoyees ; "
            f"{l['distinct_raw_keys']} cles distinctes → {l['distinct_clean_keys']}.",
            f"- Lignes supprimees : {l['collapse_duplicates_rows']} doublons fonctionnels ecrases + "
            f"{l['rows_removed_keys']} cles qui disparaissent entierement ; "
            f"{l['rows_added_not_in_raw']} cles nouvelles (0 = aucune ligne inventee).",
            f"- Doublons apres nettoyage : exacts {l['clean_duplicates_exact']} / fonctionnels "
            f"{l['clean_duplicates_functional']} ; cles uniques : {_y(l['keys_unique_after'])}.",
            f"- Rapport de nettoyage attendu present sur disque : {_y(l['expected_report_exists'])}"
            f" (`{l['expected_report']}`).",
        ]
        if l.get("key_diff_note"):
            lines.append(f"- Note : {l['key_diff_note']}")
        if l["rows_removed_keys"]:
            lines.append(f"- Exemples de cles supprimees : {l['removed_keys_sample']}")
        h = l.get("incomplete_history_check")
        if h:
            lines.append(
                f"- Historique de lag incomplet ({', '.join(h['columns'])}) : "
                f"{h['removed_share_with_zero_history']} des lignes supprimees contre "
                f"{h['kept_share_with_zero_history']} des lignes conservees.")
        q = l.get("quarantine_file")
        if q:
            lines.append(f"- Quarantaine tracee : `{q['path']}` — {q['rows']} lignes, colonnes {q['columns']}.")
        lines.append("")
    return lines


def _render_genealogy(genealogy: dict) -> list[str]:
    lines = ["", "## 4. Généalogie des corpus réels (vérifiée par recoupement de clés)", ""]
    if genealogy.get("status") != "VERIFIE":
        lines += [f"Non vérifiable : {genealogy.get('status')}", ""]
        return lines
    lines += [
        f"Référence : `{genealogy['reference']}` — {genealogy['reference_rows']} lignes (corpus servi v1.1.0).",
        "",
        "| Fichier | Rôle | Lignes | Enseignants | Période | Clés communes (couverture du servi) | Clés absentes du fichier | Clés du fichier hors servi |",
        "|---|---|---|---|---|---|---|---|",
    ]
    for f in genealogy["files"]:
        if f.get("status") != "PRESENT":
            lines.append(f"| `{f['path']}` | — | — | — | — | — | — | {f.get('status')} |")
            continue
        if f.get("note"):
            lines.append(f"| `{f['path']}` | {f['note']} | {f['rows']} | — | — | — | — | — |")
            continue
        shared = f.get("keys_shared_with_served")
        cover = f"{shared} ({f['coverage_of_served_pct']}%)" if shared is not None else "—"
        lines.append(
            f"| `{f['path']}` | {f.get('role', '—')} | {f['rows']} | {f['distinct_teachers']} | "
            f"{f.get('min_date')} → {f.get('max_date')} | {cover} | "
            f"{f.get('keys_absent_vs_served', '—')} | {f.get('keys_lost_vs_served', '—')} |")
    lines.append("")
    if genealogy.get("warnings"):
        lines += ["**Alertes de traçabilité** :", ""]
        for w in genealogy["warnings"]:
            lines.append(f"- {w}")
        lines += [
            "",
            "Conséquence : un fichier qui n'est pas la source du corpus servi ne peut pas servir à",
            "justifier le volume d'entraînement de ce dernier. Les proportions annoncées doivent",
            "citer le fichier réellement utilisé comme parent.",
            "",
        ]
    else:
        lines += ["Aucune alerte : tous les fichiers présents se recoupent avec le corpus servi.", ""]
    return lines


def _render_conflicts(conflicts: list[dict]) -> list[str]:
    lines = ["", "## 5. Incoherences d'echelle inter-corpus", ""]
    if not conflicts:
        lines += ["Aucune incoherence d'echelle detectee entre corpus.", ""]
        return lines
    lines += [
        "| Severite | Colonne | Echelles observees par corpus | Motif |",
        "|---|---|---|---|",
    ]
    for c in conflicts:
        per = " ; ".join(f"`{k}` [{v['min']}, {v['max']}]" for k, v in c["per_dataset"].items())
        lines.append(f"| **{c['severity']}** | `{c['column']}` | {per} | {c['reason']} |")
    lines += [
        "",
        "**Lecture** : `CRITIQUE` = plages disjointes ou colonne entierement nulle dans un corpus",
        "(feature morte / information absente d'un cote) ; `A EXAMINER` = ecart de plage > x5",
        "sans disjointure (volume ou couverture temporelle differents).",
        "",
        "**Consequence** : une colonne dont l'echelle change d'un corpus a l'autre n'est pas",
        "comparable et constitue une source de derive (train/serve skew) si un modele est",
        "entraine sur un corpus et alimente par un autre. A verifier dans le contrat de features",
        "servi avant toute promotion croisee.",
        "",
    ]
    return lines


def _render_limits() -> list[str]:
    return [
        "## 6. Limites de cet audit",
        "",
        "- L'audit ne re-entraine rien et ne modifie aucun artefact : il mesure la qualite des",
        "  fichiers presents sur disque a l'instant de l'execution.",
        "- Les corpus `SIMULATED` / `SYNTHETIC` sont audites pour leur qualite interne et leur",
        "  tracabilite, PAS comme preuve de performance sur les enseignants reels.",
        "- Les lignes supprimees sont identifiees par recoupement de cles fonctionnelles ; une",
        "  ligne modifiee (plutot que supprimee) apparaitrait comme 1 suppression + 1 ajout, ce",
        "  que le tableau expose explicitement (colonne `Cles ajoutees`).",
        "- `nb_besoins_exprimes` / `nb_besoins_approuves` sont a 0 sur le corpus reel servi",
        "  (information absente de la source) : ce ne sont pas des valeurs manquantes au sens",
        "  CSV, mais une information metier inexistante a ce stade.",
        "",
    ]


def main() -> int:
    audits = [audit_dataset(label, rel, nature) for label, rel, nature in DATASETS]
    ledger = [audit_cleaning_pair(p) for p in CLEANING_PAIRS]
    conflicts = detect_scale_conflicts(audits)
    genealogy = audit_genealogy()

    payload = {
        "generated_by": "pipelines/audit_dataset_cleaning_all.py",
        "read_only": True,
        "target_column": TARGET,
        "canonical_features": CANONICAL_FEATURES,
        "datasets": audits,
        "cleaning_ledger": ledger,
        "genealogy": genealogy,
        "scale_conflicts": conflicts,
        "summary": {
            "datasets_audited": len([a for a in audits if a.get("status") == "PRESENT"]),
            "datasets_absent": [a["dataset"] for a in audits if a.get("status") != "PRESENT"],
            "datasets_with_missing_values": [a["dataset"] for a in audits if a.get("missing_values_total")],
            "datasets_with_exact_duplicates": [a["dataset"] for a in audits if a.get("duplicate_rows_exact")],
            "datasets_with_functional_duplicates": [a["dataset"] for a in audits
                                                    if a.get("duplicate_rows_functional")],
            "datasets_with_numeric_quality_defects": [
                a["dataset"] for a in audits
                if a.get("status") == "PRESENT"
                and (a.get("non_numeric_values") or a.get("out_of_range") or a.get("negative_values"))],
            "cleaning_pairs_verified": len([l for l in ledger if l.get("status") == "VERIFIE"]),
            "cleaning_claims_matching": [l["label"] for l in ledger if l.get("claim_matches")],
            "cleaning_claims_not_matching": [l["label"] for l in ledger
                                             if l.get("status") == "VERIFIE" and not l.get("claim_matches")],
            "genealogy_warnings": genealogy.get("warnings", []),
            "scale_conflicts_critical": [c["column"] for c in conflicts if c["severity"] == "CRITIQUE"],
            "scale_conflicts_to_review": [c["column"] for c in conflicts if c["severity"] == "A EXAMINER"],
        },
    }
    OUT_JSON.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")

    lines = (_render_inventory(audits) + _render_details(audits)
             + _render_cleaning(ledger) + _render_genealogy(genealogy)
             + _render_conflicts(conflicts) + _render_limits())
    OUT_MD.write_text("\n".join(lines), encoding="utf-8")

    print(f"[OK] {OUT_JSON.name}")
    print(f"[OK] {OUT_MD.name}")
    print("[resume] " + json.dumps(payload["summary"], ensure_ascii=False))
    for a in audits:
        if a.get("status") == "PRESENT":
            print(f"  {a['dataset']:<24} rows={a['rows']:<6} feats={a['canonical_features_present']}/"
                  f"{a['canonical_features_total']} miss={a['missing_values_total']} "
                  f"dupes={a['duplicate_rows_exact']}/{a['duplicate_rows_functional']} "
                  f"oob={len(a['out_of_range'])} nonnum={len(a['non_numeric_values'])}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())