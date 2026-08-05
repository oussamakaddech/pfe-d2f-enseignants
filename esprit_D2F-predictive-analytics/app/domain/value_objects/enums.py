from enum import Enum


class Level(Enum):
    N1_DEBUTANT = "N1_DEBUTANT"
    N2_ELEMENTAIRE = "N2_ELEMENTAIRE"
    N3_INTERMEDIAIRE = "N3_INTERMEDIAIRE"
    N4_AVANCE = "N4_AVANCE"
    N5_EXPERT = "N5_EXPERT"

    def to_int(self) -> int:
        return self._index() + 1

    @classmethod
    def from_int(cls, value: int) -> "Level":
        value = max(1, min(5, int(value)))
        return list(cls)[value - 1]

    def _index(self) -> int:
        return list(Level).index(self)


LEVEL_INT_MAP = {
    "N1_DEBUTANT": 1,
    "N2_ELEMENTAIRE": 2,
    "N3_INTERMEDIAIRE": 3,
    "N4_AVANCE": 4,
    "N5_EXPERT": 5,
    # Alias legacy (NiveauMaitrise historique) : mêmes valeurs que parseNiveau()
    # de l'ancien service-analyse (esprit_D2F-analyse). Une grande partie des
    # lignes de competence.enseignant_competences utilise encore cet encodage.
    "DEBUTANT": 1,
    "INITIE": 2,
    "CONFIRME": 3,
    "AVANCE": 4,
    "EXPERT": 5,
    "NIVEAU_1": 1,
    "NIVEAU_2": 2,
    "NIVEAU_3": 3,
    "NIVEAU_4": 4,
    "NIVEAU_5": 5,
    "1": 1,
    "2": 2,
    "3": 3,
    "4": 4,
    "5": 5,
}

DEFAULT_TARGET_LEVEL = 3


def level_to_int(value: str | None) -> int:
    if not value:
        return 0
    return LEVEL_INT_MAP.get(value.upper(), 0)


class Severity(Enum):
    LOW = "FAIBLE"
    MEDIUM = "MOYENNE"
    HIGH = "HAUTE"
    CRITICAL = "CRITIQUE"

    def api_value(self) -> str:
        return self.value


class Trend(Enum):
    IMPROVING = "IMPROVING"
    STABLE = "STABLE"
    DECLINING = "DECLINING"


class RiskLevel(Enum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ModelMode(Enum):
    ML = "ML"
    HEURISTIC_FALLBACK = "HEURISTIC_FALLBACK"
