package esprit.pfe.serviceanalyse.Controllers;

import esprit.pfe.serviceanalyse.Services.AnalysePredictiveService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/analyse-predictive")
@RequiredArgsConstructor
public class AnalysePredictiveController {

    private final AnalysePredictiveService analysePredictiveService;

    /**
     * Analyse complète d'un enseignant par son ID.
     * GET /api/analyse-predictive/enseignant/{enseignantId}
     */
    @GetMapping("/enseignant/{enseignantId}")
    public ResponseEntity<Map<String, Object>> analyserEnseignant(
            @PathVariable String enseignantId,
            @RequestParam(required = false) Long competenceCible) {
        Map<String, Object> result = analysePredictiveService.analyserEnseignant(enseignantId, competenceCible);
        return ResponseEntity.ok(result);
    }

    /**
     * Tendances globales (tous enseignants).
     * GET /api/analyse-predictive/tendances
     */
    @GetMapping("/tendances")
    public ResponseEntity<Map<String, Object>> tendancesGlobales() {
        Map<String, Object> result = analysePredictiveService.analyserTendancesGlobales();
        return ResponseEntity.ok(result);
    }
}