from sqlalchemy import text

from app.core.logging import get_logger
from app.domain.entities.recommendation import Recommendation
from app.domain.entities.risk_profile import RiskProfile
from app.domain.entities.skill_gap import SkillGap
from app.domain.value_objects.enums import Trend

logger = get_logger("analyse_repository")

# NOTE : "analyse" est un mot reserve PostgreSQL -> on l'echappe entre guillemets
INSERT_GAPS = """
    INSERT INTO "analyse".skill_gaps
        (enseignant_id, competence_id, competence_code, competence_nom, niveau_actuel,
         niveau_requis, niveau_vise, gap_score, impact_score, urgence_score, priorite_score,
         niveau_urgence, mois_stagnation, en_regression, nb_besoins_exprimes, tendance, computed_at)
    VALUES
        (:enseignant_id, :competence_id, :competence_code, :competence_nom, :niveau_actuel,
         :niveau_requis, :niveau_vise, :gap_score, :impact_score, :urgence_score, :priorite_score,
         :niveau_urgence, :mois_stagnation, :en_regression, :nb_besoins_exprimes, :tendance, now())
"""

INSERT_RISK = """
    INSERT INTO "analyse".teacher_risk_snapshots
        (enseignant_id, snapshot_date, score_risque, niveau_risque, tendance, computed_at)
    VALUES
        (:enseignant_id, CURRENT_DATE, :score_risque, :niveau_risque, 'STABLE', now())
"""

INSERT_RECOMMENDATION = """
    INSERT INTO "analyse".recommendations
        (enseignant_id, competence_id, formation_id, formation_titre, score_pertinence,
         score_taux_reussite, score_disponibilite, score_global, probabilite_reussite,
         rang_dans_parcours, est_prerequis, prerequis_satisfaits, justification, statut, created_at)
    VALUES
        (:enseignant_id, :competence_id, :formation_id, :formation_titre, :score_global,
         :score_global, :score_global, :score_global, 0.5,
         1, false, true, :raison, 'SUGGESTED', now())
"""

SELECT_GAPS_BY_TEACHER = """
    SELECT competence_id, competence_code, competence_nom, niveau_actuel,
           niveau_requis, gap_score, niveau_urgence,
           COALESCE(tendance, 'STABLE') AS tendance,
           computed_at::date AS computed_at
    FROM "analyse".skill_gaps
    WHERE enseignant_id = :id
    ORDER BY gap_score DESC, competence_id
"""


class SqlAnalysisRepository:
    def __init__(self, database) -> None:
        self._database = database

    def save_skill_gaps(self, gaps: list[SkillGap], teacher_id: str | None = None) -> None:
        tid = gaps[0].teacher_id if gaps else teacher_id
        if not tid:
            return
        try:
            with self._database.session() as session:
                # Remplace l'état précédent : chaque appel remplace le snapshot
                # (évite l'empilement de doublons lors de analyses répétées).
                session.execute(
                    text('DELETE FROM "analyse".skill_gaps WHERE enseignant_id = :eid'),
                    {"eid": tid},
                )
                for gap in gaps:
                    session.execute(
                        text(INSERT_GAPS),
                        {
                            "enseignant_id": gap.teacher_id,
                            "competence_id": gap.competence_id,
                            "competence_code": gap.competence_code,
                            "competence_nom": gap.competence_nom,
                            "niveau_actuel": int(gap.observed_result),
                            "niveau_requis": int(gap.knowledge_difficulty_level),
                            "niveau_vise": int(gap.knowledge_difficulty_level),
                            "gap_score": gap.gap_score,
                            # Les colonnes suivantes sont NOT NULL sans default en base.
                            # On fournit des valeurs derivees coherentes (impact=urgence=priorite=gap).
                            "impact_score": gap.gap_score,
                            "urgence_score": gap.gap_score,
                            "priorite_score": gap.gap_score,
                            "niveau_urgence": gap.severity.api_value(),
                            "mois_stagnation": 0,
                            "en_regression": False,
                            "nb_besoins_exprimes": 0,
                            # Trace l'origine du calcul (ML vs heuristique) :
                            # DECLARED_ML/WORSENING => ML, sinon heuristique.
                            "tendance": gap.trend.value,
                        },
                    )
        except Exception as exc:
            logger.error("persistance gaps impossible", error=str(exc))

    def list_gaps_by_teacher(self, teacher_id: str) -> list[SkillGap]:
        from app.domain.value_objects.enums import Severity

        rows = []
        try:
            from sqlalchemy import text as _text
            with self._database.read_connection() as session:
                rows = session.execute(_text(SELECT_GAPS_BY_TEACHER), {"id": teacher_id}).mappings().all()
        except Exception as exc:
            logger.error("lecture gaps impossible", error=str(exc))
            return []
        return [
            SkillGap(
                teacher_id=teacher_id,
                competence_id=row["competence_id"],
                competence_code=row["competence_code"],
                competence_nom=row["competence_nom"],
                observed_result=row["niveau_actuel"],
                knowledge_difficulty_level=row["niveau_requis"],
                gap_score=float(row["gap_score"]),
                severity=Severity(row["niveau_urgence"].upper()),
                trend=Trend(str(row["tendance"]).upper()),
                as_of=row["computed_at"],
            )
            for row in rows
        ]

    def save_risk_snapshot(self, profile: RiskProfile) -> None:
        try:
            with self._database.session() as session:
                session.execute(
                    text(INSERT_RISK),
                    {
                        "enseignant_id": profile.teacher_id,
                        # score_risque est calcule sur 100 (0-100) ; la colonne est NUMERIC(5,4)
                        # (max 9.9999) -> on normalise en 0-1.
                        "score_risque": round(profile.risk_score / 100.0, 4),
                        "niveau_risque": profile.risk_level.value,
                    },
                )
        except Exception as exc:
            logger.error("persistance snapshot risque impossible", error=str(exc))

    def save_recommendations(self, recommendations: list[Recommendation]) -> None:
        if not recommendations:
            return
        try:
            with self._database.session() as session:
                # Remplace l'état précédent pour éviter les doublons successifs.
                teacher_id = recommendations[0].teacher_id
                session.execute(
                    text('DELETE FROM "analyse".recommendations WHERE enseignant_id = :eid'),
                    {"eid": teacher_id},
                )
                for recommendation in recommendations:
                    session.execute(
                        text(INSERT_RECOMMENDATION),
                        {
                            "enseignant_id": recommendation.teacher_id,
                            "competence_id": recommendation.competence_id,
                            "formation_id": recommendation.formation_id,
                            "formation_titre": recommendation.titre,
                            "score_global": round(recommendation.rank_score, 4),
                            "raison": recommendation.reason,
                        },
                    )
        except Exception as exc:
            logger.error("persistance recommandations impossible", error=str(exc))
