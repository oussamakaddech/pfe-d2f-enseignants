"""Recalcul du lift du modèle SERVI contre les baselines honnêtes.

Correctif d'audit (2026-09-22). La metadata et les notes du registre
annonçaient pour ``v1.2.0-gb`` un lift de 1,2629 « significatif », mesuré
contre ``clip(current_level_t - avg_level, 0, 5)`` — une baseline nulle sur
77 % du holdout, donc un RMSE de référence artificiellement élevé. Ce script
remesure le lift contre les baselines légitimes de ``pipelines/baselines.py``
et réécrit les chiffres, sans jamais toucher à l'artefact ni au
``dataset_hash``.

Garde-fous :
- le SHA-256 de l'artefact est vérifié contre le registre AVANT toute
  écriture — un artefact qui a bougé fait échouer le script ;
- le modèle n'est pas ré-entraîné : il est chargé et évalué tel quel ;
- les champs ``lift_significant_95``/``lift_rmse_ci95`` du registre, qui
  portent la comparaison au modèle de référence précédent (règle §2.6), ne
  sont PAS modifiés : le lift baseline vit dans ses propres champs.

Usage :
    python -m pipelines.recompute_honest_baselines [--dry-run]
"""
from __future__ import annotations

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

from app.infrastructure.ml.model_registry import ModelRegistry
from pipelines.baselines import bootstrap_lift_ci95, compute_baselines

BASE_DIR = Path(__file__).parent.parent
MODELS_DIR = BASE_DIR / "data" / "models"
CLEAN_DIR = BASE_DIR / "data" / "clean"
REPORTS_DIR = BASE_DIR / "reports"
CORPUS_PATH = CLEAN_DIR / "training_corpus_provenanced.csv"
METADATA_PATH = MODELS_DIR / "temporal_training_metadata.json"
ARTIFACT_PATH = MODELS_DIR / "gap_predictor_temporal.joblib"
REGISTRY_PATH = MODELS_DIR / "model_registry.json"
REPORT_PATH = REPORTS_DIR / "honest_baseline_recompute.json"


def _sha256(path: Path) -> str:
    h = hashlib.sha256()
    with open(path, "rb") as handle:
        for chunk in iter(lambda: handle.read(65536), b""):
            h.update(chunk)
    return h.hexdigest()


def _normalize(frame: pd.DataFrame, features: list[str], ranges: dict) -> np.ndarray:
    """Min-max capturée sur le train — protocole canonique du serving."""
    out = frame[features].astype(float).copy()
    for col in features:
        borne = ranges.get(col, {})
        mini, maxi = float(borne.get("min", 0.0)), float(borne.get("max", 0.0))
        out[col] = 0.0 if maxi == mini else ((out[col] - mini) / (maxi - mini)).clip(0, 1)
    return out.to_numpy(dtype=float)


def recompute(dry_run: bool = False) -> dict:
    metadata = json.loads(METADATA_PATH.read_text(encoding="utf-8"))
    features = metadata["feature_cols"]
    ranges = metadata["feature_ranges"]
    n_train = int(metadata["n_train"])

    registry = ModelRegistry(REGISTRY_PATH, MODELS_DIR)
    active = registry.active()
    if active is None:
        raise SystemExit("aucune entrée ACTIVE au registre : rien à recalculer")

    empreinte = _sha256(ARTIFACT_PATH)
    if empreinte != active.artifact_sha256:
        raise SystemExit(
            "SHA-256 de l'artefact servi différent du registre "
            f"({empreinte[:16]}… vs {active.artifact_sha256[:16]}…) : abandon"
        )

    corpus = pd.read_csv(CORPUS_PATH)
    train, test = corpus.iloc[:n_train], corpus.iloc[n_train:]
    y_train = train["gap_next_3m"].to_numpy(dtype=float)
    y_test = test["gap_next_3m"].to_numpy(dtype=float)

    modele = joblib.load(ARTIFACT_PATH)
    predictions = np.clip(modele.predict(_normalize(test, features, ranges)), 0.0, 5.0)

    baseline = compute_baselines(train, y_train, test, y_test)
    lift, ci95, significatif = bootstrap_lift_ci95(
        y_test, predictions, baseline["baseline_predictions"]
    )

    ancien = metadata.get("metrics", {})
    rapport = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "model_version": active.model_version,
        "artifact_sha256": empreinte,
        "corpus": str(CORPUS_PATH.relative_to(BASE_DIR)).replace("\\", "/"),
        "corpus_rows": int(len(corpus)),
        "split": {"n_train": n_train, "n_test": int(len(test))},
        "model_rmse": round(float(np.sqrt(np.mean((y_test - predictions) ** 2))), 4),
        "baselines": baseline["baselines"],
        "baseline_retenue": baseline["baseline_name"],
        "baseline_rmse": baseline["baseline_rmse"],
        "lift_rmse": lift,
        "lift_rmse_ci95": list(ci95),
        "lift_significant_95": significatif,
        "avant_correctif": ancien.get(
            "lift_legacy_persistence_proxy",
            {
                "baseline_rmse": ancien.get("baseline_rmse"),
                "lift_rmse": ancien.get("lift_rmse"),
                "lift_rmse_ci95": ancien.get("lift_rmse_ci95"),
                "baseline": "persistence_proxy (current_level_t - avg_level)",
            },
        ),
    }

    if dry_run:
        return rapport

    # --- metadata ---------------------------------------------------------
    metrics = dict(ancien)
    metrics.update(
        {
            "baseline_rmse": baseline["baseline_rmse"],
            "baseline_mae": baseline["baseline_mae"],
            "baseline_name": baseline["baseline_name"],
            "baseline_selection_rule": baseline["baseline_selection_rule"],
            "baselines": baseline["baselines"],
            "lift_rmse": lift,
            "lift_rmse_ci95": list(ci95),
            "lift_significant_95": significatif,
            "lift_ci95_method": (
                "bootstrap 1000 replicas on test sample "
                f"(n={len(y_test)}), percentile 2.5-97.5, baseline="
                f"{baseline['baseline_name']}"
            ),
        }
    )
    # Idempotence : la trace de l'ancien chiffre est écrite UNE fois. Sans ce
    # garde-fou, un second passage archiverait le lift déjà corrigé et
    # effacerait la valeur historique que l'audit doit pouvoir montrer.
    metrics.setdefault(
        "lift_legacy_persistence_proxy",
        {
            "baseline_rmse": ancien.get("baseline_rmse"),
            "lift_rmse": ancien.get("lift_rmse"),
            "lift_rmse_ci95": ancien.get("lift_rmse_ci95"),
            "note": (
                "baseline dégénérée (nulle sur 77 % du holdout) — chiffre "
                "conservé pour la traçabilité, jamais pour annoncer un gain"
            ),
        },
    )
    metadata["metrics"] = metrics
    METADATA_PATH.write_text(
        json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8"
    )

    # --- registre ---------------------------------------------------------
    entries = registry.entries()
    for entry in entries:
        if entry.model_version != active.model_version:
            continue
        entry.baseline_name = baseline["baseline_name"]
        entry.baseline_rmse = baseline["baseline_rmse"]
        entry.baseline_lift_rmse = lift
        entry.baseline_lift_ci95 = list(ci95)
        entry.baseline_lift_significant_95 = significatif
        entry.dataset_path = str(CORPUS_PATH.relative_to(BASE_DIR)).replace("\\", "/")
        entry.dataset_rows = int(len(corpus))
        entry.data_origin_reason = (
            "corpus 100 % réel (source_type=postgresql_d2f, is_synthetic=false sur "
            "217/217 lignes) mais sans attestation institutionnelle : la garde "
            "_corpus_institutionally_verified impose DEMO_SEED. L'étiquette décrit "
            "le niveau d'attestation, pas l'origine des données."
        )
        entry.notes = _corriger_notes(entry.notes, rapport)
    registry._save(entries)  # noqa: SLF001 - écriture contrôlée du registre

    REPORTS_DIR.mkdir(parents=True, exist_ok=True)
    REPORT_PATH.write_text(
        json.dumps(rapport, indent=2, ensure_ascii=False), encoding="utf-8"
    )
    return rapport


def _corriger_notes(notes: str, rapport: dict) -> str:
    """Remplace l'affirmation de lift issue de la baseline dégénérée."""
    faux = (
        "gain RMSE significatif sur le corpus reel, lift IC95 [0.9253, 1.9289])"
    )
    correction = (
        "gain RMSE mesure contre la baseline de reference "
        f"{rapport['baseline_retenue']} (RMSE {rapport['baseline_rmse']}) : "
        f"lift {rapport['lift_rmse']:+.4f}, IC95 "
        f"[{rapport['lift_rmse_ci95'][0]:+.4f}, {rapport['lift_rmse_ci95'][1]:+.4f}], "
        f"significatif={str(rapport['lift_significant_95']).lower()})"
    )
    notes = notes.replace(faux, correction)
    marqueur = "| LIFT RECALCULE"
    if marqueur in notes:
        notes = notes.split(marqueur)[0].rstrip()
    return (
        notes
        + f" {marqueur} (audit baselines, {rapport['generated_at'][:10]}) : l'ancien"
        " lift de 1.2629 etait mesure contre clip(current_level_t - avg_level, 0, 5),"
        " nulle sur 77% du holdout. Contre la baseline legitime la plus forte"
        f" ({rapport['baseline_retenue']}, RMSE {rapport['baseline_rmse']}), le lift"
        f" reel est {rapport['lift_rmse']:+.4f} (IC95"
        f" [{rapport['lift_rmse_ci95'][0]:+.4f},"
        f" {rapport['lift_rmse_ci95'][1]:+.4f}], significatif="
        f"{str(rapport['lift_significant_95']).lower()}). Artefact inchange"
        f" (SHA {rapport['artifact_sha256'][:8]}...)."
    )


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--dry-run", action="store_true", help="affiche sans rien réécrire"
    )
    args = parser.parse_args()
    rapport = recompute(dry_run=args.dry_run)
    print(json.dumps(rapport, indent=2, ensure_ascii=False))


if __name__ == "__main__":
    main()
