package esprit.pfe.serviceformation.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.util.List;

/**
 * DTO pour le résumé d'éligibilité aux certificats (Task 6).
 * Contient: eligible, rejection_reasons, risk_level
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class CertificateEligibilitySummaryDTO {
    
    private Long trainingId;
    private String participantId;
    
    // true si eligible aux certificats
    private boolean eligible;
    
    // Raisons de rejet (liste vide si eligible)
    private List<String> rejectionReasons;
    
    // Avertissements pour les cas proches du seuil
    private List<String> warnings;
    
    // Niveau de risque: LOW, MEDIUM, HIGH, CRITICAL
    private String riskLevel;
    
    // Détails des critères
    private boolean attendanceOk;
    private boolean postTestOk;
    private boolean evaluationSubmitted;
}
