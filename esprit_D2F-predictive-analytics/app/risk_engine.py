"""
Moteur de risque unifie D2F.

Ce module implemente la formule de risque officielle, utilisee partout
dans le systeme (dashboard, alertes, recommandations, feedback loop).

FORMULE (DATASET_CONTRACT.md):
  risk = 0.40 * critical_gap_factor
       + 0.25 * coverage_factor
       + 0.20 * stagnation_factor
       + 0.15 * regression_factor

  ou:
    critical_gap_factor = min(critical_ratio * 2.5 + n_critical_alerts * 0.15, 1.0)
    coverage_factor     = 1 - min(avg_gap / 5.0, 1.0)
    stagnation_factor   = min(n_alerts * 0.5, 1.0)
    regression_factor   = min(n_stagnation_alerts * 0.2, 0.5)

SEUILS:
  CRITIQUE >= 0.75
  ELEVE    >= 0.50
  MODERE   >= 0.25
  FAIBLE   <  0.25
"""

from typing import Any

import pandas as pd


def risk_level_from_score(score: float) -> str:
    """Retourne le niveau de risque a partir du score [0,1]."""
    if score >= 0.75:
        return "CRITIQUE"
    if score >= 0.50:
        return "ELEVE"
    if score >= 0.25:
        return "MODERE"
    return "FAIBLE"


def compute_risk_for_teacher(
    teacher_id: str,
    gaps: pd.DataFrame,
    alerts: pd.DataFrame,
) -> dict[str, Any]:
    """Calcule le score de risque d'un seul enseignant.

    Args:
        teacher_id: identifiant de l'enseignant.
        gaps: DataFrame des competences (doit contenir teacher_id,
              gap_value, is_critical_gap).
        alerts: DataFrame des alertes (doit contenir teacher_id,
                severity, type).

    Returns:
        dict avec teacher_id, risk_score, risk_level, avg_gap,
        n_critical_gaps, n_active_alerts.
    """
    t_gaps = gaps[gaps["teacher_id"] == teacher_id]
    t_alerts = alerts[alerts["teacher_id"] == teacher_id]

    avg_gap = (
        float(t_gaps["gap_value"].mean())
        if not t_gaps.empty else 0.0
    )
    critical_count = int(t_gaps["is_critical_gap"].sum()) if not t_gaps.empty else 0
    critical_ratio = (
        critical_count / len(t_gaps)
        if len(t_gaps) > 0 else 0.0
    )
    n_alerts = int(
        t_alerts[t_alerts["severity"].isin(["CRITIQUE", "HAUTE"])].shape[0]
    )
    n_critical_alerts = int(
        t_alerts[t_alerts["type"] == "gap_critique"].shape[0]
    )
    n_stagnation_alerts = int(
        t_alerts[t_alerts["type"] == "stagnation"].shape[0]
    )

    critical_gap_factor = min(
        critical_ratio * 2.5 + n_critical_alerts * 0.15, 1.0
    )
    coverage_factor = 1.0 - min(avg_gap / 5.0, 1.0)
    stagnation_factor = min(n_alerts * 0.5, 1.0)
    regression_factor = min(n_stagnation_alerts * 0.2, 0.5)

    risk = (
        0.40 * critical_gap_factor
        + 0.25 * coverage_factor
        + 0.20 * stagnation_factor
        + 0.15 * regression_factor
    )
    risk = round(max(0.0, min(1.0, risk)), 4)

    return {
        "teacher_id": teacher_id,
        "risk_score": risk,
        "risk_level": risk_level_from_score(risk),
        "avg_gap": round(avg_gap, 2),
        "n_critical_gaps": critical_count,
        "n_active_alerts": n_alerts,
    }


def recompute_risk_for_all(
    gaps: pd.DataFrame, alerts: pd.DataFrame
) -> pd.DataFrame:
    """Recalcule le score de risque pour tous les enseignants.

    Renvoie un DataFrame avec les colonnes: teacher_id, risk_score,
    risk_level, avg_gap, n_critical_gaps, n_active_alerts.
    """
    teacher_ids = sorted(gaps["teacher_id"].unique())
    rows = [
        compute_risk_for_teacher(tid, gaps, alerts)
        for tid in teacher_ids
    ]
    return pd.DataFrame(rows)


def apply_training_completion(
    teacher_id: str,
    training_code: str,
    recommendations: pd.DataFrame,
    teacher_competencies: pd.DataFrame,
) -> dict[str, Any]:
    """Applique la completion d'une formation au profil de l'enseignant.

    Effets sur le profil:
      1. Identifier la recommandation correspondante (teacher_id, training_code)
         -> cible = target_competency_code.
      2. Augmenter current_level pour la competence ciblee d'un cran
         (minimum +1, plafonne a required_level).
      3. Recalculer gap_value = max(0, required - current).
      4. Recalculer is_critical_gap (gap >= 3).

    Renvoie la mutation a appliquer sur le DataFrame teacher_competencies,
    avec les anciens et nouveaux niveaux.
    """
    matching = recommendations[
        (recommendations["teacher_id"] == teacher_id)
        & (recommendations["training_code"] == training_code)
    ]
    if matching.empty:
        return {
            "applied": False,
            "reason": "no_recommendation",
            "competency_code": None,
            "old_level": None,
            "new_level": None,
            "old_gap": None,
            "new_gap": None,
        }

    target_competency = matching.iloc[0]["target_competency_code"]
    comp_rows = teacher_competencies[
        (teacher_competencies["teacher_id"] == teacher_id)
        & (teacher_competencies["competence_code"] == target_competency)
    ]
    if comp_rows.empty:
        return {
            "applied": False,
            "reason": "no_competency_row",
            "competency_code": target_competency,
        }

    idx = comp_rows.index[0]
    old_level = int(teacher_competencies.at[idx, "current_level"])
    required_level = int(teacher_competencies.at[idx, "required_level"])
    new_level = min(old_level + 1, required_level, 5)
    new_gap = max(0, required_level - new_level)
    old_gap = max(0, required_level - old_level)

    teacher_competencies.at[idx, "current_level"] = new_level
    teacher_competencies.at[idx, "gap_value"] = new_gap
    teacher_competencies.at[idx, "is_critical_gap"] = new_gap >= 3

    return {
        "applied": True,
        "competency_code": target_competency,
        "old_level": old_level,
        "new_level": new_level,
        "old_gap": old_gap,
        "new_gap": new_gap,
    }
