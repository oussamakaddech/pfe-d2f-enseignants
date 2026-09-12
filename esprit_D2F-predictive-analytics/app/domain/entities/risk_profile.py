from dataclasses import dataclass, field
from datetime import datetime

from app.domain.value_objects.enums import RiskLevel

RISK_LEVEL_LABELS = {
    "LOW": "FAIBLE",
    "MEDIUM": "MODERE",
    "HIGH": "ELEVE",
    "CRITICAL": "CRITIQUE",
}


@dataclass(frozen=True)
class RiskFactor:
    """Facteur explicable du score de risque.

    - ``value`` : valeur brute de la métrique (ex : 12 gaps critiques).
    - ``normalized_value`` : valeur normalisée dans [0, 1] (bornée par un cap
      documenté, ex : min(1, 12 / 2) = 1.0).
    - ``weight`` : poids du facteur dans [0, 1] (somme des poids > 1 possible :
      le score final est plafonné à 1.0 et le dépassement est exposé via
      ``RiskProfile.is_capped``).
    - ``contribution`` : contribution au score = normalized_value * weight,
      toujours dans [0, 1].
    - ``scope`` : périmètre des gaps comptés (``TEACHER`` ou ``DEPARTMENT``).
    - ``scope_type`` : type du scope (``TEACHER`` / ``DEPARTMENT`` / ``UP``).
    - ``scope_id`` : identifiant du scope (ex : ``ENS024``, ``DEP_RESEAUX``).
    - ``scope_label`` : libellé affichable du scope (ex : ``Département Réseaux``).
    """

    feature: str
    value: float
    normalized_value: float
    weight: float
    contribution: float
    label: str = ""
    scope: str = ""
    scope_type: str = ""
    scope_id: str | None = None
    scope_label: str | None = None

    def to_dict(self) -> dict:
        return {
            "feature": self.feature,
            "code": self.feature,
            "label": self.label,
            "raw_value": round(self.value, 4),
            "normalized_value": round(self.normalized_value, 4),
            "weight": round(self.weight, 4),
            "contribution": round(self.contribution, 4),
            "contribution_percent": round(self.contribution * 100.0, 2),
            "scope": self.scope,
            "scope_type": self.scope_type,
            "scope_id": self.scope_id,
            "scope_label": self.scope_label,
        }


@dataclass(frozen=True)
class RiskProfile:
    teacher_id: str
    risk_score: float
    risk_level: RiskLevel
    factors: tuple[RiskFactor, ...] = field(default_factory=tuple)
    computed_at: datetime = field(default_factory=datetime.utcnow)
    is_capped: bool = False
    uncapped_score: float | None = None

    @property
    def score_01(self) -> float:
        """Score normalisé dans [0, 1] = somme des contributions, plafonnée à 1.0."""
        uncapped = self.uncapped_score if self.uncapped_score is not None else sum(f.contribution for f in self.factors)
        return round(min(1.0, max(0.0, uncapped)), 4)

    @property
    def uncapped(self) -> float:
        if self.uncapped_score is not None:
            return round(max(0.0, self.uncapped_score), 4)
        return round(sum(f.contribution for f in self.factors), 4)

    def to_dict(
        self,
        model_mode: str,
        model_version: str | None = None,
        model_name: str | None = None,
        model_algorithm: str | None = None,
    ) -> dict:
        payload: dict = {
            "teacher_id": self.teacher_id,
            "score": self.score_01,
            "score_percent": round(self.score_01 * 100.0, 2),
            "level": self.risk_level.value,
            "level_label": RISK_LEVEL_LABELS.get(self.risk_level.value, self.risk_level.value),
            "is_capped": self.is_capped,
            "uncapped_score": self.uncapped,
            "factors": [f.to_dict() for f in self.factors],
            "computed_at": self.computed_at.isoformat() + "Z",
            # Champs de compatibilité (0..100) conservés pour les consommateurs existants.
            "risk_score": round(self.risk_score, 2),
            "risk_level": self.risk_level.value,
        }
        # Le contrat expose systématiquement mode / artefact / algorithme /
        # version : le frontend affiche « ML actif · PRODUCTION_ML » puis
        # « gap_predictor_temporal · v1.0.0 » sans recomposer les chaînes.
        meta: dict = {
            "model_mode": model_mode,
            "model_version": model_version,
            "model_name": model_name,
            "model_algorithm": model_algorithm,
        }
        return {"data": payload, "meta": meta, "errors": []}
