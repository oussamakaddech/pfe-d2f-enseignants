package esprit.pfe.serviceevaluation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceevaluation.dto.CompetencyProgressionDTO;
import esprit.pfe.serviceevaluation.dto.LearningAssessmentRequest;
import esprit.pfe.serviceevaluation.dto.LearningAssessmentResponse;
import esprit.pfe.serviceevaluation.dto.LearningTrainingIndicatorsDTO;
import esprit.pfe.serviceevaluation.service.LearningIndicatorService;
import esprit.pfe.serviceevaluation.services.LearningAssessmentService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/learning-assessments")
@RequiredArgsConstructor
public class LearningAssessmentController {
    private final LearningAssessmentService service;
    private final LearningIndicatorService learningIndicatorService;

    @PostMapping
    @PreAuthorize(AuthorizationMatrix.EVALUATION_CREATE)
    public ResponseEntity<LearningAssessmentResponse> submit(
            @Valid @RequestBody LearningAssessmentRequest request,
            @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(service.submit(request, jwt != null ? jwt.getSubject() : null));
    }

    @GetMapping("/training/{trainingId}")
    @PreAuthorize(AuthorizationMatrix.EVALUATION_READ_FORMATION)
    public List<LearningAssessmentResponse> byTraining(@PathVariable Long trainingId) {
        return service.findByTraining(trainingId);
    }

    @GetMapping("/participant/{participantId}")
    @PreAuthorize(AuthorizationMatrix.EVALUATION_READ_ENSEIGNANT)
    public List<LearningAssessmentResponse> byParticipant(@PathVariable String participantId) {
        return service.findByParticipant(participantId);
    }

    // ── Points d'accès consommés par le service formation (éligibilité certificat) ──

    /** Score du post-test (dernière tentative), en pourcentage du score maximal. */
    @GetMapping("/post-score/{trainingId}/{participantId}")
    @PreAuthorize(AuthorizationMatrix.EVALUATION_READ_FORMATION)
    public ResponseEntity<Float> postScore(@PathVariable Long trainingId,
                                           @PathVariable String participantId) {
        return ResponseEntity.ok(learningIndicatorService.getPostTestPercentage(trainingId, participantId));
    }

    /** Vérifie si le post-test atteint le seuil (en %). */
    @GetMapping("/post-passed/{trainingId}/{participantId}/{threshold}")
    @PreAuthorize(AuthorizationMatrix.EVALUATION_READ_FORMATION)
    public ResponseEntity<Boolean> postPassed(@PathVariable Long trainingId,
                                              @PathVariable String participantId,
                                              @PathVariable double threshold) {
        Float score = learningIndicatorService.getPostTestPercentage(trainingId, participantId);
        return ResponseEntity.ok(score != null && score >= threshold);
    }

    /** Indicateurs d'apprentissage agrégés de la formation (scores avant/après, progression). */
    @GetMapping("/training-indicators/{trainingId}")
    @PreAuthorize(AuthorizationMatrix.EVALUATION_READ_FORMATION)
    public ResponseEntity<LearningTrainingIndicatorsDTO> trainingIndicators(@PathVariable Long trainingId) {
        return ResponseEntity.ok(learningIndicatorService.calculateTrainingIndicators(trainingId));
    }

    /** Évolution pré/post par compétence ciblée par la formation. */
    @GetMapping("/competency-progression/{trainingId}")
    @PreAuthorize(AuthorizationMatrix.EVALUATION_READ_FORMATION)
    public ResponseEntity<List<CompetencyProgressionDTO>> competencyProgression(@PathVariable Long trainingId) {
        return ResponseEntity.ok(learningIndicatorService.calculateCompetencyProgression(trainingId));
    }
}