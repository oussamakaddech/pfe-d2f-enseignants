"""Endpoints supplementaires pour AnalyticsDashboardPage (coherence KPIs).

Ce module ajoute les endpoints /heatmap, /top-formations, /plan-actions,
/stats au router d2f_master. Il est importe dans d2f_master.py via monkey-patching
du router.

Note : chaque endpoint est enregistre directement sur le router d2f_master
pour eviter d'avoir a modifier le fichier principal qui est deja volumineux.
"""

from typing import Any

import pandas as pd
from fastapi import Query
from datetime import datetime

from app.routers.d2f_master import load_master_data, router


@router.get("/heatmap", summary="Heatmap des ecarts (competence x departement)")
async def get_heatmap() -> dict[str, Any]:
    """Cartographie des ecarts pour AnalyticsDashboardPage."""
    data = load_master_data()
    comp = data["competencies"]
    teachers = data["teachers"]

    if comp.empty or teachers.empty:
        return {"cells": [], "n_competences": 0, "n_departements": 0}

    merged = comp.merge(
        teachers[["teacher_id", "department_code", "department_nom"]],
        on="teacher_id", how="left",
    )
    grouped = merged.groupby(
        ["competence_code", "competence_nom", "department_code", "department_nom"]
    ).agg(
        avg_gap=("gap_value", "mean"),
        enseignants_count=("teacher_id", "nunique"),
    ).reset_index()

    cells = []
    for _, row in grouped.iterrows():
        cells.append({
            "competence_code": str(row["competence_code"]),
            "competence_nom": str(row["competence_nom"]),
            "departement": str(row["department_code"]),
            "departement_nom": str(row["department_nom"]),
            "avg_gap": round(float(row["avg_gap"]), 2),
            "enseignants_count": int(row["enseignants_count"]),
        })

    return {
        "cells": cells,
        "n_competences": int(grouped["competence_code"].nunique()),
        "n_departements": int(grouped["department_code"].nunique()),
    }


@router.get("/top-formations", summary="Top formations recommandees")
async def get_top_formations(limit: int = Query(default=10, ge=1, le=100)) -> dict[str, Any]:
    """Top N formations triees par relevance_score (analytics dashboard)."""
    data = load_master_data()
    recs = data["recommendations"].copy()

    if recs.empty:
        return {"total": 0, "formations": []}

    # Filtrer les entrées sans teacher_id ou training_code valide
    if "teacher_id" in recs.columns:
        recs = recs[recs["teacher_id"].notna() & (recs["teacher_id"].astype(str).str.strip() != "")]
    if "training_code" in recs.columns:
        recs = recs[recs["training_code"].notna() & (recs["training_code"].astype(str).str.strip() != "")]

    if recs.empty:
        return {"total": 0, "formations": []}

    recs["relevance_score_num"] = pd.to_numeric(
        recs["relevance_score"], errors="coerce"
    ).fillna(0)
    top = recs.sort_values("relevance_score_num", ascending=False).head(limit)

    result = []
    for _, row in top.iterrows():
        result.append({
            "recommendation_id": str(row["recommendation_id"]),
            "training_code": str(row["training_code"]),
            "training_title": str(row["training_title"]),
            "target_competency_code": str(row.get("target_competency_code", "")),
            "teacher_id": str(row["teacher_id"]),
            "relevance_score": float(row["relevance_score_num"]),
            "expected_risk_reduction": float(pd.to_numeric(
                row.get("expected_risk_reduction", 0), errors="coerce"
            ) or 0),
            "explanation_fr": str(row.get("explanation_fr", "")),
            "priority": str(row.get("priority", "MODEREE")),
        })

    return {"total": len(result), "formations": result}


@router.get("/plan-actions", summary="Plan d action prioritaire")
async def get_plan_actions() -> dict[str, Any]:
    """Plan d action consolide pour AnalyticsDashboardPage."""
    data = load_master_data()
    alerts = data["alerts"]
    recs = data["recommendations"]

    statuts_ouverts = ["NOUVELLE", "LUE"]
    severites_critiques = ["CRITIQUE", "CRITICAL"]

    crit_count = 0
    stagnation_count = 0
    regression_count = 0
    if not alerts.empty and "severity" in alerts.columns and "status" in alerts.columns:
        mask_ouvert = alerts["status"].isin(statuts_ouverts)
        crit_count = int(
            alerts[alerts["severity"].isin(severites_critiques) & mask_ouvert].shape[0]
        )
        if "type" in alerts.columns:
            stagnation_count = int(
                alerts[(alerts["type"] == "STAGNATION") & mask_ouvert]["teacher_id"].nunique()
            )
            regression_count = int(
                alerts[(alerts["type"] == "REGRESSION") & mask_ouvert]["teacher_id"].nunique()
            )

    recs_haute = 0
    if not recs.empty and "priority" in recs.columns:
        recs_haute = int(recs[recs["priority"] == "HAUTE"].shape[0])

    return {
        "n_alertes_critiques": crit_count,
        "n_recommandations_haute": recs_haute,
        "traiter_alertes_critiques": crit_count,
        "couvrir_besoins_critiques": recs_haute,
        "relancer_stagnation": stagnation_count,
        "soutenir_regression": regression_count,
    }


@router.get("/stats", summary="Statistiques additionnelles")
async def get_stats() -> dict[str, Any]:
    """Statistiques additionnelles pour AnalyticsDashboardPage."""
    data = load_master_data()
    alerts = data["alerts"]
    risk = data["risk_scores"]

    en_regression = 0
    en_stagnation = 0
    alertes_critiques_ouvertes = 0
    alertes_ouvertes = 0

    if not alerts.empty:
        statuts_ouverts = ["NOUVELLE", "LUE"]
        severites_critiques = ["CRITIQUE", "CRITICAL"]

        if "status" in alerts.columns:
            mask_ouvert = alerts["status"].isin(statuts_ouverts)
            alertes_ouvertes = int(mask_ouvert.sum())

        if "type" in alerts.columns:
            if "status" in alerts.columns:
                en_regression = int(
                    alerts[(alerts["type"] == "REGRESSION") & mask_ouvert]["teacher_id"].nunique()
                )
                en_stagnation = int(
                    alerts[(alerts["type"] == "STAGNATION") & mask_ouvert]["teacher_id"].nunique()
                )
            else:
                en_regression = int(alerts[alerts["type"] == "REGRESSION"]["teacher_id"].nunique())
                en_stagnation = int(alerts[alerts["type"] == "STAGNATION"]["teacher_id"].nunique())

        if "severity" in alerts.columns and "status" in alerts.columns:
            alertes_critiques_ouvertes = int(
                alerts[
                    alerts["severity"].isin(severites_critiques) & mask_ouvert
                ].shape[0]
            )

    enseignants_couvert = 0
    if not risk.empty and "risk_level" in risk.columns:
        enseignants_couvert = int(risk[risk["risk_level"] == "FAIBLE"].shape[0])

    return {
        "en_regression": en_regression,
        "en_stagnation": en_stagnation,
        "alertes_critiques_ouvertes": alertes_critiques_ouvertes,
        "alertes_ouvertes": alertes_ouvertes,
        "enseignants_couvert": enseignants_couvert,
        "total_teachers": int(risk.shape[0]) if not risk.empty else 0,
    }


# Les fonctions sont enregistrees sur le router via les decorators @router.get
# ci-dessus. Aucun appel explicite n'est necessaire : FastAPI les a deja ajoutees.


@router.get("/risk-evolution", summary="Evolution mensuelle du risque (CSV)")
async def get_risk_evolution(months: int = Query(default=6, ge=1, le=24)) -> list[dict[str, Any]]:
    """Evolution mensuelle du risque calculee depuis les alertes CSV.

    Le endpoint DB /analytics/dashboard/risk-evolution necessite des snapshots
    historiques qui sont vides tant que le pipeline n'a pas tourne. Ce fallback
    agrège les alertes par mois pour produire une tendance utilisable.
    """
    data = load_master_data()
    alerts = data["alerts"]
    risk = data["risk_scores"]

    if alerts.empty or "created_at" not in alerts.columns:
        return []

    # Parser les dates des alertes
    alerts = alerts.copy()
    alerts["created_at"] = pd.to_datetime(alerts["created_at"], errors="coerce")
    alerts = alerts.dropna(subset=["created_at"])

    if alerts.empty:
        return []

    # Filtrer sur la fenetre demandee
    cutoff = pd.Timestamp.now() - pd.Timedelta(days=months * 31)
    alerts = alerts[alerts["created_at"] >= cutoff]

    if alerts.empty:
        return []

    # Grouper par mois
    alerts["mois"] = alerts["created_at"].dt.to_period("M").astype(str)

    # Score de risque moyen par mois (approximation via severite)
    severite_weight = {"CRITIQUE": 1.0, "CRITICAL": 1.0, "HAUTE": 0.6, "WARNING": 0.6, "MOYENNE": 0.3, "INFO": 0.1}
    alerts["sev_weight"] = alerts["severity"].map(severite_weight).fillna(0.3)

    result = []
    for mois, grp in alerts.groupby("mois"):
        n_critical = int(grp[grp["severity"].isin(["CRITIQUE", "CRITICAL"])].shape[0])
        n_high = int(grp[grp["severity"].isin(["HAUTE", "WARNING"])].shape[0])
        total = len(grp)
        score_moyen = round(float(grp["sev_weight"].mean()), 4) if total > 0 else 0
        result.append({
            "month": mois,
            "critical": n_critical,
            "high": n_high,
            "score_risque_moyen": score_moyen,
            "total_enseignants": int(grp["teacher_id"].nunique()),
        })

    return sorted(result, key=lambda x: x["month"])
