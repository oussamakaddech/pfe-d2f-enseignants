package esprit.pfe.serviceevaluation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * DTO pour les indicateurs d'apprentissage (Task 5).
 * Contient: pre_score, post_score, progression_rate, level_change, attempt_count
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class LearningIndicatorDTO {
    
    private Long trainingId;
    private String participantId;
    
    // Score du test pré-formation
    private Float preScore;
    
    // Score du test post-formation
    private Float postScore;
    
    // Taux de progression en pourcentage
    private Double progressionRate;
    
    // Changement de niveau formaté (ex: "A1 → A2")
    private String levelChange;
    
    // Nombre de tentatives au test
    private Integer attemptCount;
    
    // Niveau avant la formation
    private String preLevel;
    
    // Niveau après la formation
    private String postLevel;
}
