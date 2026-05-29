package esprit.pfe.serviceanalyse.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceanalyse.services.AnalysePredictiveService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/v1/analyse-predictive")
@RequiredArgsConstructor
@PreAuthorize(AuthorizationMatrix.SKILL_PASSPORT_READ_ALL)
public class AnalysePredictiveController {

    private final AnalysePredictiveService analysePredictiveService;

    @GetMapping("/enseignant/{enseignantId}")
    public ResponseEntity<Map<String, Object>> analyserEnseignant(
            @PathVariable String enseignantId,
            @RequestParam(required = false) Long competenceCible) {
        Map<String, Object> result = analysePredictiveService.analyserEnseignant(enseignantId, competenceCible);
        return ResponseEntity.ok(result);
    }

    @GetMapping("/tendances")
    public ResponseEntity<Map<String, Object>> tendancesGlobales() {
        Map<String, Object> result = analysePredictiveService.analyserTendancesGlobales();
        return ResponseEntity.ok(result);
    }

    @GetMapping("/enseignants")
    public ResponseEntity<Page<Map<String, Object>>> listerEnseignants(Pageable pageable) {
        Page<Map<String, Object>> page = analysePredictiveService.listerEnseignants(pageable);
        return ResponseEntity.ok(page);
    }
}
