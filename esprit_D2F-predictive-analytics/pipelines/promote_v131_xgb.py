"""Promotion de XGBoost v1.3.1-xgb (réglage gouverné) — 2026-10-01.

Contexte : v1.3.0-xgb (servi depuis le 2026-09-27) garde les hyperparamètres
fixés à la main de ``train_gap_model``. ``pipelines.improve_gap_models --corpus
reel`` choisit ceux de v1.3.1-xgb par validation croisée temporelle sur le SEUL
train (meilleure famille en CV : 0,528 contre 0,565 pour la règle) ; le test
n'a servi qu'à l'évaluation finale. Même corpus (200 lignes réelles), mêmes 29
features, même split 160/40 que v1.3.0-xgb.

Le script :
- vérifie l'empreinte de l'artefact candidat (sidecar SHA-256) et sa metadata ;
- mesure sur le test temporel, APPARIÉ contre v1.3.0-xgb : gains de RMSE, MAE
  et accuracy ±0,5 (IC95 bootstrap 1000) + test de Wilcoxon sur les erreurs
  absolues ; rappelle l'écart à la règle simple (non significatif) ;
- enregistre v1.3.1-xgb, déclare l'exception (acteur, date, justification) et
  la promeut ACTIVE — v1.3.0-xgb est archivée, retour arrière possible ;
- installe l'artefact, son sidecar, sa metadata et son schéma de features sous
  les noms servis ; écrit ``reports/v131xgb_promotion.json``.

Usage :
    python -m pipelines.promote_v131_xgb --dry-run
    python -m pipelines.promote_v131_xgb
"""
from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from scipy.stats import wilcoxon

BASE = Path(__file__).parent.parent
sys.path.insert(0, str(BASE))

from app.infrastructure.ml.model_registry import ModelRegistry  # noqa: E402
from pipelines.baselines import served_under_override  # noqa: E402
from pipelines.register_model import register_model  # noqa: E402
from pipelines.train_gap_model import FEATURE_COLS, temporal_split  # noqa: E402

MODELS = BASE / "data" / "models"
CORPUS = BASE / "data" / "clean" / "training_corpus_provenanced.csv"
VERSION = "v1.3.1-xgb"
PREVIOUS_VERSION = "v1.3.0-xgb"
CANDIDATE = MODELS / "gap_predictor_temporal_v131-xgb.joblib"
CANDIDATE_META = MODELS / "temporal_training_metadata_v131-xgb.json"
PREVIOUS = MODELS / "gap_predictor_temporal_v130-xgb.joblib"
PREVIOUS_META = MODELS / "temporal_training_metadata_v130-xgb.json"
SERVED = MODELS / "gap_predictor_temporal.joblib"
SERVED_META = MODELS / "temporal_training_metadata.json"
REPORT = BASE / "reports" / "v131xgb_promotion.json"
ACTOR = "decision-projet:2026-10-01"
JUSTIFICATION = (
    "Reglage gouverne : hyperparametres XGBoost choisis par validation croisee temporelle "
    "sur le train uniquement (improve_gap_models --corpus reel) ; meme corpus, memes 29 "
    "features, meme split que v1.3.0-xgb. Meilleur que v1.3.0-xgb en RMSE, MAE, R2 et "
    "accuracy +-0,5 sur le test, sans significativite (40 lignes de test). Ne bat pas la "
    "regle simple (ecart non significatif) : exception TRACEE et REVERSIBLE (rollback v1.3.0-xgb)."
)
N_BOOT = 1000


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as f:
        for chunk in iter(lambda: f.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _predict(model_path: Path, meta_path: Path, X: pd.DataFrame) -> np.ndarray:
    ranges = json.loads(meta_path.read_text(encoding="utf-8"))["feature_ranges"]
    Xn = X.copy()
    for c in FEATURE_COLS:
        mn, mx = ranges[c]["min"], ranges[c]["max"]
        Xn[c] = ((Xn[c] - mn) / (mx - mn)).clip(0, 1) if mx > mn else 0.0
    return np.clip(joblib.load(model_path).predict(Xn.values), 0, 5)


def _metrics(y: np.ndarray, p: np.ndarray) -> dict[str, float]:
    e = np.abs(y - p)
    return {"rmse": float(np.sqrt(np.mean(e ** 2))), "mae": float(np.mean(e)),
            "acc_pm05": float(np.mean(e <= 0.5) * 100), "acc_pm10": float(np.mean(e <= 1.0) * 100)}


def paired_comparison(y: np.ndarray, p_ref: np.ndarray, p_new: np.ndarray) -> dict:
    """Gains appariés du nouveau sur la référence (positif = le nouveau fait mieux)."""
    def gains(i: np.ndarray) -> dict[str, float]:
        r, n = _metrics(y[i], p_ref[i]), _metrics(y[i], p_new[i])
        return {"rmse": r["rmse"] - n["rmse"], "mae": r["mae"] - n["mae"],
                "acc_pm05": n["acc_pm05"] - r["acc_pm05"]}
    point = gains(np.arange(len(y)))
    rng = np.random.default_rng(42)
    boots = [gains(rng.integers(0, len(y), len(y))) for _ in range(N_BOOT)]
    out = {}
    for k, v in point.items():
        lo, hi = np.percentile([b[k] for b in boots], [2.5, 97.5])
        out[k] = {"gain": round(v, 4), "ci95": [round(float(lo), 4), round(float(hi), 4)],
                  "significant": bool(lo > 0)}
    err_ref, err_new = np.abs(y - p_ref), np.abs(y - p_new)
    stat = wilcoxon(err_ref, err_new, alternative="greater", zero_method="zsplit")
    out["wilcoxon_abs_error"] = {"hypothese": "erreur(reference) > erreur(nouveau)",
                                 "p_value": round(float(stat.pvalue), 4),
                                 "significant": bool(stat.pvalue < 0.05)}
    out["test_rows_better"] = int(np.sum(err_new < err_ref - 1e-12))
    out["test_rows_worse"] = int(np.sum(err_new > err_ref + 1e-12))
    return out


def main() -> int:
    ap = argparse.ArgumentParser(description="Promotion v1.3.1-xgb (reglage gouverne)")
    ap.add_argument("--dry-run", action="store_true")
    args = ap.parse_args()

    if _sha256(CANDIDATE) != Path(str(CANDIDATE) + ".sha256").read_text(encoding="utf-8").strip():
        print("[REFUS] empreinte de l'artefact candidat differente de son sidecar")
        return 1
    meta = json.loads(CANDIDATE_META.read_text(encoding="utf-8"))
    if meta.get("model_version") != VERSION or meta.get("algorithm") != "xgboost":
        print(f"[REFUS] metadata inattendue : {meta.get('model_version')} / {meta.get('algorithm')}")
        return 1
    if list(meta.get("feature_cols") or []) != list(FEATURE_COLS):
        print("[REFUS] schema de features different du contrat de serving (29 features)")
        return 1

    split = temporal_split(pd.read_csv(CORPUS))
    y = split["y_test"]
    p_new = _predict(CANDIDATE, CANDIDATE_META, split["X_test"])
    p_prev = _predict(PREVIOUS, PREVIOUS_META, split["X_test"])
    vs_prev = paired_comparison(y, p_prev, p_new)
    m = meta["metrics"]
    print(f"[mesure] test {len(y)} lignes | v1.3.0-xgb {_metrics(y, p_prev)} | v1.3.1-xgb {_metrics(y, p_new)}")
    for k in ("rmse", "mae", "acc_pm05"):
        print(f"[mesure] gain {k} vs v1.3.0-xgb : {vs_prev[k]}")
    print(f"[mesure] Wilcoxon : {vs_prev['wilcoxon_abs_error']} | lignes mieux/moins bien : "
          f"{vs_prev['test_rows_better']}/{vs_prev['test_rows_worse']}")
    print(f"[mesure] vs regle simple : gain {m['lift_rmse']:+.4f} IC95 {m['lift_rmse_ci95']} "
          f"significatif={m['lift_significant_95']}")
    if args.dry_run:
        print("(dry-run : rien n'est ecrit)")
        return 0

    register_model(VERSION, artifact_path=CANDIDATE, metadata_path=CANDIDATE_META, corpus_path=CORPUS)
    registry = ModelRegistry(MODELS / "model_registry.json", MODELS)
    entry = registry.get(VERSION)
    entry.lift_significant_95 = vs_prev["rmse"]["significant"]
    entry.lift_rmse_ci95 = vs_prev["rmse"]["ci95"]
    entry.dataset_path = CORPUS.relative_to(BASE).as_posix()
    entry.dataset_rows = int(split["n_train"] + split["n_test"])
    entry.baseline_name = m["baseline_name"]
    entry.baseline_rmse = float(m["baseline_rmse"])
    entry.baseline_lift_rmse = float(m["lift_rmse"])
    entry.baseline_lift_ci95 = list(m["lift_rmse_ci95"])
    entry.baseline_lift_significant_95 = bool(m["lift_significant_95"])
    registry.register(entry)
    if registry.declare_override(VERSION, ACTOR, JUSTIFICATION) is None:
        print("[REFUS] declaration d'exception impossible")
        return 1
    promoted = registry.approve(VERSION, actor=ACTOR)
    if promoted is None:
        print("[REFUS] promotion refusee")
        return 1

    override = served_under_override(meta["decision"], promoted)
    if override:
        meta["served_under_override"] = override
        CANDIDATE_META.write_text(json.dumps(meta, indent=2, ensure_ascii=False), encoding="utf-8")
    # Le garde 4.3 résout le schéma par version : même contenu que v1.3.0 (même corpus).
    shutil.copy2(MODELS / "feature_schema_v130-xgb.json", MODELS / "feature_schema_v131-xgb.json")
    shutil.copy2(CANDIDATE, SERVED)
    shutil.copy2(str(CANDIDATE) + ".sha256", str(SERVED) + ".sha256")
    shutil.copy2(CANDIDATE_META, SERVED_META)
    if _sha256(SERVED) != promoted.artifact_sha256:
        print("[ERREUR] artefact servi different du registre apres copie")
        return 1
    active = registry.active()
    print(f"[registre] ACTIVE = {active.model_version} ({active.status}/{active.approval_status})")

    REPORT.write_text(json.dumps({
        "decision": "PROMOTE_ACTIVE_UNDER_DECLARED_OVERRIDE",
        "decided_at": datetime.now(timezone.utc).isoformat(),
        "actor": ACTOR,
        "justification": JUSTIFICATION,
        "corpus": {"path": entry.dataset_path, "rows": entry.dataset_rows,
                   "n_train": int(split["n_train"]), "n_test": int(split["n_test"])},
        "hyperparameters_source": "reports/model_improvement_reel.json (validation croisee temporelle, train seul)",
        "metrics_previous": {k: round(v, 4) for k, v in _metrics(y, p_prev).items()},
        "metrics_new": {k: round(v, 4) for k, v in _metrics(y, p_new).items()},
        "r2": {"previous": json.loads(PREVIOUS_META.read_text(encoding="utf-8"))["metrics"]["test_r2"],
               "new": m["test_r2"]},
        "vs_previous_v130_xgb": vs_prev,
        "vs_simple_rule": {"rule_rmse": m["baseline_rmse"], "gain_rmse": m["lift_rmse"],
                           "ci95": m["lift_rmse_ci95"], "significant": m["lift_significant_95"]},
        "artifact_sha256": promoted.artifact_sha256,
        "rollback": "registre : approve('v1.3.0-xgb') ; recopier gap_predictor_temporal_v130-xgb.joblib(.sha256) "
                    "et temporal_training_metadata_v130-xgb.json sous les noms servis",
    }, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[OK] {REPORT.relative_to(BASE)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
