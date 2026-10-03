from typing import Callable

from app.application.ports import AlertRepository
from app.core.config import Settings
from app.core.logging import get_logger
from app.domain.entities.alert import Alert
from app.domain.entities.risk_profile import RiskProfile
from app.domain.entities.skill_gap import SkillGap
from app.domain.entities.teacher import Teacher
from app.domain.services.alert_prioritizer import sort_by_priority

logger = get_logger("generate_alerts")

ALERT_SEVERITY_KEYS = {"CRITIQUE": "GAP_CRITIQUE", "HAUTE": "GAP_CRITIQUE", "MOYENNE": "STAGNATION"}


class GenerateAlerts:
    # Injecte : source des enseignants, fournisseurs de gaps et de risque,
    # dépôt d'alertes et configuration (seuil de risque élevé).
    def __init__(
        self,
        teacher_source,
        gaps_provider: Callable[[str], list[SkillGap]],
        risk_provider: Callable[[str], RiskProfile | None],
        alert_repository: AlertRepository,
        settings: Settings,
    ) -> None:
        self._teacher_source = teacher_source
        self._gaps_provider = gaps_provider
        self._risk_provider = risk_provider
        self._alert_repository = alert_repository
        self._settings = settings

    # Génère les alertes d'un enseignant : 1 alerte par gap CRITIQUE/HAUTE
    # + 1 alerte REGRESSION si son score de risque dépasse le seuil haut.
    def generate_for_teacher(self, teacher_id: str, teacher: Teacher | None = None) -> list[Alert]:
        teacher = teacher or self._teacher_source.get_teacher(teacher_id)
        alerts: list[Alert] = []
        if teacher is None:
            return alerts

        gaps = self._gaps_provider(teacher_id)
        for gap in gaps:
            if gap.severity.api_value() in {"CRITIQUE", "HAUTE"}:
                alerts.append(
                    Alert(
                        alert_type=ALERT_SEVERITY_KEYS.get(gap.severity.api_value(), "GAP_CRITIQUE"),
                        target_type="ENSEIGNANT",
                        severity="CRITIQUE" if gap.severity.api_value() == "CRITIQUE" else "WARNING",
                        title=f"Écart critique sur {gap.competence_nom}",
                        message=f"{teacher.full_name} présente un écart de niveau sur {gap.competence_nom} (score {gap.gap_score:.2f}).",
                        teacher_id=teacher_id,
                        department_id=teacher.dept_id,
                        competence_id=gap.competence_id,
                        details={"gap_score": round(gap.gap_score, 4)},
                    )
                )

        profile = self._risk_provider(teacher_id)
        if profile is not None and profile.risk_score >= self._settings.risk_threshold_high:
            alerts.append(
                Alert(
                    alert_type="REGRESSION",
                    target_type="ENSEIGNANT",
                    severity="CRITIQUE",
                    title="Profil à risque élevé",
                    message=f"{teacher.full_name} présente un score de risque de {profile.risk_score:.1f}/100.",
                    teacher_id=teacher_id,
                    department_id=teacher.dept_id,
                    details={"risk_score": round(profile.risk_score, 2)},
                )
            )
        return alerts

    # Génère les alertes de TOUS les enseignants puis les trie par priorité
    # (sévérité × portée) — les plus urgentes en premier.
    def generate_all(self) -> list[Alert]:
        alerts: list[Alert] = []
        for teacher in self._teacher_source.list_teachers():
            alerts.extend(self.generate_for_teacher(teacher.id, teacher))
        return sort_by_priority(alerts)

    # Génère puis sauvegarde toutes les alertes en base ; renvoie les alertes persistées.
    def persist_all(self) -> list[Alert]:
        saved: list[Alert] = []
        for alert in self.generate_all():
            saved.append(self._alert_repository.save(alert))
        logger.info("alertes generees", count=len(saved))
        return saved
