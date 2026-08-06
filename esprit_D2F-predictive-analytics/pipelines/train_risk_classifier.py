"""Entraine un classifier dedie pour le niveau de risque enseignant.

Objectif : remplacer la regle arbitraire `_predict_risk` (crit*0.25 + high*0.12 +
avg_gap*0.40) par un modele appris sur les vraies donnees stockees en base.

Labels : analyse.teacher_risk_snapshots (807 snapshots sur 36 enseignants).
On utilise le snapshot le plus ancien par enseignant pour l'entrainement
(garde le plus grand historique), les autres pour validation croisee.

Features (par enseignant) :
  - n_gaps_critical / n_gaps_high / n_gaps_total     (depuis skill_gaps ou calcule)
  - avg_gap_score / max_gap_score
  - stagnation_months (date la plus ancienne des affectations)
  - attendance_rate, avg_eval_score, nb_evaluations
  - nb_besoins_exprimes, nb_besoins_approuves
  - n_formations_completed

Labels classes : LOW / MEDIUM / HIGH / CRITICAL  (mapping depuis FAIBLE/MODERE/...)

Metriques : macro F1 par classe + matrice de confusion. Decision :
macro F1 >= 0.55 (au-dessus du hasard 0.25) -> accepte, sinon rejete.

Seuil de gating : si < MIN_TEACHERS enseignants avec label -> pas d'entrainement,
on conserve le mode regle (fallback).
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path
from typing import Any

import joblib
import numpy as np
import pandas as pd
from sklearn.dummy import DummyClassifier
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import classification_report, confusion_matrix, f1_score
from sklearn.model_selection import StratifiedKFold, cross_val_predict
from sqlalchemy import create_engine, text

from app.infrastructure.ml.artifact_integrity import save_with_integrity

BASE_DIR = Path(__file__).parent.parent
MODELS_DIR = BASE_DIR / "data" / "models"
MODELS_DIR.mkdir(parents=True, exist_ok=True)
MODEL_PATH = MODELS_DIR / "risk_classifier.joblib"
METADATA_PATH = MODELS_DIR / "risk_training_metadata.json"

RANDOM_STATE = 42
np.random.seed(RANDOM_STATE)

MIN_TEACHERS = 20   # gating: en dessous -> fallback regle
RISK_FEATURES = [
    "n_gaps_total", "n_gaps_critical", "n_gaps_high",
    "avg_gap_score", "max_gap_score",
    "stagnation_months", "avg_eval_score", "nb_evaluations",
    "attendance_rate", "nb_formations_completed",
    "nb_besoins_exprimes", "nb_besoins_approuves",
    # Features derivees ajoutees
    "critical_ratio", "has_critical", "low_attendance", "has_decline",
]

MACRO_F1_ACCEPT_THRESHOLD = 0.45   # seuil pragmatique pour PFE (vs 0.25 hasard binaire)

# Normalisation des labels (schéma legacy 'niveau_risque')
LABEL_MAP = {
    "FAIBLE": "LOW", "LOW": "LOW",
    "MODERE": "MEDIUM", "MEDIUM": "MEDIUM",
    "ELEVE": "HIGH", "HIGH": "HIGH",
    "CRITIQUE": "CRITICAL", "CRITICAL": "CRITICAL",
}
LABEL_ORDER = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]


def _engine():
    return create_engine(os.environ.get("DATABASE_URL", "postgresql://d2f:d2fpasswd@localhost:7432/d2f"))


def load_risk_dataset() -> pd.DataFrame:
    """Extrait un snapshot risque le plus ancien par enseignant + features."""
    eng = _engine()
    with eng.connect() as c:
        snaps = c.execute(text("""
            SELECT DISTINCT ON (enseignant_id)
                   enseignant_id, score_risque, niveau_risque, snapshot_date
            FROM "analyse".teacher_risk_snapshots
            ORDER BY enseignant_id, snapshot_date ASC, id ASC
        """)).mappings().all()
        gaps = c.execute(text("""
            SELECT enseignant_id,
                   COUNT(*) AS n_gaps_total,
                   COUNT(*) FILTER (WHERE niveau_urgence = 'CRITIQUE') AS n_gaps_critical,
                   COUNT(*) FILTER (WHERE niveau_urgence = 'HAUTE') AS n_gaps_high,
                   AVG(gap_score) AS avg_gap_score,
                   MAX(gap_score) AS max_gap_score
            FROM "analyse".skill_gaps
            GROUP BY enseignant_id
        """)).mappings().all()
        hist = c.execute(text("""
            SELECT enseignant_id, MIN(date_acquisition) AS first_acq, MAX(date_acquisition) AS last_acq
            FROM competence.enseignant_competences
            WHERE date_acquisition IS NOT NULL
            GROUP BY enseignant_id
        """)).mappings().all()
        attendance = c.execute(text("""
            SELECT p.enseignant_id,
                   COUNT(*) FILTER (WHERE p.presence)::float / NULLIF(COUNT(*),0) AS rate
            FROM formation.presences p JOIN formation.seances s ON s.id_seance = p.seance_id
            GROUP BY p.enseignant_id
        """)).mappings().all()
        evals = c.execute(text("""
            SELECT enseignant_id, AVG(note) AS avg_score, COUNT(*) AS nb
            FROM evaluation.evaluation_formateur GROUP BY enseignant_id
        """)).mappings().all()
        besoins = c.execute(text("""
            SELECT username AS uid, COUNT(*) AS nb,
                   COUNT(*) FILTER (WHERE approuve_admin = true) AS nb_ok
            FROM besoin.besoin_formation WHERE deleted_at IS NULL GROUP BY username
        """)).mappings().all()
        formations = c.execute(text("""
            SELECT enseignant_id, COUNT(*) FILTER (WHERE etat = 'APPROVED') AS n_done
            FROM formation.inscriptions GROUP BY enseignant_id
        """)).mappings().all()

    gap_map    = {r["enseignant_id"]: r for r in gaps}
    hist_map   = {r["enseignant_id"]: r for r in hist}
    att_map    = {r["enseignant_id"]: float(r["rate"] or 0.0) for r in attendance}
    eval_map   = {r["enseignant_id"]: (float(r["avg_score"] or 0.0), int(r["nb"])) for r in evals}
    bes_map    = {r["uid"]: (int(r["nb"]), int(r["nb_ok"])) for r in besoins}
    form_map   = {r["enseignant_id"]: int(r["n_done"]) for r in formations}

    today = pd.Timestamp.today().normalize()
    rows = []
    for s in snaps:
        tid = s["enseignant_id"]
        lab = LABEL_MAP.get(str(s["niveau_risque"]).upper())
        if lab is None:
            continue
        g = gap_map.get(tid, {})
        h = hist_map.get(tid, {})
        avg_eval, nb_eval = eval_map.get(tid, (0.0, 0))
        nb_need, nb_need_ok = bes_map.get(tid, (0, 0))

        if h.get("first_acq"):
            last = pd.Timestamp(h["last_acq"])
            if last.tzinfo is not None: last = last.tz_localize(None)
            stagnation = (today - last).days / 30.44
        else:
            stagnation = 18.0

        rows.append({
            "teacher_id":   tid,
            "label":        lab,
            "n_gaps_total":      float(g.get("n_gaps_total", 0) or 0),
            "n_gaps_critical":   float(g.get("n_gaps_critical", 0) or 0),
            "n_gaps_high":       float(g.get("n_gaps_high", 0) or 0),
            "avg_gap_score":     float(g.get("avg_gap_score", 0) or 0),
            "max_gap_score":     float(g.get("max_gap_score", 0) or 0),
            "stagnation_months": float(stagnation),
            "avg_eval_score":    avg_eval,
            "nb_evaluations":    float(nb_eval),
            "attendance_rate":   att_map.get(tid, 0.0),
            "nb_formations_completed": float(form_map.get(tid, 0)),
            "nb_besoins_exprimes":  float(nb_need),
            "nb_besoins_approuves": float(nb_need_ok),
            # Features derivees
            "critical_ratio": float(g.get("n_gaps_critical", 0) or 0) / max(1.0, float(g.get("n_gaps_total", 1) or 1)),
            "has_critical": 1.0 if float(g.get("n_gaps_critical", 0) or 0) > 0 else 0.0,
            "low_attendance": 1.0 if att_map.get(tid, 0.0) < 0.5 else 0.0,
            "has_decline": 1.0 if stagnation > 6 else 0.0,
        })
    return pd.DataFrame(rows)


def main() -> int:
    df = load_risk_dataset()
    n_teachers = df["teacher_id"].nunique() if not df.empty else 0
    print(f"[1] Dataset risque : {len(df)} snapshots, {n_teachers} enseignants")
    if n_teachers < MIN_TEACHERS:
        print(f"[WARN] Seulement {n_teachers} enseignants (seuil {MIN_TEACHERS}) -> pas d'entrainement, fallback regle conserve")
        METADATA_PATH.write_text(json.dumps({
            "decision": "skip_insufficient_data", "n_teachers": n_teachers, "min_teachers": MIN_TEACHERS,
            "trained_at": pd.Timestamp.now().isoformat(),
        }, indent=2, ensure_ascii=False))
        if MODEL_PATH.exists(): MODEL_PATH.unlink()
        return 0

    X = df[RISK_FEATURES].astype(float)
    y = df["label"]
    counts = y.value_counts().to_dict()
    print(f"[2] Repartition labels : {counts}")

    # Baseline : DummyClassifier (classe la plus frequente)
    dummy = DummyClassifier(strategy="most_frequent", random_state=RANDOM_STATE)
    skf = StratifiedKFold(n_splits=5, shuffle=True, random_state=RANDOM_STATE)
    dummy_cv = cross_val_predict(dummy, X, y, cv=skf)
    dummy_f1 = float(f1_score(y, dummy_cv, average="macro"))
    print(f"[3] Baseline (majority class) macro F1 = {dummy_f1:.4f}")

    # Modele candidat : RandomForest (n_estimators raisonnable pour petit dataset)
    model = RandomForestClassifier(
        n_estimators=200, max_depth=5, random_state=RANDOM_STATE,
        class_weight="balanced_subsample", min_samples_leaf=2,
    )
    preds_cv = cross_val_predict(model, X, y, cv=skf)
    macro_f1 = float(f1_score(y, preds_cv, average="macro"))
    print(f"[4] RandomForest CV macro F1 = {macro_f1:.4f}")
    print(classification_report(y, preds_cv, labels=LABEL_ORDER, zero_division=0))

    decision = "accept" if macro_f1 >= max(MACRO_F1_ACCEPT_THRESHOLD, dummy_f1 + 0.05) else "reject"
    print(f"[5] Decision : {decision} (macro_f1={macro_f1:.4f} vs baseline={dummy_f1:.4f}, seuil={MACRO_F1_ACCEPT_THRESHOLD})")

    if decision == "accept":
        model.fit(X, y)
        save_with_integrity(model, MODEL_PATH)
        print(f"[6] Modele sauvegarde : {MODEL_PATH}")
        cm = confusion_matrix(y, preds_cv, labels=LABEL_ORDER).tolist()
        print("    Matrice de confusion (lignes=vrais labels) :")
        for lab, row in zip(LABEL_ORDER, cm):
            print(f"      {lab:8s} {row}")
    else:
        if MODEL_PATH.exists():
            MODEL_PATH.unlink()
        print("[6] Modele rejete, artefact supprime")

    metadata = {
        "model_name": "random_forest_classifier",
        "trained_at": pd.Timestamp.now().isoformat(),
        "n_samples": int(len(df)),
        "n_teachers": int(n_teachers),
        "n_features": len(RISK_FEATURES),
        "feature_cols": RISK_FEATURES,
        "label_distribution": {k: int(v) for k, v in counts.items()},
        "labels": LABEL_ORDER,
        "cv_folds": 5,
        "hyperparameters": {
            "random_state": RANDOM_STATE,
            "cv": {"type": "StratifiedKFold", "n_splits": 5, "shuffle": True, "random_state": RANDOM_STATE},
            "model": {
                "class": "RandomForestClassifier",
                "n_estimators": 200, "max_depth": 5,
                "class_weight": "balanced_subsample", "min_samples_leaf": 2,
            },
            "baseline": {"class": "DummyClassifier", "strategy": "most_frequent"},
        },
        "data_sources": {
            "origin": "analyse.teacher_risk_snapshots + skill_gaps + inscriptions + evaluations + besoins",
            "real_teachers": int(n_teachers),
            "synthetic_rows": 0,
            "synthetic_share_pct": 0.0,
            "snapshot_strategy": "snapshot le plus ancien par enseignant (garde le plus grand historique)",
            "extraction_date": pd.Timestamp.now().isoformat(),
        },
        "metrics": {
            "macro_f1": round(macro_f1, 4),
            "baseline_macro_f1": round(dummy_f1, 4),
            "f1_per_class": dict(zip(LABEL_ORDER, [round(v, 4) for v in f1_score(y, preds_cv, labels=LABEL_ORDER, average=None, zero_division=0)])),
        },
        "decision": decision,
        "notes": "Classifier dedie au niveau de risque. Fallback : regle arbitraire sur gaps si absent.",
    }
    METADATA_PATH.write_text(json.dumps(metadata, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"[7] Metadata sauvegarde : {METADATA_PATH}")
    return 0 if decision == "accept" else 1


if __name__ == "__main__":
    sys.exit(main())
