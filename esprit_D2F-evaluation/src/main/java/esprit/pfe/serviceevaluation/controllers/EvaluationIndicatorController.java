package esprit.pfe.serviceevaluation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceevaluation.dto.CompetencyProgressionDTO;
import esprit.pfe.serviceevaluation.dto.LearningTrainingIndicatorsDTO;
import esprit.pfe.serviceevaluation.dto.TrainingEvaluationIndicatorsDTO;
import esprit.pfe.serviceevaluation.service.EvaluationIndicatorService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

/**
 * Indicateurs consolidés d'une formation (étape 7), trois dimensions séparées :
 * évaluation de la formation, évaluation du formateur, évaluation de l'apprentissage.
 */
@RestController
@RequestMapping("/api/v1/evaluation-indicators")
@RequiredArgsConstructor
public class EvaluationIndicatorController {

    private final EvaluationIndicatorService evaluationIndicatorService;

    /** Notes moyennes formation + formateur, satisfaction, taux de réponse, commentaires. */
    @GetMapping("/formation/{formationId}")
    @PreAuthorize(AuthorizationMatrix.EVALUATION_READ_FORMATION)
    public ResponseEntity<TrainingEvaluationIndicatorsDTO> formationIndicators(@PathVariable Long formationId) {
        return ResponseEntity.ok(evaluationIndicatorService.formationIndicators(formationId));
    }

    /** Scores moyens avant/après, progression moyenne, % niveau cible atteint. */
    @GetMapping("/learning/{formationId}")
    @PreAuthorize(AuthorizationMatrix.EVALUATION_READ_FORMATION)
    public ResponseEntity<LearningTrainingIndicatorsDTO> learningIndicators(@PathVariable Long formationId) {
        return ResponseEntity.ok(evaluationIndicatorService.learningIndicators(formationId));
    }

    /** Évolution pré/post par compétence (alimente l'analyse prédictive). */
    @GetMapping("/competency/{formationId}")
    @PreAuthorize(AuthorizationMatrix.EVALUATION_READ_FORMATION)
    public ResponseEntity<List<CompetencyProgressionDTO>> competencyProgression(@PathVariable Long formationId) {
        return ResponseEntity.ok(evaluationIndicatorService.competencyProgression(formationId));
    }
}