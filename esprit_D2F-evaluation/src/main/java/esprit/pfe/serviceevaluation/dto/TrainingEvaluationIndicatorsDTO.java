package esprit.pfe.serviceevaluation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Indicateurs d'évaluation pour une formation (étape 7).
 * Trois dimensions séparées :
 * - Formation : pertinence, organisation, supports, durée, satisfaction (0-5)
 * - Formateur : maîtrise, clarté, pédagogie, interaction, gestion du temps (0-5)
 * - Réponse : taux de réponse et nombre de commentaires
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class TrainingEvaluationIndicatorsDTO {
    private Long formationId;

    // ── Évaluation de la formation (moyennes 0-5) ──
    private Double averagePertinence;
    private Double averageOrganisation;
    private Double averageQualiteSupports;
    private Double averageDuree;
    private Double averageSatisfaction;
    /** Note globale moyenne de la formation (échelle 0-20). */
    private Double averageFormationRating;

    // ── Évaluation du formateur (moyennes 0-5) ──
    private Double averageMaitrise;
    private Double averageClarte;
    private Double averagePedagogie;
    private Double averageInteraction;
    private Double averageGestionTemps;
    /** Note moyenne du formateur (échelle 0-20). */
    private Double averageTrainerRating;

    // ── Réponse ──
    /** Nombre d'évaluations de formateur collectées. */
    private Integer responseCount;
    /** Nombre d'évaluations comportant un commentaire. */
    private Integer commentCount;
    /** Taux de réponse : évaluations collectées / évaluations attendues (0-100). */
    private Double responseRate;
}
