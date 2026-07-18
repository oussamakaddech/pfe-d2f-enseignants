package esprit.pfe.serviceanalyse.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceanalyse.dto.analytics.PageDto;
import esprit.pfe.serviceanalyse.services.AnalysePredictiveBffService;
import esprit.pfe.serviceanalyse.services.AnalysePredictiveService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/analyse-predictive")
@RequiredArgsConstructor
@PreAuthorize(AuthorizationMatrix.SKILL_PASSPORT_READ_ALL)
public class AnalysePredictiveController {

    private final AnalysePredictiveService analysePredictiveService;
    private final AnalysePredictiveBffService bffService;

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

    // ── BFF : vues consolidées déléguées au moteur FastAPI ───────────────────

    /** Tuiles d'en-tête (KPIs + deltas) agrégées avec la synthèse d'alertes. */
    @GetMapping("/overview")
    public ResponseEntity<Map<String, Object>> overview(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearerToken) {
        return ResponseEntity.ok(bffService.overview(bearerToken));
    }

    /** Digest d'alertes : synthèse + actions prioritaires. */
    @GetMapping("/alerts/digest")
    public ResponseEntity<Map<String, Object>> alertsDigest(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearerToken) {
        return ResponseEntity.ok(bffService.alertsDigest(bearerToken));
    }

    /** File d'actions priorisée (filtrable par département). */
    @GetMapping("/actions/priority")
    public ResponseEntity<PageDto<Map<String, Object>>> priorityActions(
            @PageableDefault(size = 20) Pageable pageable,
            @RequestParam(required = false) String departementId,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearerToken) {
        return ResponseEntity.ok(bffService.priorityActions(pageable, departementId, bearerToken));
    }

    /** Impact réel global des formations suivies (agrégats historiques). */
    @GetMapping("/training-impact")
    public ResponseEntity<Map<String, Object>> trainingImpact(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearerToken) {
        return ResponseEntity.ok(bffService.trainingImpact(bearerToken));
    }

    /** Classement paginé des formations selon leur impact (gain de niveau). */
    @GetMapping("/training-impact/formations")
    public ResponseEntity<Map<String, Object>> trainingImpactFormations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearerToken) {
        return ResponseEntity.ok(bffService.trainingImpactFormations(page, size, bearerToken));
    }

    /** Simulation what-if : projection du risque si un plan de formations est suivi. */
    @PostMapping("/simulate/what-if")
    public ResponseEntity<Map<String, Object>> simulateWhatIf(
            @RequestBody Map<String, Object> plan,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearerToken) {
        return ResponseEntity.ok(bffService.simulateWhatIf(plan, bearerToken));
    }
}
