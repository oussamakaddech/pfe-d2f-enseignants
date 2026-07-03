"""A/B Testing Framework pour les recommandations de formation.

Permet de comparer dynamiquement différentes stratégies de recommandation :
- Stratégie A : MSAS hybride (nouvel algorithme)
- Stratégie B : Collaborative Filtering pur
- Stratégie C : Risk-based uniquement
- Stratégie D : Baseline heuristique

Mesure l'efficacité via :
- Taux d'acceptation des recommandations
- Taux de complétion des formations recommandées
- Note moyenne des formations suivies
- Temps moyen avant inscription

Référence : Kohavi et al., "Trustworthy Online Controlled Experiments"
(Cambridge University Press, 2020) — principes d'A/B testing appliqués
au domaine éducatif.
"""

from __future__ import annotations

import hashlib
import logging
import time
from datetime import datetime, timedelta
from typing import Any

from sqlalchemy import Column, DateTime, Float, Integer, String, Text, func
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import Session

from app.db import Base

logger = logging.getLogger(__name__)


class ABTestAssignment(Base):
    """Table des assignations A/B — un enseignant est assigné à une variante."""
    __tablename__ = "ab_test_assignments"

    id = Column(Integer, primary_key=True, autoincrement=True)
    teacher_id = Column(String(100), nullable=False, index=True)
    experiment_name = Column(String(200), nullable=False, index=True)
    variant = Column(String(50), nullable=False)  # "control", "treatment_a", etc.
    assigned_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ABTestEvent(Base):
    """Table des événements d'A/B — chaque interaction recommandation."""
    __tablename__ = "ab_test_events"

    id = Column(Integer, primary_key=True, autoincrement=True)
    teacher_id = Column(String(100), nullable=False, index=True)
    experiment_name = Column(String(200), nullable=False, index=True)
    variant = Column(String(50), nullable=False)
    event_type = Column(String(50), nullable=False)  # shown, accepted, completed, etc.
    formation_id = Column(Integer, nullable=True)
    value = Column(Float, default=1.0)
    metadata_json = Column("metadata", JSONB, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)


class ABTestResult(Base):
    """Table des résultats agrégés d'un A/B test."""
    __tablename__ = "ab_test_results"

    id = Column(Integer, primary_key=True, autoincrement=True)
    experiment_name = Column(String(200), nullable=False, index=True)
    variant = Column(String(50), nullable=False)
    sample_size = Column(Integer, default=0)
    acceptance_rate = Column(Float, default=0.0)
    completion_rate = Column(Float, default=0.0)
    avg_score = Column(Float, default=0.0)
    avg_days_to_enroll = Column(Float, default=0.0)
    computed_at = Column(DateTime, default=datetime.utcnow)


def _deterministic_assignment(teacher_id: str, experiment: str) -> str:
    """Assignation déterministe basée sur le hash SHA-256.
    
    Garantit qu'un même enseignant obtient toujours la même variante
    pour un même experiment, sans stockage en base pour l'assignation.
    """
    h = hashlib.sha256(f"{teacher_id}:{experiment}".encode()).hexdigest()
    bucket = int(h[:8], 16) % 100

    if bucket < 25:
        return "control"       # 25% — baseline heuristique
    elif bucket < 50:
        return "treatment_a"   # 25% — MSAS hybride
    elif bucket < 75:
        return "treatment_b"   # 25% — Collaborative pur
    else:
        return "treatment_c"   # 25% — Risk-based pur


def get_variant(
    db: Session,
    teacher_id: str,
    experiment_name: str,
) -> str:
    """Retourne la variante assignée à un enseignant pour un experiment.

    Si l'assignation existe déjà en base, la retourne.
    Sinon, crée une nouvelle assignation déterministe.
    """
    existing = (
        db.query(ABTestAssignment)
        .filter(
            ABTestAssignment.teacher_id == teacher_id,
            ABTestAssignment.experiment_name == experiment_name,
        )
        .first()
    )
    if existing:
        return existing.variant

    variant = _deterministic_assignment(teacher_id, experiment_name)
    assignment = ABTestAssignment(
        teacher_id=teacher_id,
        experiment_name=experiment_name,
        variant=variant,
    )
    db.add(assignment)
    db.commit()
    logger.info("AB test '%s': teacher=%s → variant=%s", experiment_name, teacher_id, variant)
    return variant


def record_event(
    db: Session,
    teacher_id: str,
    experiment_name: str,
    variant: str,
    event_type: str,
    formation_id: int | None = None,
    value: float = 1.0,
    metadata_json: dict | None = None,
) -> None:
    """Enregistre un événement d'A/B test (shown, accepted, completed, etc.)."""
    event = ABTestEvent(
        teacher_id=teacher_id,
        experiment_name=experiment_name,
        variant=variant,
        event_type=event_type,
        formation_id=formation_id,
        value=value,
        metadata_json=metadata_json,
    )
    db.add(event)
    db.commit()


def compute_results(
    db: Session,
    experiment_name: str,
) -> list[dict[str, Any]]:
    """Calcule les métriques agrégées pour chaque variante d'un experiment.

    Métriques :
    - sample_size : nombre d'enseignants assignés
    - acceptance_rate : taux d'acceptation (accepted / shown)
    - completion_rate : taux de complétion (completed / accepted)
    - avg_score : note moyenne des formations suivies
    - avg_days_to_enroll : délai moyen avant inscription (jours)
    """
    variants = (
        db.query(ABTestAssignment.variant)
        .filter(ABTestAssignment.experiment_name == experiment_name)
        .distinct()
        .all()
    )
    variants = [v[0] for v in variants]

    results = []
    for variant in variants:
        # Sample size
        sample = (
            db.query(func.count(ABTestAssignment.id))
            .filter(
                ABTestAssignment.experiment_name == experiment_name,
                ABTestAssignment.variant == variant,
            )
            .scalar()
        )

        # Shown events
        shown = (
            db.query(func.count(ABTestEvent.id))
            .filter(
                ABTestEvent.experiment_name == experiment_name,
                ABTestEvent.variant == variant,
                ABTestEvent.event_type == "shown",
            )
            .scalar()
        )

        # Accepted events
        accepted = (
            db.query(func.count(ABTestEvent.id))
            .filter(
                ABTestEvent.experiment_name == experiment_name,
                ABTestEvent.variant == variant,
                ABTestEvent.event_type == "accepted",
            )
            .scalar()
        )

        # Completed events
        completed = (
            db.query(func.count(ABTestEvent.id))
            .filter(
                ABTestEvent.experiment_name == experiment_name,
                ABTestEvent.variant == variant,
                ABTestEvent.event_type == "completed",
            )
            .scalar()
        )

        # Average score
        avg_score_result = (
            db.query(func.avg(ABTestEvent.value))
            .filter(
                ABTestEvent.experiment_name == experiment_name,
                ABTestEvent.variant == variant,
                ABTestEvent.event_type == "scored",
            )
            .scalar()
        )

        # Average days to enroll
        avg_days_result = (
            db.query(func.avg(ABTestEvent.value))
            .filter(
                ABTestEvent.experiment_name == experiment_name,
                ABTestEvent.variant == variant,
                ABTestEvent.event_type == "days_to_enroll",
            )
            .scalar()
        )

        results.append({
            "variant": variant,
            "sample_size": sample or 0,
            "shown": shown or 0,
            "accepted": accepted or 0,
            "completed": completed or 0,
            "acceptance_rate": round((accepted or 0) / max(shown or 1, 1), 4),
            "completion_rate": round((completed or 0) / max(accepted or 1, 1), 4),
            "avg_score": round(float(avg_score_result or 0.0), 4),
            "avg_days_to_enroll": round(float(avg_days_result or 0.0), 2),
        })

    return results


def get_winner(results: list[dict[str, Any]]) -> dict[str, Any] | None:
    """Détermine la variante gagnante basée sur un score composite.

    Score composite = 0.5 × acceptance_rate + 0.3 × completion_rate + 0.2 × avg_score

    Returns:
        dict avec 'variant', 'composite_score', 'margin' vs baseline
    """
    if not results:
        return None

    scored = []
    for r in results:
        composite = (
            0.5 * r["acceptance_rate"] +
            0.3 * r["completion_rate"] +
            0.2 * r["avg_score"]
        )
        scored.append({"variant": r["variant"], "composite_score": round(composite, 4)})

    scored.sort(key=lambda x: x["composite_score"], reverse=True)
    winner = scored[0]

    baseline = next((s for s in scored if s["variant"] == "control"), None)
    margin = (
        winner["composite_score"] - baseline["composite_score"]
        if baseline else 0.0
    )
    winner["margin_vs_baseline"] = round(margin, 4)

    return winner
