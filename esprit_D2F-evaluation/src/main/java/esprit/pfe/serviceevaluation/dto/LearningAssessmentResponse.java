package esprit.pfe.serviceevaluation.dto;

import esprit.pfe.serviceevaluation.entities.LearningAssessmentType;
import lombok.Data;

import java.time.LocalDateTime;

@Data
public class LearningAssessmentResponse {
    private Long id;
    private Long trainingId;
    private Long sessionId;
    private String participantId;
    private LearningAssessmentType type;
    private Float score;
    private Float maxScore;
    private Float percentage;
    private String levelBefore;
    private String levelAfter;
    private String evaluatedBy;
    private LocalDateTime evaluatedAt;
    private Integer attemptNumber;

    // ── Enrichissement pré/post ──
    private Long competenceId;
    private String targetLevel;
    private Float autoEvaluation;
    private String objectifsPersonnels;
    private Float practicalScore;
    private String trainerComment;
    private String competencesAcquises;
    private Boolean targetReached;
}