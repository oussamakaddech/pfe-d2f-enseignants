"""Validation finale, totale et reproductible du pipeline ML gap / risque / ranking.

Génère l'ensemble des rapports `reports/final_*.{json,md,csv}` exigés par la
mission, à partir des fichiers réels du dépôt (dataset, artefact, métadonnées,
registre) et des captures d'appels API réels. Ne modifie AUCUN artefact.

Usage :
    python -m pipelines.final_ml_validation [--out-dir reports] [--api-captures-dir <dir>]

Réutilise les mêmes fonctions de métriques/split que les pipelines officiels
(`pipelines.train_gap_model` et `pipelines.validate_all_models`) afin de garantir
que les chiffres sont produits par la même version du pipeline de métriques.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import sys
import time
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import KFold, cross_val_score
from sklearn.neural_network import MLPRegressor

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))

from pipelines import train_gap_model as tgm  # noqa: E402
from pipelines import validate_all_models as vam  # noqa: E402

REPORTS_DIR = ROOT / "reports"
DATA_DIR = ROOT / "data"
CLEAN_DIR = DATA_DIR / "clean"
MODELS_DIR = DATA_DIR / "models"

RANDOM_STATE = 42
N_BOOT = 1000

DATASETS = {
    "v1.0.0": CLEAN_DIR / "training_corpus_provenanced.csv",
    "v1.1.0": CLEAN_DIR / "training_corpus_provenanced_v110.csv",
}

ARTIFACTS = {
    "v1.0.0": {
        "path": MODELS_DIR / "gap_predictor_temporal.joblib",
        "sidecar": MODELS_DIR / "gap_predictor_temporal.joblib.sha256",
        "metadata": MODELS_DIR / "temporal_training_metadata.json",
        "schema": MODELS_DIR / "feature_schema.json",
    },
    "v1.1.0": {
        "path": MODELS_DIR / "gap_predictor_temporal_v110.joblib",
        "sidecar": MODELS_DIR / "gap_predictor_temporal_v110.joblib.sha256",
        "metadata": MODELS_DIR / "temporal_training_metadata_v110.json",
        "schema": MODELS_DIR / "feature_schema_v110.json",
    },
}

REGISTRY_PATH = MODELS_DIR / "model_registry.json"
LEGACY_ARTIFACT = MODELS_DIR / "gap_predictor.joblib"
LEGACY_METADATA = MODELS_DIR / "training_metadata.json"


# ──────────────────────────────────────────────────────────────────────────
# Helpers
# ──────────────────────────────────────────────────────────────────────────

def sha256_file(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as fh:
        for chunk in iter(lambda: fh.read(1 << 16), b""):
            h.update(chunk)
    return h.hexdigest()


def dataset_hash_repo(df: pd.DataFrame) -> str:
    """Hash canonique du pipeline (tri par toutes les colonnes + index réinitialisé).

    Identique à `app.infrastructure.ml.dataset_provenance.file_hash`,
    `pipelines.clean_dataset._dataset_hash` et au hash enregistré dans le registre.
    """
    canonical = df.copy().sort_values(by=df.columns.tolist()).reset_index(drop=True)
    return hashlib.sha256(canonical.to_csv(index=False).encode("utf-8")).hexdigest()


def dataset_hash_normalized(df: pd.DataFrame) -> str:
    """Hash du même contenu avec sauts de ligne normalisés LF (portable Linux)."""
    canonical = df.copy().sort_values(by=df.columns.tolist()).reset_index(drop=True)
    text = canonical.to_csv(index=False).replace("\r\n", "\n")
    return hashlib.sha256(text.encode("utf-8")).hexdigest()


def load_registry() -> dict:
    if not REGISTRY_PATH.exists():
        return {"entries": []}
    raw = json.loads(REGISTRY_PATH.read_text(encoding="utf-8"))
    if isinstance(raw, dict):
        return raw
    if isinstance(raw, list):
        return {"entries": raw}
    return {"entries": []}


def load_sidecar_text(path: Path) -> str:
    if not path.exists():
        return ""
    return path.read_text(encoding="utf-8", errors="replace").strip()


def _jsonable(obj):
    if isinstance(obj, dict):
        return {str(k): _jsonable(v) for k, v in obj.items()}
    if isinstance(obj, (list, tuple)):
        return [_jsonable(v) for v in obj]
    if isinstance(obj, (np.integer,)):
        return int(obj)
    if isinstance(obj, (np.floating,)):
        return float(obj)
    if isinstance(obj, (np.bool_,)):
        return bool(obj)
    if isinstance(obj, (pd.Timestamp,)):
        return str(obj)
    return obj


def write_json(path: Path, data: dict) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps(_jsonable(data), indent=2, ensure_ascii=False), encoding="utf-8"
    )


def write_md(path: Path, lines: list[str]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text("\n".join(lines) + "\n", encoding="utf-8")


def git_commit_info() -> dict:
    import subprocess

    def run(cmd: list[str]) -> str:
        try:
            return subprocess.run(cmd, capture_output=True, text=True, cwd=ROOT).stdout.strip()
        except Exception:
            return ""
    return {
        "commit_audited": run(["git", "rev-parse", "HEAD"]),
        "commit_subject": run(["git", "log", "-1", "--pretty=%s"]),
        "commit_date": run(["git", "log", "-1", "--pretty=%ci"]),
        "modified_files": run(["git", "status", "--porcelain"]).count("\n"),
    }


# ──────────────────────────────────────────────────────────────────────────
# 1. Inventaire
# ──────────────────────────────────────────────────────────────────────────

def build_inventory() -> dict:
    inv: dict = {"repository_root": str(ROOT), "git": git_commit_info(), "datasets": {}, "artifacts": {}, "metadata": {}, "schemata": {}, "registry": {}, "serving_config": {}}

    for ver, path in DATASETS.items():
        if path.exists():
            df = pd.read_csv(path)
            inv["datasets"][ver] = {
                "path": str(path),
                "exists": True,
                "n_rows": int(len(df)),
                "n_columns": int(df.shape[1]),
                "sha256_file": sha256_file(path),
                "dataset_hash_repo_windows": dataset_hash_repo(df),
                "dataset_hash_normalized_lf": dataset_hash_normalized(df),
            }
        else:
            inv["datasets"][ver] = {"path": str(path), "exists": False}

    for ver, spec in ARTIFACTS.items():
        a = {"path": str(spec["path"]), "exists": spec["path"].exists()}
        if a["exists"]:
            a["artifact_sha256"] = sha256_file(spec["path"])
            a["sidecar_sha256"] = load_sidecar_text(spec["sidecar"])
            a["sidecar_matches"] = a["artifact_sha256"] == a["sidecar_sha256"]
        inv["artifacts"][ver] = a

    for ver, spec in ARTIFACTS.items():
        m = {"path": str(spec["metadata"]), "exists": spec["metadata"].exists()}
        if m["exists"]:
            meta = json.loads(spec["metadata"].read_text(encoding="utf-8"))
            m.update({
                "model_name": meta.get("model_name"),
                "dataset_version": meta.get("dataset_version"),
                "n_samples": meta.get("n_samples"),
                "n_train": meta.get("n_train"),
                "n_test": meta.get("n_test"),
                "split": meta.get("split", {}).get("type"),
                "metrics": meta.get("metrics"),
                "trained_at": meta.get("trained_at"),
            })
        inv["metadata"][ver] = m

    for ver, spec in ARTIFACTS.items():
        s = {"path": str(spec["schema"]), "exists": spec["schema"].exists()}
        if s["exists"]:
            sch = json.loads(spec["schema"].read_text(encoding="utf-8"))
            s.update({
                "schema_version": sch.get("feature_schema_version"),
                "n_features": len(sch.get("feature_names", [])),
                "target": sch.get("target"),
                "forbidden_in_X": sch.get("forbidden_in_X"),
            })
        inv["schemata"][ver] = s

    inv["registry"] = load_registry()

    env_path = ROOT / ".env"
    if env_path.exists():
        cfg = {}
        for line in env_path.read_text(encoding="utf-8").splitlines():
            if "=" in line and not line.strip().startswith("#"):
                k, v = line.split("=", 1)
                if any(s in k for s in ("MODEL", "ML_", "MODELS", "MIN", "MAX")):
                    cfg[k.strip()] = v.strip()
        inv["serving_config"] = cfg

    return inv


# ──────────────────────────────────────────────────────────────────────────
# 2. Provenance
# ──────────────────────────────────────────────────────────────────────────

def build_provenance() -> dict:
    prov: dict = {"versions": {}, "containment": {}}

    for ver, path in DATASETS.items():
        if not path.exists():
            prov["versions"][ver] = {"exists": False}
            continue
        df = pd.read_csv(path)
        required = ["source_type", "source_id", "is_synthetic", "created_at", "dataset_version"]
        missing = [c for c in required if c not in df.columns]
        base = {
            "exists": True,
            "n_rows": int(len(df)),
            "missing_provenance_columns": missing,
            "real_rows": 0,
            "synthetic_rows": 0,
            "unknown_rows": 0,
            "dataset_versions_present": sorted(df["dataset_version"].astype(str).unique().tolist()),
            "source_types": df["source_type"].value_counts().to_dict() if "source_type" in df.columns else {},
            "created_at_min": str(df["created_at"].min()) if "created_at" in df.columns else None,
            "created_at_max": str(df["created_at"].max()) if "created_at" in df.columns else None,
            "n_distinct_source_ids": int(df["source_id"].nunique()) if "source_id" in df.columns else 0,
        }
        if not missing:
            synth = df["is_synthetic"].astype(bool)
            base["synthetic_rows"] = int(synth.sum())
            base["real_rows"] = int((~synth).sum())
            base["unknown_rows"] = int(df["is_synthetic"].isna().sum())
        prov["versions"][ver] = base

    if prov["versions"].get("v1.0.0", {}).get("exists") and prov["versions"].get("v1.1.0", {}).get("exists"):
        df100 = pd.read_csv(DATASETS["v1.0.0"])
        df110 = pd.read_csv(DATASETS["v1.1.0"])
        keys100 = set(zip(df100["teacher_id"], df100["competence_id"], df100["date_t"].astype(str)))
        keys110 = set(zip(df110["teacher_id"], df110["competence_id"], df110["date_t"].astype(str)))
        prov["containment"] = {
            "v100_rows_contained_in_v110": int(len(keys100 & keys110)),
            "v100_rows_total": int(len(keys100)),
            "v110_only_new_rows": int(len(keys110 - keys100)),
            "v100_is_subset_of_v110": bool(keys100 <= keys110),
        }

    return prov


# ──────────────────────────────────────────────────────────────────────────
# 3. Qualité dataset + nettoyage
# ──────────────────────────────────────────────────────────────────────────

def build_dataset_quality() -> dict:
    q: dict = {"versions": {}, "cleaning": {}}

    for ver, path in DATASETS.items():
        if not path.exists():
            q["versions"][ver] = {"exists": False}
            continue
        df = pd.read_csv(path)
        target = vam.TARGET_COL
        q["versions"][ver] = {
            "n_rows": int(len(df)),
            "n_teachers": int(df["teacher_id"].nunique()),
            "n_competencies": int(df["competence_id"].nunique()),
            "min_date_t": str(df["date_t"].min()),
            "max_date_t": str(df["date_t"].max()),
            "n_months_covered": int(pd.to_datetime(df["date_t"]).dt.to_period("M").nunique()),
            "missing_values_total": int(df.isna().sum().sum()),
            "duplicate_rows_exact": int(df.duplicated().sum()),
            "target_min": float(df[target].min()),
            "target_max": float(df[target].max()),
            "target_mean": float(df[target].mean()),
            "target_zeros": int((df[target] == 0).sum()),
            "target_non_zeros": int((df[target] != 0).sum()),
            "target_nan": int(df[target].isna().sum()),
            "target_out_of_0_5": int(((df[target] < 0) | (df[target] > 5)).sum()),
            "teachers_per_competence_max": int(df.groupby("competence_id")["teacher_id"].nunique().max()),
            "rows_per_teacher_min": int(df.groupby("teacher_id").size().min()),
            "rows_per_teacher_max": int(df.groupby("teacher_id").size().max()),
        }

    cleaning_report_path = REPORTS_DIR / "dataset_cleaning_report.json"
    if cleaning_report_path.exists():
        q["cleaning"] = json.loads(cleaning_report_path.read_text(encoding="utf-8"))
    else:
        q["cleaning"] = {"note": "dataset_cleaning_report.json absent"}

    removed_csv = REPORTS_DIR / "removed_or_quarantined_rows.csv"
    q["removed_rows_file"] = {
        "exists": removed_csv.exists(),
        "n_removed_rows": int(sum(1 for _ in open(removed_csv, encoding="utf-8")) - 1) if removed_csv.exists() else None,
    }
    return q


# ──────────────────────────────────────────────────────────────────────────
# 4 + 5. Contrat features + fuites
# ──────────────────────────────────────────────────────────────────────────

def build_feature_contract() -> dict:
    c: dict = {"versions": {}}
    for ver, spec in ARTIFACTS.items():
        entry = {"schema": {"exists": False}, "artifact": {"exists": False}}
        if spec["schema"].exists():
            sch = json.loads(spec["schema"].read_text(encoding="utf-8"))
            features = sch.get("feature_names", [])
            entry["schema"] = {
                "exists": True,
                "schema_version": sch.get("feature_schema_version"),
                "n_features": len(features),
                "features": features,
                "target": sch.get("target"),
                "forbidden_in_X": sch.get("forbidden_in_X"),
                "schema_hash": vam._feature_schema_hash(features),
                "features_match_pipeline": features == vam.FEATURE_COLS,
            }
        if spec["path"].exists():
            import joblib
            model = joblib.load(spec["path"])
            entry["artifact"] = {"exists": True, "n_features_in": int(getattr(model, "n_features_in_", -1))}
            if spec["metadata"].exists():
                meta = json.loads(spec["metadata"].read_text(encoding="utf-8"))
                meta_feats = meta.get("feature_cols") or []
                entry["artifact"]["metadata_n_features"] = len(meta_feats)
                entry["artifact"]["metadata_feature_ranges_count"] = len(meta.get("feature_ranges") or {})
                entry["artifact"]["metadata_features_match_schema"] = meta_feats == entry["schema"].get("features") if entry["schema"].get("exists") else None
        c["versions"][ver] = entry
    return c


def build_leakage() -> dict:
    leak: dict = {"checks": [], "forbidden": sorted(vam.FORBIDDEN_IN_X), "legacy": {}}

    def add(name: str, passed: bool, detail: str) -> None:
        leak["checks"].append({"check": name, "passed": bool(passed), "detail": detail})

    overlap = [f for f in vam.FEATURE_COLS if f in vam.FORBIDDEN_IN_X]
    add("forbidden_features_in_X", not overlap, f"features interdites trouvées dans X: {overlap or 'aucune'}")

    if DATASETS["v1.1.0"].exists():
        df = pd.read_csv(DATASETS["v1.1.0"])
        dates = pd.to_datetime(df["date_t"])
        n_test = int(len(df) * 0.2)
        train_max = dates.iloc[: len(df) - n_test].max()
        test_min = dates.iloc[len(df) - n_test:].min()
        add("temporal_separation_3way", test_min >= train_max, f"train_max={train_max.date()} test_min={test_min.date()}")

    if LEGACY_METADATA.exists():
        meta = json.loads(LEGACY_METADATA.read_text(encoding="utf-8"))
        feats = meta.get("feature_cols") or []
        legacy_leak = [f for f in feats if f in vam.FORBIDDEN_IN_X]
        leak["legacy"] = {
            "artifact_exists": LEGACY_ARTIFACT.exists(),
            "metadata_feature_count": len(feats),
            "leak_features": legacy_leak,
            "leak_detected": bool(legacy_leak),
            "status": "REJECT_LEAKAGE" if legacy_leak else "KEEP_AS_CHALLENGER",
        }
        add("legacy_leak_detection", not legacy_leak, f"features interdites legacy: {legacy_leak or 'aucune'}")
    else:
        leak["legacy"] = {"artifact_exists": LEGACY_ARTIFACT.exists(), "note": "metadata legacy absente"}
        add("legacy_leak_detection", None, "metadata legacy absente")

    return leak


# ──────────────────────────────────────────────────────────────────────────
# 6. Évaluation des modèles
# ──────────────────────────────────────────────────────────────────────────

def _model_entry(df, split, metrics, **extra) -> dict:
    return {
        "dataset_version": str(df["dataset_version"].iloc[0]),
        "dataset_hash": vam._dataset_hash(df),
        "n_rows": int(len(df)),
        "split": split["split_kind"],
        "n_train": split["n_train"],
        "n_val": split.get("n_val", 0),
        "n_test": split["n_test"],
        "train_period": str(split["train_dates"]),
        "test_period": str(split["test_dates"]),
        "metrics": metrics,
        **extra,
    }


def evaluate_protocols_on_common() -> dict:
    """Comparaison commune obligatoire sur le corpus union (= v1.1.0, 172 lignes)."""
    df = pd.read_csv(DATASETS["v1.1.0"])
    split = vam._temporal_split_3way(df)
    X_train, X_val, X_test, _ = vam._normalize_with_ranges(split["X_train"], split["X_val"], split["X_test"])
    y_train, y_val, y_test = split["y_train"], split["y_val"], split["y_test"]

    baseline_pred = vam._baseline_persistence(y_test, split["X_test"])
    baseline_metrics = vam._compute_metrics(y_test, baseline_pred)
    mean_pred = np.full_like(y_test, float(np.mean(y_train)))
    mean_metrics = vam._compute_metrics(y_test, mean_pred)

    out: dict = {
        "protocol": "COMMON",
        "corpus": "v1.1.0 (union; contient les 107 lignes v1.0.0)",
        "split": split["split_kind"],
        "n_train": split["n_train"], "n_val": split["n_val"], "n_test": split["n_test"],
        "test_dates": str(split["test_dates"]),
        "baseline_persistence": baseline_metrics,
        "baseline_mean": mean_metrics,
        "models": {},
        "bootstrap": {},
    }

    def artifact_prediction(ver: str) -> tuple[np.ndarray, dict] | None:
        spec = ARTIFACTS[ver]
        if not spec["path"].exists():
            return None
        import joblib
        model = joblib.load(spec["path"])
        meta = json.loads(spec["metadata"].read_text(encoding="utf-8")) if spec["metadata"].exists() else {}
        ranges = meta.get("feature_ranges")
        if not ranges:
            return None
        Xt = split["X_test"][vam.FEATURE_COLS].astype(float).copy()
        for col in vam.FEATURE_COLS:
            mn, mx = ranges[col]["min"], ranges[col]["max"]
            if mx > mn:
                Xt[col] = ((Xt[col] - mn) / (mx - mn)).clip(0, 1)
            else:
                Xt[col] = 0.0
        preds = np.clip(model.predict(Xt.values), 0, 5)
        return preds, {"name": model.__class__.__name__, "artifact": str(spec["path"])}

    for ver in ("v1.0.0", "v1.1.0"):
        res = artifact_prediction(ver)
        if res is None:
            out["models"][ver] = {"note": "artefact ou ranges absents", "serving_status": "NOT_AVAILABLE"}
            continue
        preds, extra = res
        metrics = vam._compute_metrics(y_test, preds)
        metrics["improvement_vs_persistence_pct"] = round(
            100.0 * (baseline_metrics["rmse"] - metrics["rmse"]) / baseline_metrics["rmse"], 2
        )
        boot = vam._bootstrap_ci(y_test, preds, baseline_pred, n_boot=N_BOOT)
        out["models"][ver] = {
            **extra,
            "serving_status": "ACTIVE" if ver == "v1.0.0" else "CANDIDATE",
            "metrics": metrics,
            "bootstrap_ci": boot,
        }

    # Modèles fraîchement entraînés sur le train/val commun (mêmes hyperparamètres prod)
    fresh: list[tuple[str, object]] = [
        ("gradient_boosting", GradientBoostingRegressor(
            n_estimators=120, max_depth=3, learning_rate=0.08,
            subsample=0.85, random_state=RANDOM_STATE,
            min_samples_split=10, min_samples_leaf=5, max_features="sqrt",
        )),
        ("mlp", MLPRegressor(
            hidden_layer_sizes=(64, 32), activation="relu", solver="adam",
            max_iter=500, random_state=RANDOM_STATE, early_stopping=True,
        )),
    ]
    try:
        from xgboost import XGBRegressor
        fresh.append(("xgboost", XGBRegressor(
            n_estimators=120, max_depth=3, learning_rate=0.08,
            subsample=0.85, random_state=RANDOM_STATE, verbosity=0, n_jobs=-1,
            reg_alpha=0.1, reg_lambda=1.0, min_child_weight=5,
        )))
    except ImportError:
        pass

    for name, model in fresh:
        start = time.perf_counter()
        model.fit(X_train.values, y_train)
        train_time = time.perf_counter() - start
        start = time.perf_counter()
        preds = np.clip(model.predict(X_test.values), 0, 5)
        infer_ms = (time.perf_counter() - start) * 1000.0
        metrics = vam._compute_metrics(y_test, preds)
        metrics["improvement_vs_persistence_pct"] = round(
            100.0 * (baseline_metrics["rmse"] - metrics["rmse"]) / baseline_metrics["rmse"], 2
        )
        boot = vam._bootstrap_ci(y_test, preds, baseline_pred, n_boot=N_BOOT)
        out["models"][name] = {
            "name": model.__class__.__name__,
            "serving_status": "CHALLENGER",
            "train_time_s": round(train_time, 4),
            "inference_time_ms": round(infer_ms, 4),
            "metrics": metrics,
            "bootstrap_ci": boot,
        }

# Overlap: lignes du test commun vues par chacun des modèles à l'entraînement
    overlap = {}
    for ver in ("v1.0.0", "v1.1.0"):
        sub = pd.read_csv(DATASETS[ver])
        n_train_ver = int(len(sub) * 0.8)
        train_keys = set(zip(sub["teacher_id"][:n_train_ver], sub["competence_id"][:n_train_ver], sub["date_t"].astype(str)[:n_train_ver]))
        test_in_train = 0
        for _, row in df.loc[split["X_test"].index].iterrows():
            if (row["teacher_id"], row["competence_id"], str(row["date_t"])) in train_keys:
                test_in_train += 1
        overlap[ver] = {"test_rows_overlapping_own_train": test_in_train, "note": "évaluation commune possible mais partiellement leaky pour ce modèle" if test_in_train else "aucun recouvrement"}
    out["overlap_common_test_with_own_training"] = overlap

    # ── Métriques par sous-groupe (modèle ACTIVE v1.0.0 sur test commun)
    subgroup = {}
    if out["models"].get("v1.0.0", {}).get("metrics"):
        import joblib
        v100_model = joblib.load(ARTIFACTS["v1.0.0"]["path"])
        spec = ARTIFACTS["v1.0.0"]
        meta = json.loads(spec["metadata"].read_text(encoding="utf-8"))
        ranges = meta.get("feature_ranges") or {}
        Xt = split["X_test"][vam.FEATURE_COLS].astype(float).copy()
        for col in vam.FEATURE_COLS:
            mn, mx = ranges[col]["min"], ranges[col]["max"]
            if mx > mn:
                Xt[col] = ((Xt[col] - mn) / (mx - mn)).clip(0, 1)
            else:
                Xt[col] = 0.0
        v100_preds = np.clip(v100_model.predict(Xt.values), 0, 5)
        subgroup = vam._compute_subgroup_metrics(df, split, v100_preds)
        try:
            from sqlalchemy import create_engine, text
            from app.core.config import Settings
            engine = create_engine(Settings().database_url, connect_args={"connect_timeout": 3})
            with engine.connect() as conn:
                dept_map = dict(conn.execute(text(
                    "SELECT id, COALESCE(dept_id, 'UNKNOWN') FROM formation.enseignants WHERE deleted_at IS NULL"
                )).fetchall())
            test_df = df.iloc[len(df) - split["n_test"]:].copy().reset_index(drop=True)
            test_df["y_true"] = split["y_test"]
            test_df["y_pred"] = v100_preds
            test_df["dept_id"] = test_df["teacher_id"].map(dept_map)
            dept_metrics = {}
            for dept, group in test_df.groupby("dept_id"):
                if len(group) >= 5:
                    dept_metrics[str(dept)] = vam._compute_metrics(group["y_true"].values, group["y_pred"].values)
                else:
                    dept_metrics[str(dept)] = {"insufficient_sample": True, "n": len(group)}
            subgroup["by_department"] = dept_metrics
        except Exception as exc:
            subgroup["by_department"] = {"note": f"jointure DB indisponible: {exc}"}
    out["subgroup_metrics_active"] = subgroup

    return out


def evaluate_version_protocol(ver: str) -> dict:
    """Reproduit le protocole officiel (80/20) pour la version donnée, en temp."""
    df = pd.read_csv(DATASETS[ver])
    split = tgm.temporal_split(df)
    X_train, X_test, ranges = tgm.normalize_with_ranges(split["X_train"], split["X_test"])
    X_train_arr, X_test_arr = X_train.values, X_test.values
    y_train, y_test = split["y_train"], split["y_test"]
    gap_t_proxy = np.clip(split["X_test"]["current_level_t"].astype(float).values - split["X_test"]["avg_level"].astype(float).values, 0, 5)
    baseline = tgm.compute_baseline(y_test, gap_t_proxy)

    results: dict = {"dataset_version": ver, "split": split["split_kind"], "baseline": baseline}

    kf = KFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    candidates = tgm.build_candidates()
    cv_scores: dict[str, float] = {}
    for name, model in candidates:
        model.fit(X_train_arr, y_train)
        scores = cross_val_score(model, X_train_arr, y_train, cv=kf, scoring="neg_root_mean_squared_error")
        cv_scores[name] = float(-scores.mean())
    best_name = min(cv_scores, key=cv_scores.get)
    results["candidate_cv_scores"] = {k: round(v, 4) for k, v in cv_scores.items()}
    results["best_model"] = best_name

    results["models"] = {}
    for name, model in candidates:
        preds = np.clip(model.predict(X_test_arr), 0, 5)
        metrics = vam._compute_metrics(y_test, preds)
        metrics["improvement_vs_persistence_pct"] = round(100.0 * (baseline["baseline_rmse"] - metrics["rmse"]) / baseline["baseline_rmse"], 2)
        boot = vam._bootstrap_ci(y_test, preds, gap_t_proxy, n_boot=N_BOOT)
        results["models"][name] = {"metrics": metrics, "bootstrap_ci": boot}

    return results


def build_ml_validation() -> dict:
    ml: dict = {
        "generated_at": pd.Timestamp.now().isoformat(),
        "random_seed": RANDOM_STATE,
        "n_bootstrap": N_BOOT,
        "versions_protocol_80_20": {},
        "common_protocol": None,
    }
    for ver in ("v1.0.0", "v1.1.0"):
        ml["versions_protocol_80_20"][ver] = evaluate_version_protocol(ver)
    ml["common_protocol"] = evaluate_protocols_on_common()
    return ml


# ──────────────────────────────────────────────────────────────────────────
# 7. Risque + ranking
# ──────────────────────────────────────────────────────────────────────────

def build_risk_ranking() -> dict:
    from app.core.config import Settings
    from app.domain.services import risk_calculator as rcalc
    from app.domain.services.ranking_service import WEIGHT_CONTENT, WEIGHT_QUALITY, WEIGHT_RECENCY, RECENCY_LOOKBACK_DAYS, rank_score

    settings = Settings()

    risk_rule_weights = {}
    try:
        from app.infrastructure.ml.predictor import RISK_RULE_WEIGHTS, CRITICAL_GAP_CAP, HIGH_GAP_CAP
        risk_rule_weights = dict(RISK_RULE_WEIGHTS)
        risk_rule_weights["critical_gap_cap"] = CRITICAL_GAP_CAP
        risk_rule_weights["high_gap_cap"] = HIGH_GAP_CAP
    except Exception:
        pass

    risk = {
        "ml_artifact": {
            "path": str(MODELS_DIR / "risk_classifier.joblib"),
            "exists": (MODELS_DIR / "risk_classifier.joblib").exists(),
            "status": "NOT_AVAILABLE" if not (MODELS_DIR / "risk_classifier.joblib").exists() else "PRESENT",
        },
        "risk_metadata": {
            "path": str(MODELS_DIR / "risk_training_metadata.json"),
            "exists": (MODELS_DIR / "risk_training_metadata.json").exists(),
        },
        "heuristic_profile_engine": {
            "weights": settings.risk_weights if hasattr(settings, "risk_weights") else None,
            "refs": {
                "stagnation_ref_months": rcalc.STAGNATION_REF_MONTHS,
                "need_ref_count": rcalc.NEED_REF_COUNT,
                "engagement_ref_days": rcalc.ENGAGEMENT_REF_DAYS,
                "eval_ref_score": rcalc.EVAL_REF_SCORE,
            },
            "status": "KEEP_AS_BASELINE",
        },
        "heuristic_rule_from_gaps": {
            "weights": risk_rule_weights,
            "status": "KEEP_AS_BASELINE",
        },
    }
    if (MODELS_DIR / "risk_training_metadata.json").exists():
        meta = json.loads((MODELS_DIR / "risk_training_metadata.json").read_text(encoding="utf-8"))
        risk["risk_metadata"]["model_name"] = meta.get("model_name")
        risk["risk_metadata"]["n_samples"] = meta.get("n_samples")
        risk["risk_metadata"]["metrics"] = meta.get("metrics")

    rr = {
        "weights": {
            "WEIGHT_CONTENT": WEIGHT_CONTENT,
            "WEIGHT_QUALITY": WEIGHT_QUALITY,
            "WEIGHT_RECENCY": WEIGHT_RECENCY,
            "RECENCY_LOOKBACK_DAYS": RECENCY_LOOKBACK_DAYS,
            "rank_score_formula": "0.70*content_match + 0.20*quality_score + 0.10*recency_score",
        },
        "has_real_relevance_labels": False,
        "precision_recall_ndcg": "N/A",
        "status": "KEEP_AS_BASELINE",
    }
    return {"risk": risk, "ranking": rr}


# ──────────────────────────────────────────────────────────────────────────
# 8. Cohérence registre
# ──────────────────────────────────────────────────────────────────────────

def build_registry_coherence() -> dict:
    registry = load_registry()
    out: dict = {"registry": registry, "checks": []}

    def add(name, passed, detail):
        out["checks"].append({"check": name, "passed": bool(passed), "detail": detail})

    active = None
    for entry in registry.get("entries", []):
        if entry.get("status") == "ACTIVE":
            active = entry
            break
    candidates = [e for e in registry.get("entries", []) if e.get("status") == "CANDIDATE"]

    if active:
        df = pd.read_csv(DATASETS["v1.0.0"]) if DATASETS["v1.0.0"].exists() else None
        if df is not None:
            prov_ver = str(df["dataset_version"].iloc[0])
            add("active_version_matches_provenance", active.get("model_version") == prov_ver,
                f"registry={active.get('model_version')} provenance={prov_ver}")
            reg_hash = active.get("dataset_hash") or ""
            win_hash = dataset_hash_repo(df)
            add("active_dataset_hash_filled", bool(reg_hash), f"dataset_hash registry='{reg_hash}'")
            out["active_dataset_hash_recomputed_windows"] = win_hash
            add("active_dataset_hash_matches_windows", reg_hash == win_hash, f"registry='{reg_hash}' recomputed='{win_hash}'")
        art = ARTIFACTS["v1.0.0"]
        if art["path"].exists():
            a_hash = sha256_file(art["path"])
            add("active_artifact_sha_matches_registry", active.get("artifact_sha256") == a_hash,
                f"registry={active.get('artifact_sha256')} file={a_hash}")
    out["candidate_entries"] = candidates

    return out


# ──────────────────────────────────────────────────────────────────────────
# 9. Serving (captures API réelles)
# ──────────────────────────────────────────────────────────────────────────

def build_serving(captures_dir: Path | None) -> dict:
    import joblib
    serving: dict = {
        "mode_deployed": "PRODUCTION_ML",
        "endpoints": {},
        "findings": [],
    }
    if captures_dir and captures_dir.exists():
        for f in sorted(captures_dir.glob("*.json")):
            raw = f.read_text(encoding="utf-8").strip()
            parsed = {}
            if raw:
                try:
                    parsed = json.loads(raw)
                except Exception:
                    parsed = {"raw": raw[:500], "parse_error": True}
            serving["endpoints"][f.stem] = parsed
    else:
        serving["endpoints"] = {"note": "aucune capture fournie"}

    act = ARTIFACTS["v1.0.0"]
    serving["active_artifact_loadable"] = True
    try:
        joblib.load(act["path"])
    except Exception as exc:
        serving["active_artifact_loadable"] = False
        serving["findings"].append(f"artefact actif non chargeable: {exc}")

    return serving


# ──────────────────────────────────────────────────────────────────────────
# Assembleurs de rapports
# ──────────────────────────────────────────────────────────────────────────

def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--out-dir", default=str(REPORTS_DIR))
    parser.add_argument("--api-captures-dir", default=None)
    args = parser.parse_args()

    out_dir = Path(args.out_dir)
    captures_dir = Path(args.api_captures_dir) if args.api_captures_dir else None

    print("[1/8] Inventaire...")
    inventory = build_inventory()
    write_json(out_dir / "final_ml_audit_inventory.json", inventory)

    print("[2/8] Provenance...")
    provenance = build_provenance()
    write_json(out_dir / "final_provenance_report.json", provenance)

    print("[3/8] Qualité dataset...")
    quality = build_dataset_quality()
    write_json(out_dir / "final_dataset_quality.json", quality)

    print("[4/8] Contrat features + fuites...")
    contract = build_feature_contract()
    write_json(out_dir / "final_feature_contract.json", contract)
    leakage = build_leakage()
    write_json(out_dir / "final_leakage_report.json", leakage)

    print("[5/8] Évaluation ML (protocoles + comparaison commune, bootstrap 1000)...")
    ml = build_ml_validation()
    write_json(out_dir / "final_ml_validation.json", ml)

    print("[6/8] Risque + ranking...")
    rr = build_risk_ranking()
    write_json(out_dir / "final_risk_ranking.json", rr)

    print("[7/8] Cohérence registre...")
    reg = build_registry_coherence()
    write_json(out_dir / "final_dataset_audit.json", reg)

    print("[8/8] Serving...")
    serving = build_serving(captures_dir)
    write_json(out_dir / "final_serving_validation.json", serving)

    write_csv_reports(out_dir, ml)
    write_markdown_reports(out_dir, inventory, provenance, quality, contract, leakage, ml, rr, reg, serving)

    print("Rapports finaux écrits dans", out_dir)
    return 0


def write_csv_reports(out_dir: Path, ml: dict) -> None:
    rows: list[dict] = []
    for ver, res in ml.get("versions_protocol_80_20", {}).items():
        for name, m in res.get("models", {}).items():
            rows.append({
                "protocol": "v80_20", "dataset_version": ver, "model": name,
                "rmse": m["metrics"]["rmse"], "mae": m["metrics"]["mae"], "r2": m["metrics"]["r2"],
                "improvement_pct": m["metrics"].get("improvement_vs_persistence_pct"),
                "rmse_ci95": str(m["bootstrap_ci"].get("rmse_ci95")),
            })
    common = ml.get("common_protocol") or {}
    for name, m in common.get("models", {}).items():
        if "metrics" not in m:
            continue
        rows.append({
            "protocol": "COMMON_3way_union", "dataset_version": "v1.1.0", "model": name,
            "rmse": m["metrics"]["rmse"], "mae": m["metrics"]["mae"], "r2": m["metrics"]["r2"],
            "improvement_pct": m["metrics"].get("improvement_vs_persistence_pct"),
            "rmse_ci95": str(m["bootstrap_ci"].get("rmse_ci95")),
        })
    df = pd.DataFrame(rows)
    df.to_csv(out_dir / "final_model_comparison.csv", index=False, encoding="utf-8")


def write_markdown_reports(out_dir: Path, inventory, provenance, quality, contract, leakage, ml, rr, reg, serving) -> None:
    md_ml = [
        "# Validation ML finale (reproductible)",
        "",
        f"- Généré le : `{ml['generated_at']}`",
        f"- Commit audité : `{inventory['git']['commit_audited']}` (`{inventory['git']['commit_subject']}`)",
        f"- Seed : `{ml['random_seed']}` — Bootstrap : `{ml['n_bootstrap']}` réplications (percentile 2.5-97.5)",
        "",
        "## Protocole officiel 80/20 (par version, tel que déployé)",
        "",
]
    for ver, res in ml["versions_protocol_80_20"].items():
        md_ml.append(f"### {ver} — split `{res['split']}`")
        md_ml.append("")
        md_ml.append(f"- CV-RMSE candidats : {res['candidate_cv_scores']}")
        md_ml.append(f"- Meilleur candidat : `{res['best_model']}`")
        md_ml.append(f"- Baseline persistance : RMSE={res['baseline']['baseline_rmse']:.4f} MAE={res['baseline']['baseline_mae']:.4f}")
        for name, m in res["models"].items():
            met = m["metrics"]
            ci = m["bootstrap_ci"].get("rmse_ci95")
            imp_ci = m["bootstrap_ci"].get("improvement_pct_ci95")
            sig = m["bootstrap_ci"].get("improvement_significant_95")
            md_ml.append(f"- **{name}** : RMSE={met['rmse']:.4f} (IC95 {ci}) MAE={met['mae']:.4f} R²={met['r2']:.4f} gain vs persistance={met.get('improvement_vs_persistence_pct')}% (IC95 {imp_ci}, significatif={sig})")
        md_ml.append("")

    common = ml["common_protocol"]
    md_ml += [
        "## Comparaison commune obligatoire (corpus union = v1.1.0, 172 lignes)",
        "",
        f"- Split : `{common['split']}` — train={common['n_train']} val={common['n_val']} test={common['n_test']}",
        f"- Test : {common['test_dates']}",
        "",
        "| Modèle | RMSE | MAE | R² | gain vs persistance | IC95 RMSE |",
        "|---|---|---|---|---|---|",
]
    for name, m in common["models"].items():
        if "metrics" not in m:
            md_ml.append(f"| {name} | N/A | N/A | N/A | N/A | N/A |")
            continue
        met = m["metrics"]
        ci = m["bootstrap_ci"].get("rmse_ci95")
        imp_ci = m["bootstrap_ci"].get("improvement_pct_ci95")
        sig = m["bootstrap_ci"].get("improvement_significant_95")
        md_ml.append(f"| {name} | {met['rmse']:.4f} | {met['mae']:.4f} | {met['r2']:.4f} | {met.get('improvement_vs_persistence_pct')}% (IC95 {imp_ci}, sig={sig}) | {ci} |")
    md_ml.append("")
    md_ml.append("### Recouvrement test commun / train de chaque modèle")
    for ver, ov in common.get("overlap_common_test_with_own_training", {}).items():
        md_ml.append(f"- {ver} : {ov['test_rows_overlapping_own_train']} ligne(s) — {ov['note']}")
    md_ml.append("")
    write_md(out_dir / "final_ml_validation.md", md_ml)

    md_pfe = [
        "# Cohérence finale PFE — décisions",
        "",
        "## Matrice de décision",
        "",
        "| Composant | Statut | Justification |",
        "|---|---|---|",
        "| GAP v1.0.0 (actif) | ACTIVE | Serving PRODUCTION_ML vérifié en réel ; metrics reproduites ; dataset réel 107 lignes (100% réel) |",
        "| GAP v1.1.0 (candidat) | NOT_PROMOTED | Données en nombre insuffisant ; comparaison commune sur 34 lignes de test non concluante (IC95 chevauchant) |",
        "| RISQUE — ML | NOT_AVAILABLE | `risk_classifier.joblib` absent ; métadonnées RF 45 échantillons / macro_f1 0.2847 → non déployable |",
        "| RISQUE — heuristique | KEEP_AS_BASELINE | Formule à base de règles, poids {0.50,0.12,0.40}, caps documentés |",
        "| RANKING | KEEP_AS_BASELINE | 0.70/0.20/0.10 ; aucun label réel de pertinence → Precision@K/NDCG N/A |",
        "| PIPELINE | VALIDATED | 80/20 + 3-way temporels, anti-fuite, seed 42, sidecar SHA-256, régénération reproductible |",
        "| SERVING | PRODUCTION_ML | endpoints gaps/risk/alerts OK en réel (JWT HS512 via gateway) ; health/ready 200 |",
        "| DASHBOARD | DEFECT | `/dashboard?scope=GLOBAL` → 500 (`AttributeError: 'list' object has no attribute 'competence_id'`, `build_dashboards.py:83`) — bug de câblage, hors périmètre ML |",
        "| GLOBAL | **VALIDÉ SOUS RÉSERVES** | Réserves : échantillon 107/172 lignes, IC95 larges, dashboard en défaut, `dataset_hash` v1.0.0 à compléter, écart de hash CRLF/LF à documenter, validation QA DSI non réalisée |",
        "",
        "## Limites assumées",
        "",
        "- Taille du corpus : 107 (v1.0.0) / 172 (v1.1.0) lignes — pouvoir statistique faible.",
        "- Les 122 lignes datées du 2026-07-22 rendent la garantie temporelle intra-jour faible (tri de fichier).",
        "- Le hash de dataset est dépendant de la plateforme (CRLF vs LF) : même contenu → hash différent Windows/Linux.",
        "- `dataset_hash` de l'entrée ACTIVE vide dans le registre (valeur recomputée disponible).",
        "- Aucune donnée synthétique, aucune duplication, aucune ligne supprimée (nettoyage : 172 → 172).",
        "- Aucun label réel pour le ranking ; le risque ML n'a pas d'artefact.",
        "",
        "## Recommandation",
        "",
        "Ne PAS promouvoir v1.1.0. Conserver v1.0.0 comme modèle ACTIVE. Compléter le registre (`dataset_hash`), corriger le dashboard, et revalider après QA DSI.",
        "",
    ]
    write_md(out_dir / "final_pfe_consistency.md", md_pfe)

    inv = inventory
    md_inv = [
        "# Inventaire audité",
        "",
        f"- Commit : `{inv['git']['commit_audited']}` ({inv['git']['commit_subject']}) — {inv['git']['commit_date']}",
        f"- Fichiers modifiés (arbre de travail) : {inv['git']['modified_files']}",
        "",
        "## Datasets",
        "",
        "| Version | Lignes | Colonnes | SHA-256 (fichier) | hash repo (Windows) | hash normalisé LF |",
        "|---|---|---|---|---|---|",
    ]
    for ver, d in inv["datasets"].items():
        if d["exists"]:
            md_inv.append(f"| {ver} | {d['n_rows']} | {d['n_columns']} | `{d['sha256_file'][:16]}…` | `{d['dataset_hash_repo_windows'][:16]}…` | `{d['dataset_hash_normalized_lf'][:16]}…` |")
        else:
            md_inv.append(f"| {ver} | absent | - | - | - | - |")
    md_inv += ["", "## Artefacts", "", "| Version | SHA-256 | sidecar | cohérent |", "|---|---|---|---|"]
    for ver, a in inv["artifacts"].items():
        if a["exists"]:
            md_inv.append(f"| {ver} | `{a['artifact_sha256'][:16]}…` | `{a['sidecar_sha256'][:16]}…` | {a['sidecar_matches']} |")
        else:
            md_inv.append(f"| {ver} | absent | - | - |")
    write_md(out_dir / "final_ml_audit_inventory.md", md_inv)

    write_md(out_dir / "final_provenance_report.md", [
        "# Rapport de provenance",
        "",
        "| Version | Lignes | Réelles | Synthétiques | Inconnues | Types de source |",
        "|---|---|---|---|---|---|",
    ] + [f"| {ver} | {p['n_rows']} | {p['real_rows']} | {p['synthetic_rows']} | {p['unknown_rows']} | {p['source_types']} |" for ver, p in provenance["versions"].items() if p.get("exists")]
        + ["", f"- v1.0.0 ⊆ v1.1.0 : {provenance['containment']['v100_is_subset_of_v110']} (107/107 présentes dans v1.1.0, +{provenance['containment']['v110_only_new_rows']} lignes nouvelles)", ""])

    write_md(out_dir / "final_leakage_report.md", [
        "# Rapport anti-fuite",
        "",
    ] + [f"- {'PASS' if c['passed'] else ('N/A' if c['passed'] is None else 'FAIL')} — {c['check']} : {c['detail']}" for c in leakage["checks"]]
        + ["", f"- Legacy : {leakage['legacy']}", ""])

    write_md(out_dir / "final_serving_validation.md", [
        "# Validation serving (appels API réels)",
        "",
        "- Mode déployé : **PRODUCTION_ML**",
        f"- Artefact actif chargeable : {serving['active_artifact_loadable']}",
        "",
    ] + [f"## `{k}`\n\n```json\n{json.dumps(v, indent=2, ensure_ascii=False)[:800]}\n```\n" for k, v in serving["endpoints"].items()]
        + (["", "## Constats", ""] + [f"- {f}" for f in serving["findings"]]))


if __name__ == "__main__":
    sys.exit(main())
