package esprit.pfe.serviceevaluation.repositories;

import esprit.pfe.serviceevaluation.entities.LearningAssessment;
import esprit.pfe.serviceevaluation.entities.LearningAssessmentType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;
import java.util.Optional;

public interface LearningAssessmentRepository extends JpaRepository<LearningAssessment, Long> {
    Optional<LearningAssessment> findByParticipantIdAndTrainingIdAndType(
            String participantId, Long trainingId, LearningAssessmentType type);

    /** Dernière tentative (numéro le plus élevé) pour un couple participant/formation/type. */
    Optional<LearningAssessment> findFirstByParticipantIdAndTrainingIdAndTypeOrderByAttemptNumberDesc(
            String participantId, Long trainingId, LearningAssessmentType type);

    List<LearningAssessment> findByTrainingId(Long trainingId);

    List<LearningAssessment> findByParticipantId(String participantId);

    List<LearningAssessment> findByTrainingIdAndType(Long trainingId, LearningAssessmentType type);

    /** Évaluations rattachées à une compétence (mesure de l'évolution par compétence). */
    List<LearningAssessment> findByTrainingIdAndCompetenceIdIsNotNull(Long trainingId);

    List<LearningAssessment> findByCompetenceId(Long competenceId);

    // ===== Task 5: Learning Indicators =====
    List<LearningAssessment> findByTrainingIdAndParticipantId(Long trainingId, String participantId);
}