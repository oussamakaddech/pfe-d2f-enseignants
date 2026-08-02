from dataclasses import dataclass


@dataclass(frozen=True)
class Savoir:
    id: int
    code: str
    nom: str
    required_level: int


@dataclass(frozen=True)
class Competency:
    id: int
    code: str
    nom: str
    domaine_id: int | None
    domaine_nom: str | None
    savoirs: tuple[Savoir, ...] = ()

    @property
    def target_level(self) -> int:
        required = [s.required_level for s in self.savoirs if s.required_level > 0]
        return max(required) if required else 3

    def savoir_ids(self) -> set[int]:
        return {s.id for s in self.savoirs}
