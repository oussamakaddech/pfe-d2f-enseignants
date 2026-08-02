from dataclasses import dataclass
from datetime import date


@dataclass(frozen=True)
class Teacher:
    id: str
    nom: str
    prenom: str
    mail: str
    up_id: str | None
    dept_id: str | None
    user_id: str | None
    date_recrutement: date | None
    specialite: str | None = None
    grade: str | None = None
    up_libelle: str | None = None
    dept_libelle: str | None = None

    @property
    def full_name(self) -> str:
        return f"{self.prenom} {self.nom}".strip()

    @property
    def tenure_years(self) -> float | None:
        if self.date_recrutement is None:
            return None
        return (date.today() - self.date_recrutement).days / 365.25
