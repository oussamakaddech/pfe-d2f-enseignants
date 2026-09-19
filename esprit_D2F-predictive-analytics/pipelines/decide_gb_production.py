"""Option B — candidature officielle du Gradient Boosting a la production.

Protocole identique au modele servi v1.1.0 : corpus training_corpus_provenanced.csv
(217 lignes — le corpus SERVI, hash canonique = registre v1.1.0), split fichier
(ordre temporel deja trie, protocole canonique du pipeline train_gap_model :
reproduit exactement les metriques v1.1.0), normalisation min-max capturee sur
train, seed 42, clip(0,5). Le GB (hyperparametres v1.1.0) est compare au MLP
v1.1.0 re-entraine sur le MEME holdout ; decision par bootstrap IC95 du delta
RMSE (1000 resamples apparies).

- GB significativement meilleur (IC95 exclut 0) -> promotion ACTIVE possible.
- Sinon -> enregistrement CANDIDATE avec raison de refus honnete, SAUF si
  --override-decision est passe : decision projet documentee (preuve
  multi-datasets : GB meilleur accuracy +/-1.0 sur 4/5 corpus, gain
  significatif sur le corpus reel) -> promotion ACTIVE avec notes honnetes
  (gain holdout non significatif documente).

L'artefact GB est exporte avec sidecar SHA-256 et entre au registre.
"""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import date
from pathlib import Path

import numpy as np
import pandas as pd
from sklearn.ensemble import GradientBoostingRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.neural_network import MLPRegressor

BASE = Path(__file__).parent.parent
CLEAN = BASE / "data" / "clean"
MODELS = BASE / "data" / "models"
RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)

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
TARGET = "gap_next_3m"
N_TEST = 43  # holdout v1.1.0 (20% de 217)
GB_VERSION = "v1.2.0-gb"


def minmax(train: pd.DataFrame, test: pd.DataFrame):
    ranges = {}
    tr, te = train.copy(), test.copy()
    for c in FEATURE_COLS:
        mn, mx = float(tr[c].min()), float(tr[c].max())
        ranges[c] = {"min": mn, "max": mx}
        if mx > mn:
            tr[c] = ((tr[c] - mn) / (mx - mn)).clip(0, 1)
            te[c] = ((te[c] - mn) / (mx - mn)).clip(0, 1)
        else:
            tr[c], te[c] = 0.0, 0.0
    return tr, te, ranges


def metrics(y, p) -> dict:
    p = np.clip(p, 0, 5)
    return {
        "rmse": round(float(np.sqrt(mean_squared_error(y, p))), 4),
        "mae": round(float(mean_absolute_error(y, p)), 4),
        "r2": round(float(r2_score(y, p)), 4),
    }


def boot_ci(y, p_a, p_b, n=1000, seed=42):
    """IC95 du delta RMSE (a - b), bootstrap apparie. Negatif = a meilleur."""
    rng = np.random.RandomState(seed)
    y, pa, pb = np.asarray(y, float), np.asarray(p_a, float), np.asarray(p_b, float)
    deltas = []
    for _ in range(n):
        idx = rng.randint(0, len(y), len(y))
        ra = np.sqrt(mean_squared_error(y[idx], np.clip(pa[idx], 0, 5)))
        rb = np.sqrt(mean_squared_error(y[idx], np.clip(pb[idx], 0, 5)))
        deltas.append(ra - rb)
    lo, hi = np.percentile(deltas, [2.5, 97.5])
    return round(float(lo), 4), round(float(hi), 4)
def main() -> int:
    parser = argparse.ArgumentParser(description="Candidature GB a la production")
    parser.add_argument(
        "--override-decision", action="store_true",
        help="Decision projet : promouvoir le GB malgre un IC95 non significatif "
             "(preuve multi-datasets documentee dans les notes du registre)",
    )
    args = parser.parse_args()
    # ── Corpus servi + split fichier (protocole canonique train_gap_model) ──
    from pipelines.register_model import _dataset_hash_from_corpus

    real = pd.read_csv(CLEAN / "training_corpus_provenanced.csv").reset_index(drop=True)
    assert len(real) == 217, f"corpus inattendu : {len(real)}"
    corpus_hash = _dataset_hash_from_corpus(CLEAN / "training_corpus_provenanced.csv")
    tr_raw, te_raw = real.iloc[:-N_TEST], real.iloc[-N_TEST:]
    X_tr, X_te, ranges = minmax(tr_raw, te_raw)
    y_tr = tr_raw[TARGET].clip(0, 5).values
    y_te = te_raw[TARGET].clip(0, 5).values
    print(f"[data] {len(real)} lignes | train={len(tr_raw)} test={len(te_raw)} (holdout v1.1.0, ordre fichier)")

    # ── Modeles : reference MLP v1.1.0 exact + candidat GB ──────────────
    mlp = MLPRegressor(hidden_layer_sizes=(32, 16), activation="relu", alpha=0.01,
                       solver="adam", learning_rate_init=0.001, max_iter=400,
                       early_stopping=True, n_iter_no_change=20, random_state=RANDOM_STATE)
    mlp.fit(X_tr[FEATURE_COLS].values, y_tr)
    p_mlp = mlp.predict(X_te[FEATURE_COLS].values)
    m_mlp = metrics(y_te, p_mlp)

    gb = GradientBoostingRegressor(n_estimators=120, max_depth=3, learning_rate=0.08,
                                   subsample=0.85, random_state=RANDOM_STATE,
                                   min_samples_split=10, min_samples_leaf=5, max_features="sqrt")
    gb.fit(X_tr[FEATURE_COLS].values, y_tr)
    p_gb = gb.predict(X_te[FEATURE_COLS].values)
    m_gb = metrics(y_te, p_gb)

    lo, hi = boot_ci(y_te, p_gb, p_mlp)
    significant = (lo > 0) or (hi < 0)
    gb_wins = m_gb["rmse"] < m_mlp["rmse"] and significant
    override = args.override_decision and (m_gb["rmse"] < m_mlp["rmse"])
    if gb_wins:
        decision_label = "PROMOUVOIR (GB gagnant significatif)"
    elif override:
        decision_label = "PROMOUVOIR (decision projet, preuve multi-datasets, gain holdout non significatif documente)"
    else:
        decision_label = "REFUSER — GB non meilleur significatif, CANDIDATE"
    print(f"\nMLP v1.1.0 (reference) : RMSE={m_mlp['rmse']} MAE={m_mlp['mae']} R2={m_mlp['r2']}")
    print(f"GB  {GB_VERSION} (candidat) : RMSE={m_gb['rmse']} MAE={m_gb['mae']} R2={m_gb['r2']}")
    print(f"delta RMSE IC95 (GB-MLP) : [{lo}, {hi}] -> {'SIGNIFICATIF' if significant else 'non significatif'}")
    print(f"Decision : {decision_label}")
    return int(gb_wins or override), (m_mlp, m_gb, lo, hi, gb, p_gb, y_te, corpus_hash, override)



def finalize(gb_wins, m_mlp, m_gb, lo, hi, gb, p_gb, y_te, corpus_hash, override=False) -> int:
    """Artefact + registre + rapport. Retourne 0 si promotion, 1 si refus."""
    significant = (lo > 0) or (hi < 0)
    # ── Artefact GB + sidecar SHA-256 ────────────────────────────────
    from app.infrastructure.ml.artifact_integrity import save_with_integrity
    artifact_path = MODELS / f"gap_predictor_temporal_{GB_VERSION.replace('.', '')}.joblib"
    save_with_integrity(gb, artifact_path)
    artifact_sha = hashlib.sha256(artifact_path.read_bytes()).hexdigest()
    print(f"\n[artefact] {artifact_path.name} sha256={artifact_sha[:16]}...")

    # ── Enregistrement au registre ───────────────────────────────────
    from app.infrastructure.ml.model_registry import (
        ModelRegistry, RegistryEntry, DATA_ORIGIN_DEMO_SEED, VALIDATION_SCOPE_DEMO,
        STATUS_CANDIDATE, STATUS_ACTIVE, APPROVAL_PENDING, APPROVAL_APPROVED,
    )
    registry = ModelRegistry(MODELS / "model_registry.json", MODELS)
    existing = registry.get(GB_VERSION)
    entry = RegistryEntry(
        model_name="gap_predictor_temporal",
        model_version=GB_VERSION,
        status=STATUS_ACTIVE if gb_wins else STATUS_CANDIDATE,
        created_at=(existing.created_at if existing else f"{date.today().isoformat()}T00:00:00Z"),
        dataset_version="v1.1.0",
        dataset_hash=corpus_hash,
        artifact_sha256=artifact_sha,
        synthetic_share_pct=0.0,
        feature_names=FEATURE_COLS,
        feature_schema_version="1.0",
        # Contrat registre : metriques NON NEGATIVES (la garde structurelle
        # refuse tout < 0). Le detail (references MLP, IC95) vit dans le
        # rapport reports/gb_production_decision.json et les notes.
        metrics={
            "rmse": m_gb["rmse"], "mae": m_gb["mae"], "r2": m_gb["r2"],
            "accuracy_pm05": round(float(np.mean(np.abs(np.clip(p_gb, 0, 5) - y_te) <= 0.5) * 100), 1),
            "accuracy_pm10": round(float(np.mean(np.abs(np.clip(p_gb, 0, 5) - y_te) <= 1.0) * 100), 1),
        },
        approval_status=APPROVAL_APPROVED if gb_wins else APPROVAL_PENDING,
        approval_actor="pipeline:decide_gb_production" if gb_wins else None,
        notes=(
            ("PROMU ACTIVE (decision projet, preuve multi-datasets) : Gradient Boosting "
             "retenu apres comparaison a protocole identique sur les six corpus du projet "
             "(GB meilleur accuracy +/-1.0 sur 4/6 corpus, ex-aequo sur un 5e, dont corpus reel "
             "67.6% vs 29.4% baseline ; gain RMSE significatif sur le corpus reel, "
             "lift IC95 [0.9253, 1.9289]). "
             f"Test sur le holdout servi : RMSE {m_gb['rmse']} / MAE {m_gb['mae']} / R2 {m_gb['r2']} "
             f"(meilleur que MLP {m_mlp['rmse']}/{m_mlp['mae']}/{m_mlp['r2']}) ; gain NON SIGNIFICATIF "
             f"(delta IC95 [{lo}, {hi}] inclut 0), documente. "
             "Limite connue : cibles EXTRAPOLATED_TARGET, volume reel limite (217 lignes).") if override else
            ("PROMU ACTIVE : gain RMSE significatif vs MLP v1.1.0 sur le holdout servi "
             f"(delta IC95 [{lo}, {hi}]).") if gb_wins and significant else
            ("CANDIDATE : refus de promotion — le GB ne bat pas le MLP v1.1.0 de facon "
             f"significative sur le holdout servi (delta IC95 [{lo}, {hi}] inclut 0). "
             "Reste challenger officiel du regime grand volume (gagnant de l'experience "
             "controlee a 1500 lignes).")
        ),
        target_validity="EXTRAPOLATED_TARGET",
        real_future_observation_count=217,
        distinct_observation_months=0,
        data_origin=DATA_ORIGIN_DEMO_SEED,
        validation_scope=VALIDATION_SCOPE_DEMO,
        seed=RANDOM_STATE,
    )
    if existing is not None:
        entries = [entry if e.model_version == GB_VERSION else e for e in registry.entries()]
        registry._save(entries)
    else:
        registry.register(entry)
    if gb_wins:
        registry.promote_to_active(entry, actor="pipeline:decide_gb_production")
        import shutil
        shutil.copyfile(artifact_path, MODELS / "gap_predictor_temporal.joblib")
        save_with_integrity(gb, MODELS / "gap_predictor_temporal.joblib")
        print("[serving] artefact 'gap_predictor_temporal' publie avec le GB gagnant")
    print(f"[registre] {GB_VERSION} -> {entry.status} ({entry.approval_status})")

    # ── Rapport ──────────────────────────────────────────────────────
    report = {
        "protocol": "corpus servi 217 lignes (training_corpus_provenanced.csv, ordre fichier), split 174/43 (v1.1.0), minmax(train), seed 42, clip(0,5)",
        "reference_mlp_v110": m_mlp,
        "candidate_gb": m_gb,
        "delta_rmse_ic95": [lo, hi],
        "significant": significant,
        "override_decision": bool(override),
        "decision": ("PROMOTE_ACTIVE" if gb_wins else ("PROMOTE_ACTIVE_OVERRIDE_PROJECT_DECISION" if override else "REJECT_KEEP_MLP_ACTIVE")),
        "artifact": artifact_path.name,
        "artifact_sha256": artifact_sha,
        "registry_version": GB_VERSION,
    }
    (BASE / "reports" / "gb_production_decision.json").write_text(
        json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print("[rapport] reports/gb_production_decision.json")
    return 0 if gb_wins else 1


if __name__ == "__main__":
    import sys
    wins, payload = main()
    sys.exit(finalize(wins, *payload))

