package esprit.pfe.serviceevaluation.entities;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDateTime;
import java.time.ZoneId;

@Entity
@Table(name = "learning_assessments", uniqueConstraints = @UniqueConstraint(
        name = "uk_learning_assessment_participant_training_type",
        columnNames = {"participant_id", "training_id", "assessment_type"}))
@Getter
@Setter
@NoArgsConstructor
public class LearningAssessment extends BaseAuditEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "training_id", nullable = false)
    private Long trainingId;

    @Column(name = "session_id")
    private Long sessionId;

    @Column(name = "participant_id", nullable = false, length = 150)
    private String participantId;

    @Enumerated(EnumType.STRING)
    @Column(name = "assessment_type", nullable = false, length = 10)
    private LearningAssessmentType type;

    @Column(nullable = false)
    private Float score;

    @Column(name = "max_score", nullable = false)
    private Float maxScore;

    @Column(name = "level_before", length = 50)
    private String levelBefore;

    @Column(name = "level_after", length = 50)
    private String levelAfter;

    @Column(name = "evaluated_by", length = 150)
    private String evaluatedBy;

    @Column(name = "evaluated_at", nullable = false)
    private LocalDateTime evaluatedAt = LocalDateTime.now(ZoneId.systemDefault());

    @Column(name = "attempt_number", nullable = false)
    private Integer attemptNumber = 1;

    // ── Enrichissement pré/post (étape 2) ──────────────────────────────

    /** Compétence ciblée par l'évaluation (liaison formation ↔ compétence). */
    @Column(name = "competence_id")
    private Long competenceId;

    /** Niveau cible attendu à l'issue de la formation (ex: "A2"). */
    @Column(name = "target_level", length = 50)
    private String targetLevel;

    /** Auto-évaluation du participant (pré-formation), sur la même échelle que score. */
    @Column(name = "auto_evaluation")
    private Float autoEvaluation;

    /** Objectifs personnels exprimés avant la formation. */
    @Column(name = "objectifs_personnels", length = 1000)
    private String objectifsPersonnels;

    /** Score obtenu à l'exercice pratique (post-formation). */
    @Column(name = "practical_score")
    private Float practicalScore;

    /** Commentaire du formateur (post-formation). */
    @Column(name = "trainer_comment", length = 1000)
    private String trainerComment;

    /** Compétences acquises listées par le formateur (post-formation). */
    @Column(name = "competences_acquises", length = 1000)
    private String competencesAcquises;

    /** Indique si le participant a atteint le niveau cible. */
    @Column(name = "target_reached")
    private Boolean targetReached;
}