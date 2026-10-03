package esprit.pfe.serviceevaluation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Indicateurs d'apprentissage agrégés pour une formation (étape 7).
 * - Score moyen avant / après (en pourcentage du score maximal)
 * - Progression moyenne (points de pourcentage)
 * - Pourcentage de participants ayant atteint le niveau cible
 * - Taux de réponse (participants avec post-test / participants avec pré-test)
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LearningTrainingIndicatorsDTO {
    private Long trainingId;
    /** Participants ayant au moins une évaluation. */
    private Integer participantCount;
    /** Score moyen avant (pré-test), en % du score maximal. */
    private Double averagePreScore;
    /** Score moyen après (post-test), en % du score maximal. */
    private Double averagePostScore;
    /** Progression moyenne (post% − pre%), en points de %. */
    private Double averageProgression;
    /** % de participants ayant atteint le niveau cible. */
    private Double targetReachedRate;
    /** % de participants ayant un post-test parmi ceux qui ont un pré-test. */
    private Double responseRate;
}
