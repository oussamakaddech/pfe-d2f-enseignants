from dataclasses import dataclass


@dataclass(frozen=True)
class Recommendation:
    teacher_id: str
    formation_id: int
    titre: str
    competence_id: int | None
    rank_score: float
    reason: str
    matched_savoirs: tuple[str, ...]

    def to_dict(self) -> dict:
        return {
            "formation_id": self.formation_id,
            "titre": self.titre,
            "competence_id": self.competence_id,
            "rank_score": round(self.rank_score, 4),
            "reason": self.reason,
            "matched_savoirs": list(self.matched_savoirs),
        }
