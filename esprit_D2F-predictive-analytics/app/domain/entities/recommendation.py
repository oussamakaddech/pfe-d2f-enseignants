from dataclasses import dataclass

# Statuts de justification d'une recommandation (audit d'autorité 2026-09-22,
# §3.3) : 90 % des recommandations ne citaient AUCUN savoir manquant réel et
# rien dans la réponse ne le signalait. Une recommandation sans justification
# doit le DIRE, jamais rester silencieusement non justifiée.
JUSTIFICATION_JUSTIFIEE = "JUSTIFIEE"
JUSTIFICATION_INDISPONIBLE = "INDISPONIBLE_REFERENTIEL"
JUSTIFICATION_SANS_COUVERTURE = "AUCUN_SAVOIR_MANQUANT_COUVERT"

_JUSTIFICATION_LABELS = {
    JUSTIFICATION_JUSTIFIEE: "Justifiée par des savoirs manquants réellement couverts",
    JUSTIFICATION_INDISPONIBLE: (
        "Justification indisponible : aucun savoir du référentiel n'est rattaché à cette "
        "formation (lien formation↔savoir absent)"
    ),
    JUSTIFICATION_SANS_COUVERTURE: (
        "Justification indisponible : la formation est rattachée à des savoirs, mais aucun "
        "n'est manquant pour cet enseignant (classement par domaine cible)"
    ),
}


@dataclass(frozen=True)
class Recommendation:
    teacher_id: str
    formation_id: int
    titre: str
    competence_id: int | None
    rank_score: float
    reason: str
    matched_savoirs: tuple[str, ...]
    # Justification explicite : jamais laissée implicite (voir constantes ci-dessus).
    justification_status: str = JUSTIFICATION_INDISPONIBLE
    justification_label: str = _JUSTIFICATION_LABELS[JUSTIFICATION_INDISPONIBLE]

    def to_dict(self) -> dict:
        return {
            "formation_id": self.formation_id,
            "titre": self.titre,
            "competence_id": self.competence_id,
            "rank_score": round(self.rank_score, 4),
            "reason": self.reason,
            "matched_savoirs": list(self.matched_savoirs),
            "justification_status": self.justification_status,
            "justification_label": self.justification_label,
            "justified": self.justification_status == JUSTIFICATION_JUSTIFIEE,
        }
