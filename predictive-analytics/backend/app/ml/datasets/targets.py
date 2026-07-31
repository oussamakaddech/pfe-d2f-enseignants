"""Définitions des cibles ML autorisées.

Règle scientifique: jamais de modèle ML pour prédire un gap directement
calculable. Les cibles ci-dessous sont les seules autorisées et concernent des
événements réellement futurs par rapport aux features.
"""

from __future__ import annotations


class TargetDefinition:
    def __init__(
        self,
        name: str,
        kind: str,
        description: str,
        event_column: str,
        label_column: str,
        horizon_days: int,
    ) -> None:
        self.name = name
        self.kind = kind  # classification | regression
        self.description = description
        self.event_column = event_column  # date de l'événement (split temporel)
        self.label_column = label_column
        self.horizon_days = horizon_days


TARGET_DEFINITIONS: dict[str, TargetDefinition] = {
    "completion_probability": TargetDefinition(
        name="completion_probability",
        kind="classification",
        description="1 si l'enseignant termine effectivement la formation, 0 sinon.",
        event_column="enrolled_at",
        label_column="completed",
        horizon_days=0,
    ),
    "training_effectiveness_score": TargetDefinition(
        name="training_effectiveness_score",
        kind="regression",
        description="Amélioration observée du niveau (0..1) après la formation.",
        event_column="completion_date",
        label_column="effectiveness_score",
        horizon_days=0,
    ),
    "stagnation_risk_future": TargetDefinition(
        name="stagnation_risk_future",
        kind="classification",
        description="1 si aucun progrès observé dans la fenêtre future malgré gaps actifs.",
        event_column="as_of",
        label_column="stagnation",
        horizon_days=180,
    ),
    "future_need_probability": TargetDefinition(
        name="future_need_probability",
        kind="classification",
        description="1 si un besoin de formation est exprimé/approuvé dans les prochains mois.",
        event_column="as_of",
        label_column="future_need",
        horizon_days=90,
    ),
}
