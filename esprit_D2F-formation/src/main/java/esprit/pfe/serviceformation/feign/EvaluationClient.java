package esprit.pfe.serviceformation.feign;


import esprit.pfe.serviceformation.dto.EvaluationFormateurDTO;
import org.springframework.cloud.openfeign.FeignClient;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@FeignClient(
        name = "evaluation-service",
        url = "${EVALUATION_SERVICE_URL}",
        contextId = "evaluationClient",
        fallback = EvaluationClientFallback.class)
public interface EvaluationClient {

    @PostMapping("/evaluations/bulk")
    void createEvaluationsBulk(@RequestBody List<EvaluationFormateurDTO> dtos);
    
    // ===== Task 6: Certificate Eligibility =====
    
    /**
     * Vérifie si une évaluation a été soumise pour un participant à une formation.
     */
    @GetMapping("/evaluations/submitted/{trainingId}/{participantId}")
    boolean hasEvaluationSubmitted(@PathVariable Long trainingId, @PathVariable String participantId);
    
    /**
     * Retourne le score du test post pour un participant.
     */
    @GetMapping("/learning-assessments/post-score/{trainingId}/{participantId}")
    Float getParticipantPostTestScore(@PathVariable Long trainingId, @PathVariable String participantId);
    
    /**
     * Vérifie si le score post-test est >= au seuil minimum.
     */
    @GetMapping("/learning-assessments/post-passed/{trainingId}/{participantId}/{threshold}")
    boolean hasPostTestPassed(@PathVariable Long trainingId, @PathVariable String participantId, 
                              @PathVariable double threshold);
    
    /**
     * Retourne tous les participants ayant complété une formation.
     */
    @GetMapping("/participants/{trainingId}")
    List<String> getAllParticipantsForTraining(@PathVariable Long trainingId);
}
