"""Router de compatibilité V2 — expose les routes du nouveau module
predictive-analytics (/teachers/{id}/gaps|risk|recommendations) sur l'ancien
module complet, avec le format d'enveloppe {data, meta, errors} attendu par
analyticsApi.ts (frontend).

Cela permet au frontend (AnalyticsTeacherPage / AnalysePredictive) de fonctionner
sans modification quand l'ancien module complet est déployé (qui contient déjà
les données métier en base : SkillGap, TeacherRiskProfile, Recommendation).
"""

from __future__ import annotations

import logging
from typing import Annotated, Any

from fastapi import APIRouter, Depends, HTTPException, Path, Query, Request
from sqlalchemy import text as sa_text
from sqlalchemy.orm import Session

from app.core.auth import require_roles
from app.core.db import get_db
from app.core.id_policy import validate_canonical_id
from app.models.db_models import Recommendation, SkillGap, TeacherRiskProfile
from app.services.data_service import DataService

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/v1/analytics", tags=["Analytics V2 compat"])

# Authentification en lecture (ADMIN, CUP, ENSEIGNANT pour son propre profil)
ReadAuth = Annotated[dict, Depends(require_roles("ADMIN", "CUP", "ENSEIGNANT"))]


def _envelope(data: Any, meta: dict | None = None, errors: list | None = None) -> dict[str, Any]:
    """Enveloppe standard {data, meta, errors} attendue par le frontend."""
    return {
        "data": data,
        "meta": meta or {},
        "errors": errors or [],
    }


def _resolve_teacher_name(db: Session, enseignant_id: str) -> str | None:
    """Résout le nom complet de l'enseignant depuis la table enseignants."""
    try:
        row = db.execute(
            sa_text("SELECT nom, prenom FROM enseignants WHERE id = :eid AND deleted_at IS NULL"),
            {"eid": enseignant_id},
        ).fetchone()
        if row:
            return f"{row[1]} {row[0]}".strip()
    except Exception:
        pass
    return None


# ── GET /api/v1/analytics/teachers/{teacher_id}/risk ─────────────────────────
@router.get(
    "/teachers/{teacher_id}/risk",
    summary="Profil de risque V2 (format enveloppe)",
)
async def get_risk_v2(
    teacher_id: str = Path(..., description="Identifiant enseignant ENSxxx"),
    auth: ReadAuth = None,  # type: ignore[assignment]
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Retourne le profil de risque au format V2 attendu par analyticsApi.ts.

    Mappe TeacherRiskProfile → BackendRiskProfile :
    {teacher_id, risk_score, risk_level, factors, ml_stagnation_probability, model_version}
    """
    tid = validate_canonical_id(teacher_id, path=f"/v1/analytics/teachers/{teacher_id}/risk")

    profile = db.query(TeacherRiskProfile).filter_by(enseignant_id=tid).first()
    if not profile:
        # 404 avec enveloppe pour cohérence
        raise HTTPException(
            status_code=404,
            detail=f"Profil de risque introuvable pour {tid}",
        )

    fr = profile.facteurs_risque if isinstance(profile.facteurs_risque, dict) else {}
    factors_raw = fr.get("factors", {}) or {}
    contributions = fr.get("contributions", {}) or {}
    weights = fr.get("weights", {}) or {}

    labels = {
        "no_training": "Absence de formation",
        "stagnation": "Stagnation",
        "gap_count": "Proportion de gaps critiques",
        "feedback_decline": "Régression",
        "unmet_needs": "Besoins non satisfaits",
    }
    details = {
        "no_training": "Absence prolongée de formation ou faible complétion.",
        "stagnation": "Compétences sans progression notable.",
        "gap_count": "Écart élevé vs niveau requis.",
        "feedback_decline": "Présence d'au moins un gap en régression.",
        "unmet_needs": "Besoins exprimés non couverts.",
    }

    factors = []
    for code in ("no_training", "stagnation", "gap_count", "feedback_decline", "unmet_needs"):
        factors.append({
            "code": code,
            "label": labels.get(code, code),
            "weight": round(float(weights.get(code, 0.0)), 4),
            "contribution": round(float(contributions.get(code, 0.0)), 4),
            "detail": details.get(code, ""),
        })

    risk_level = (profile.niveau_risque or "FAIBLE").upper()
    # Normaliser vers LOW/MEDIUM/HIGH/CRITICAL attendu par le frontend
    level_map = {
        "FAIBLE": "LOW",
        "MODERE": "MEDIUM",
        "MODEREE": "MEDIUM",
        "ELEVE": "HIGH",
        "HAUTE": "HIGH",
        "CRITIQUE": "CRITICAL",
    }
    risk_level_v2 = level_map.get(risk_level, "LOW")

    payload = {
        "teacher_id": tid,
        "risk_score": round(float(profile.score_risque or 0.0), 4),
        "risk_level": risk_level_v2,
        "factors": factors,
        "ml_stagnation_probability": None,
        "model_version": "rule-based-v1",
    }
    return _envelope(payload, meta={"teacher_id": tid})


# ── GET /api/v1/analytics/teachers/{teacher_id}/gaps ─────────────────────────
@router.get(
    "/teachers/{teacher_id}/gaps",
    summary="Gaps de compétences V2 (format enveloppe)",
)
async def get_gaps_v2(
    teacher_id: str = Path(..., description="Identifiant enseignant ENSxxx"),
    auth: ReadAuth = None,  # type: ignore[assignment]
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Retourne les gaps au format V2 attendu par analyticsApi.ts.

    Mappe SkillGap → BackendGapDiagnostic :
    {teacher_id, domain_id, competency_id, knowledge_id, knowledge_code,
    knowledge_name, current_level, required_level, gap_level, gap_type,
    severity, explainability, data_quality_status, detected_at}
    """
    tid = validate_canonical_id(teacher_id, path=f"/v1/analytics/teachers/{teacher_id}/gaps")

    gaps = (
        db.query(SkillGap)
        .filter(SkillGap.enseignant_id == tid)
        .order_by(SkillGap.priorite_score.desc(), SkillGap.computed_at.desc())
        .all()
    )

    severity_map = {
        "CRITIQUE": "CRITICAL",
        "HAUTE": "HIGH",
        "MODEREE": "MEDIUM",
        "MODERE": "MEDIUM",
        "FAIBLE": "LOW",
    }

    gap_diagnostics = []
    for g in gaps:
        gap_level = max(0, (g.niveau_requis or 0) - (g.niveau_actuel or 0))
        gap_diagnostics.append({
            "teacher_id": tid,
            "domain_id": g.domaine_nom or "UNKNOWN",
            "competency_id": str(g.competence_id),
            "sub_competency_id": str(g.competence_id),
            "knowledge_id": str(g.competence_id),
            "knowledge_code": g.competence_code or str(g.competence_id),
            "knowledge_name": g.competence_nom or f"Compétence {g.competence_id}",
            "knowledge_type": "COMPETENCY",
            "current_level": g.niveau_actuel,
            "required_level": g.niveau_requis,
            "gap_level": gap_level,
            "gap_type": "SKILL_GAP",
            "severity": severity_map.get((g.niveau_urgence or "FAIBLE").upper(), "LOW"),
            "evidence": [],
            "explainability": {"human_readable": g.justification or None},
            "data_quality_status": "SUFFICIENT",
            "detected_at": g.computed_at.isoformat() if g.computed_at else None,
        })

    has_records = len(gaps) > 0
    data_quality = "SUFFICIENT" if has_records else "INSUFFICIENT"
    warnings = [] if has_records else [
        f"Aucun gap trouvé pour {tid}. L'analyse n'a peut-être pas encore été lancée.",
    ]

    payload = {
        "teacher_id": tid,
        "gaps": gap_diagnostics,
        "data_quality_status": data_quality,
        "detected_at": gaps[0].computed_at.isoformat() if gaps and gaps[0].computed_at else None,
        "has_competency_records": has_records,
        "warnings": warnings,
    }
    return _envelope(payload, meta={"teacher_id": tid, "count": len(gap_diagnostics)})


# ── GET /api/v1/analytics/teachers/{teacher_id}/recommendations ──────────────
@router.get(
    "/teachers/{teacher_id}/recommendations",
    summary="Recommandations V2 (format enveloppe)",
)
async def get_recommendations_v2(
    teacher_id: str = Path(..., description="Identifiant enseignant ENSxxx"),
    limit: int = Query(default=20, ge=1, le=100),
    auth: ReadAuth = None,  # type: ignore[assignment]
    db: Session = Depends(get_db),
) -> dict[str, Any]:
    """Retourne les recommandations au format V2 attendu par analyticsApi.ts.

    Mappe Recommendation → BackendRecommendation :
    {training_id, title, recommendation_score, priority, target_gap_ids,
    target_competencies, expected_level_progression, prerequisite_status,
    estimated_duration_hours, available_from, reason_codes,
    human_readable_explanation, alternatives, data_quality_status, score_breakdown}
    """
    tid = validate_canonical_id(
        teacher_id, path=f"/v1/analytics/teachers/{teacher_id}/recommendations"
    )

    # Jointure avec SkillGap pour récupérer competence_nom (non présent sur Recommendation)
    recs = (
        db.query(Recommendation, SkillGap.competence_nom)
        .outerjoin(SkillGap, Recommendation.skill_gap_id == SkillGap.id)
        .filter(
            Recommendation.enseignant_id == tid,
            Recommendation.statut.in_(["PROPOSEE", "ACCEPTEE"]),
        )
        .order_by(Recommendation.score_global.desc())
        .limit(limit)
        .all()
    )

    recommendations = []
    for r, comp_nom in recs:
        score = float(r.score_global or 0.0)
        # Déterminer la priorité à partir du score
        if score >= 0.75:
            priority = "CRITICAL"
        elif score >= 0.50:
            priority = "HIGH"
        elif score >= 0.25:
            priority = "MEDIUM"
        else:
            priority = "LOW"

        recommendations.append({
            "training_id": str(r.formation_id),
            "title": r.formation_titre or "Formation",
            "recommendation_score": round(score, 4),
            "priority": priority,
            "target_gap_ids": [str(r.skill_gap_id)] if r.skill_gap_id else [],
            "target_competencies": [comp_nom or str(r.competence_id)] if r.competence_id else [],
            "expected_level_progression": {},
            "prerequisite_status": "MET" if getattr(r, "prerequis_satisfaits", True) else "UNMET",
            "estimated_duration_hours": 20,
            "available_from": None,
            "reason_codes": ["GAP_COVERAGE"],
            "human_readable_explanation": r.justification or "",
            "alternatives": [],
            "data_quality_status": "SUFFICIENT",
            "score_breakdown": {
                "gap_relevance": round(float(r.score_pertinence or 0.0), 4),
                "training_effectiveness": round(float(r.score_taux_reussite or 0.0), 4),
                "availability": round(float(r.score_disponibilite or 0.0), 4),
            },
        })

    payload = {
        "teacher_id": tid,
        "recommendations": recommendations,
        "excluded_trainings": [],
        "no_eligible_reason": None if recommendations else "NO_RECOMMENDATIONS",
    }
    return _envelope(
        payload,
        meta={"teacher_id": tid, "count": len(recommendations), "limit": limit},
    )