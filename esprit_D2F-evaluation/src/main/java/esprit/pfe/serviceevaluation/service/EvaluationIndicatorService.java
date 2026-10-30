package esprit.pfe.serviceevaluation.service;

import esprit.pfe.serviceevaluation.dto.CompetencyProgressionDTO;
import esprit.pfe.serviceevaluation.dto.LearningTrainingIndicatorsDTO;
import esprit.pfe.serviceevaluation.dto.TrainingEvaluationIndicatorsDTO;
import esprit.pfe.serviceevaluation.entities.EvaluationFormateur;
import esprit.pfe.serviceevaluation.entities.EvaluationGlobale;
import esprit.pfe.serviceevaluation.repositories.EvaluationFormateurRepository;
import esprit.pfe.serviceevaluation.repositories.EvaluationGlobaleRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Optional;
import java.util.function.Function;

/**
 * Indicateurs consolidés d'une formation (étape 7), en séparant les trois
 * dimensions : évaluation de la formation, évaluation du formateur,
 * évaluation de l'apprentissage (déléguée à {@link LearningIndicatorService}).
 */
@Service
@RequiredArgsConstructor
public class EvaluationIndicatorService {

    private final EvaluationGlobaleRepository evaluationGlobaleRepository;
    private final EvaluationFormateurRepository evaluationFormateurRepository;
    private final LearningIndicatorService learningIndicatorService;

    /** Moyenne bornée (null-safe) sur un critère optionnel. */
    private static <T> Double average(List<T> items, Function<T, Float> getter) {
        return items.stream().map(getter::apply).filter(v -> v != null)
                .mapToDouble(Float::doubleValue).average().orElse(0.0);
    }

    /**
     * Indicateurs d'évaluation de la formation et du formateur.
     * L'apprentissage est fourni séparément par {@link #learningIndicators(Long)}.
     */
    @Transactional(readOnly = true)
    public TrainingEvaluationIndicatorsDTO formationIndicators(Long formationId) {
        Optional<EvaluationGlobale> globale = evaluationGlobaleRepository.findByFormationId(formationId);
        List<EvaluationFormateur> evaluations = evaluationFormateurRepository.findByFormationId(formationId);

        long commentCount = evaluations.stream()
                .filter(e -> e.getCommentaire() != null && !e.getCommentaire().isBlank())
                .count();

        TrainingEvaluationIndicatorsDTO.TrainingEvaluationIndicatorsDTOBuilder builder =
                TrainingEvaluationIndicatorsDTO.builder()
                        .formationId(formationId)
                        .averageFormationRating(globale.map(g -> g.getNoteGlobale() != null
                                ? g.getNoteGlobale().doubleValue() : 0.0).orElse(null))
                        .averagePertinence(globale.map(g -> average(List.of(g), EvaluationGlobale::getPertinenceContenu))
                                .filter(v -> v > 0).orElse(null))
                        .averageOrganisation(globale.map(g -> average(List.of(g), EvaluationGlobale::getOrganisation))
                                .filter(v -> v > 0).orElse(null))
                        .averageQualiteSupports(globale.map(g -> average(List.of(g), EvaluationGlobale::getQualiteSupports))
                                .filter(v -> v > 0).orElse(null))
                        .averageDuree(globale.map(g -> average(List.of(g), EvaluationGlobale::getDureeAdaptee))
                                .filter(v -> v > 0).orElse(null))
                        .averageSatisfaction(globale.map(g -> average(List.of(g), EvaluationGlobale::getSatisfactionGlobale))
                                .filter(v -> v > 0).orElse(null))
                        .averageTrainerRating(evaluations.isEmpty() ? null :
                                evaluations.stream().mapToDouble(EvaluationFormateur::getNote).average().orElse(0.0))
                        .averageMaitrise(evaluations.isEmpty() ? null :
                                average(evaluations, EvaluationFormateur::getMaitriseSujet))
                        .averageClarte(evaluations.isEmpty() ? null :
                                average(evaluations, EvaluationFormateur::getClarte))
                        .averagePedagogie(evaluations.isEmpty() ? null :
                                average(evaluations, EvaluationFormateur::getPedagogie))
                        .averageInteraction(evaluations.isEmpty() ? null :
                                average(evaluations, EvaluationFormateur::getInteraction))
                        .averageGestionTemps(evaluations.isEmpty() ? null :
                                average(evaluations, EvaluationFormateur::getGestionTemps))
                        .responseCount(evaluations.size())
                        .commentCount((int) commentCount)
                        .responseRate(100.0); // les évaluations collectées sont par définition répondues

        return builder.build();
    }

    /** Indicateurs d'apprentissage (scores avant/après, progression, niveau cible). */
    @Transactional(readOnly = true)
    public LearningTrainingIndicatorsDTO learningIndicators(Long trainingId) {
        return learningIndicatorService.calculateTrainingIndicators(trainingId);
    }

    /** Progression par compétence (avant / après / delta). */
    @Transactional(readOnly = true)
    public List<CompetencyProgressionDTO> competencyProgression(Long trainingId) {
        return learningIndicatorService.calculateCompetencyProgression(trainingId);
    }
}
