package esprit.pfe.serviceevaluation.dto;

import esprit.pfe.serviceevaluation.entities.LearningAssessmentType;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Positive;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class LearningAssessmentRequest {
    @NotNull private Long trainingId;
    private Long sessionId;
    @NotBlank private String participantId;
    @NotNull private LearningAssessmentType type;
    @NotNull @DecimalMin("0.0") private Float score;
    @NotNull @Positive private Float maxScore;
    private String levelBefore;
    private String levelAfter;
    private Integer attemptNumber = 1;

    // ── Enrichissement pré/post ──
    private Long competenceId;
    private String targetLevel;
    @DecimalMin("0.0") private Float autoEvaluation;
    @Size(max = 1000) private String objectifsPersonnels;
    @DecimalMin("0.0") private Float practicalScore;
    @Size(max = 1000) private String trainerComment;
    @Size(max = 1000) private String competencesAcquises;
    private Boolean targetReached;
}