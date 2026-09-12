package esprit.pfe.serviceevaluation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Évolution mesurée pour une compétence ciblée par une formation (étape 6).
 * Alimente l'analyse prédictive : progression réelle pré/post par compétence.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CompetencyProgressionDTO {
    private Long trainingId;
    private Long competenceId;
    private Integer participantCount;
    /** Score moyen avant, en % du score maximal. */
    private Double averagePreScore;
    /** Score moyen après, en % du score maximal. */
    private Double averagePostScore;
    /** Progression moyenne (post% − pre%), en points de %. */
    private Double averageProgression;
    /** Nombre de participants ayant atteint le niveau cible. */
    private Integer targetReachedCount;
}
