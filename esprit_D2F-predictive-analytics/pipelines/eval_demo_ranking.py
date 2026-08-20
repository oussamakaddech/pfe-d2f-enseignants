"""Évaluation du RANKING sur le dataset synthétique démo.

La formule de scoring est l'heuristique du projet :
    score = 0,70*contenu + 0,20*qualité + 0,10*fraîcheur
(réutilisée via app.domain.services.ranking_service et ses constantes).

Les labels de pertinence sont SYNTHÉTIQUES (générés dans le générateur) :
    relevance_labels_origin = SYNTHETIC

Métriques : precision@1, precision@3, precision@5, recall@3, ndcg@3, map@3.

Sortie : reports/demo_ranking_report.json
"""
from __future__ import annotations

import json
from pathlib import Path

import numpy as np
import pandas as pd

from app.domain.services.ranking_service import (
    WEIGHT_CONTENT,
    WEIGHT_QUALITY,
    WEIGHT_RECENCY,
)

BASE_DIR = Path(__file__).parent.parent
SYNTH_DIR = BASE_DIR / "data" / "synthetic"
REPORTS_DIR = BASE_DIR / "reports"


def _ndcg(rel: np.ndarray, k: int) -> float:
    rel = rel[:k]
    if len(rel) == 0:
        return 0.0
    ideal = np.sort(rel)[::-1][:k]
    dcg = sum(r / np.log2(i + 2) for i, r in enumerate(rel))
    idcg = sum(r / np.log2(i + 2) for i, r in enumerate(ideal))
    return float(dcg / idcg) if idcg > 0 else 0.0


def _ap(rel: np.ndarray) -> float:
    if rel.sum() == 0:
        return 0.0
    precisions = []
    n_rel = 0
    for i, r in enumerate(rel):
        if r:
            n_rel += 1
            precisions.append(n_rel / (i + 1))
    return float(np.mean(precisions))


def run_ranking_pipeline(
    dataset_path: Path | None = None,
    output_path: Path | None = None,
) -> dict:
    """Évalue le ranking sur des labels de pertinence synthétiques."""
    path = dataset_path or (SYNTH_DIR / "demo_dataset_synthetic-v1.0.0_clean.csv")
    if not path.exists():
        raise FileNotFoundError(f"Dataset propre introuvable : {path}")
    df = pd.read_csv(path)

    # Candidates "formations" synthétiques par compétence
    rng = np.random.default_rng(2026)
    comp_ids = sorted(df["competence_id"].unique())
    candidates: dict[int, list[dict]] = {}
    for c in comp_ids:
        n_cand = 8
        cands = []
        for i in range(n_cand):
            cands.append({
                "formation_id": f"FOR-SYN-{c}-{i}",
                "competence_id": c,
                "content_score": round(float(np.clip(rng.beta(2.0, 3.0) + 0.15 * (i == 0), 0.0, 1.0)), 3),
                "quality_score": round(float(np.clip(rng.beta(4.0, 1.5), 0.0, 1.0)), 3),
                "recency_score": round(float(np.clip(rng.beta(3.0, 2.0), 0.0, 1.0)), 3),
            })
        candidates[c] = cands

    queries: list[dict] = []
    sample = df.sample(n=60, random_state=42)  # 60 requêtes (teacher × competence)
    for _, r in sample.iterrows():
        c = int(r["competence_id"])
        # Label de pertinence synthétique : 1 si la formation couvre la compétence
        # et que le gap courant est élevé, 0 sinon.
        gap_now = float(r["required_level"]) - float(r["current_level_t"])
        high_gap = gap_now >= 1.0
        rel = {}
        for cand in candidates[c]:
            rel[cand["formation_id"]] = int(
                (cand["content_score"] >= 0.30 and high_gap) or (cand["content_score"] >= 0.55)
            )
        queries.append({
            "teacher_id": str(r["teacher_id"]),
            "competence_id": c,
            "relevance": rel,
            "high_gap": high_gap,
        })

    # -------- Scoring heuristique 0.70/0.20/0.10 --------
    prec1, prec3, prec5, rec3, ndcg3, ap3 = [], [], [], [], [], []
    for q in queries:
        c = q["competence_id"]
        cands = sorted(
            candidates[c],
            key=lambda x: WEIGHT_CONTENT * x["content_score"]
            + WEIGHT_QUALITY * x["quality_score"]
            + WEIGHT_RECENCY * x["recency_score"],
            reverse=True,
        )
        order = [cd["formation_id"] for cd in cands]
        rel = np.array([q["relevance"].get(fid, 0) for fid in order])
        prec1.append(rel[0])
        prec3.append(rel[:3].mean())
        prec5.append(rel[:5].mean())
        rec3.append(rel[:3].sum() / max(1, rel.sum()))
        ndcg3.append(_ndcg(rel, 3))
        ap3.append(_ap(rel[:3]))

    results = {
        "relevance_labels_origin": "SYNTHETIC",
        "note": "Labels de pertinence générés de façon synthétique (couverture de "
                "compétence + gap courant). Aucune donnée réelle. Métriques = démonstration technique.",
        "formula": {"content_weight": WEIGHT_CONTENT, "quality_weight": WEIGHT_QUALITY, "recency_weight": WEIGHT_RECENCY},
        "n_queries": len(queries),
        "n_candidates_per_query": 8,
        "metrics": {
            "precision_at_1": round(float(np.mean(prec1)), 4),
            "precision_at_3": round(float(np.mean(prec3)), 4),
            "precision_at_5": round(float(np.mean(prec5)), 4),
            "recall_at_3": round(float(np.mean(rec3)), 4),
            "ndcg_at_3": round(float(np.mean(ndcg3)), 4),
            "map_at_3": round(float(np.mean(ap3)), 4),
        },
        "warning": "Résultats de démonstration sur labels synthétiques uniquement.",
    }

    out = output_path or (REPORTS_DIR / "demo_ranking_report.json")
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(json.dumps(results, indent=2, ensure_ascii=False), encoding="utf-8")
    return results


def main() -> int:
    results = run_ranking_pipeline()
    m = results["metrics"]
    print(f"[OK] RANKING (labels SYNTHETIC, {results['n_queries']} requêtes)")
    print(f"    P@1={m['precision_at_1']} P@3={m['precision_at_3']} P@5={m['precision_at_5']} "
          f"R@3={m['recall_at_3']} NDCG@3={m['ndcg_at_3']} MAP@3={m['map_at_3']}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())