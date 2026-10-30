package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.dto.CertificateEligibilityResult;
import esprit.pfe.serviceformation.dto.CertificateEligibilitySummaryDTO;
import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import esprit.pfe.serviceformation.repositories.PresenceRepository;
import esprit.pfe.serviceformation.repositories.SeanceFormationRepository;
import esprit.pfe.serviceformation.service.PresenceIndicatorService;
import esprit.pfe.serviceformation.feign.EvaluationClient;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
public class CertificateEligibilityService {
    private static final double MIN_ATTENDANCE_PERCENTAGE = 80.0;
    
    private final FormationRepository formationRepository;
    private final SeanceFormationRepository seanceFormationRepository;
    private final PresenceRepository presenceRepository;
    private final PresenceIndicatorService presenceIndicatorService;
    private final EvaluationClient evaluationClient;
    
    @Value("${certificate.attendance-threshold:80.0}")
    private double attendanceThreshold;
    
    @Value("${certificate.posttest-score-threshold:50.0}")
    private double postTestScoreThreshold;

    public CertificateEligibilityResult check(Long formationId) {
        List<String> reasons = new ArrayList<>();
        Formation formation = formationRepository.findById(formationId)
                .orElseThrow(() -> new IllegalStateException("Formation introuvable: " + formationId));
        if (formation.getEtatFormation() != EtatFormation.ACHEVE) {
            reasons.add("La formation n'est pas achevée");
            return new CertificateEligibilityResult(false, List.copyOf(reasons));
        }
        var sessions = seanceFormationRepository.findByFormationId(formationId);
        if (sessions.isEmpty()) {
            reasons.add("Aucune séance de formation n'est définie");
            return new CertificateEligibilityResult(false, List.copyOf(reasons));
        }
        if (presenceRepository.findEnseignantsPresentSurToutesLesSeances(formationId).isEmpty()) {
            reasons.add("Aucun participant n'atteint le seuil de présence de "
                    + MIN_ATTENDANCE_PERCENTAGE + " %");
        }
        return new CertificateEligibilityResult(reasons.isEmpty(), List.copyOf(reasons));
    }

    /**
     * Évalue l'éligibilité d'un participant pour un certificat avec indicateurs détaillés (Task 6).
     * Retourne: eligible, rejection_reasons, risk_level
     */
    public CertificateEligibilitySummaryDTO evaluateEligibilityWithSummary(Long trainingId, String participantId) {
        return evaluateEligibilityWithSummary(trainingId, participantId, "CERTIF");
    }

    /**
     * Éligibilité selon le type de document demandé :
     *  - ATTESTATION / BADGE : participation — présence ≥ seuil uniquement ;
     *  - CERTIF (défaut) : réussite — présence + post-test ≥ seuil + évaluation
     *    du formateur soumise.
     */
    public CertificateEligibilitySummaryDTO evaluateEligibilityWithSummary(
            Long trainingId, String participantId, String typeCertif) {
        boolean isParticipationDoc = "ATTESTATION".equalsIgnoreCase(typeCertif)
                || "BADGE".equalsIgnoreCase(typeCertif);
        List<String> rejectionReasons = new ArrayList<>();
        List<String> warnings = new ArrayList<>();

        // Critère 1 : Formation ACHEVE (vérifié au niveau de la génération)
        Formation formation = formationRepository.findById(trainingId)
                .orElse(null);
        if (formation == null || formation.getEtatFormation() != EtatFormation.ACHEVE) {
            rejectionReasons.add("Formation non complétée ou introuvable");
        }

        // Critère 2 : Taux de présence >= 80% (requis pour les deux types)
        boolean attendanceOk = presenceIndicatorService.meetsAttendanceThreshold(
                trainingId, participantId, attendanceThreshold);
        if (!attendanceOk) {
            var indicators = presenceIndicatorService.calculatePresenceIndicators(trainingId, participantId);
            rejectionReasons.add(String.format(
                    "Taux de présence insuffisant: %.1f%% (requis: %.1f%%)",
                    indicators.getAttendanceRate(), attendanceThreshold));
        }

        // Critères CERTIF uniquement : post-test + évaluation formateur.
        boolean postTestOk = true;
        boolean evaluationSubmitted = true;
        if (!isParticipationDoc) {
            // Critère 3 & 4 : Post-test complété et score >= 50%
            postTestOk = evaluationClient.hasPostTestPassed(trainingId, participantId, postTestScoreThreshold);
            if (!postTestOk) {
                var postScore = evaluationClient.getParticipantPostTestScore(trainingId, participantId);
                if (postScore == null) {
                    rejectionReasons.add("Test post-formation non complété");
                } else {
                    rejectionReasons.add(String.format(
                            "Score post-test insuffisant: %.1f/100 (requis: %.1f)",
                            postScore, postTestScoreThreshold));
                }
            }

            // Critère 5 : Évaluation formateur soumise
            evaluationSubmitted = evaluationClient.hasEvaluationSubmitted(trainingId, participantId);
            if (!evaluationSubmitted) {
                rejectionReasons.add("Évaluation du formateur non soumise");
            }
        }
        
        // Déterminer le niveau de risque
        String riskLevel = determineRiskLevel(trainingId, participantId, rejectionReasons, warnings);
        
        boolean eligible = rejectionReasons.isEmpty();
        
        return CertificateEligibilitySummaryDTO.builder()
                .trainingId(trainingId)
                .participantId(participantId)
                .eligible(eligible)
                .rejectionReasons(rejectionReasons)
                .warnings(warnings)
                .riskLevel(riskLevel)
                .attendanceOk(attendanceOk)
                .postTestOk(postTestOk)
                .evaluationSubmitted(evaluationSubmitted)
                .build();
    }

    /**
     * Détermine le niveau de risque: LOW, MEDIUM, HIGH, CRITICAL
     */
    private String determineRiskLevel(Long trainingId, String participantId, 
                                      List<String> rejectionReasons, List<String> warnings) {
        if (rejectionReasons.isEmpty()) {
            return "LOW";
        }
        
        if (rejectionReasons.size() >= 3) {
            return "CRITICAL";
        }
        
        var presenceIndicators = presenceIndicatorService.calculatePresenceIndicators(trainingId, participantId);
        
        // Si très proche du seuil de présence (< 10% d'écart)
        if (presenceIndicators.getAttendanceRate() >= (attendanceThreshold - 10)) {
            warnings.add(String.format("Présence proche du seuil minimum (%.1f%%)", 
                    presenceIndicators.getAttendanceRate()));
        }
        
        return rejectionReasons.size() == 1 ? "HIGH" : "MEDIUM";
    }
}