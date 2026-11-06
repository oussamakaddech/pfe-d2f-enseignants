package esprit.pfe.serviceevaluation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceevaluation.dto.EvaluationGlobaleDTO;
import esprit.pfe.serviceevaluation.services.EvaluationGlobaleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/evaluations-globales")
@RequiredArgsConstructor
@io.swagger.v3.oas.annotations.tags.Tag(
        name = "Évaluations globales",
        description = "Synthèse des évaluations par formation et enseignant."
)
@io.swagger.v3.oas.annotations.security.SecurityRequirement(name = "bearerAuth")
public class EvaluationGlobaleController {

    private final EvaluationGlobaleService evaluationGlobaleService;

    private String extractUserEmail(Jwt jwt) {
        if (jwt == null) return null;
        String email = jwt.getClaimAsString("email");
        if (email != null && !email.isBlank()) return email;
        return jwt.getSubject();
    }

    private String extractUserRole(Jwt jwt) {
        if (jwt == null) return null;
        return jwt.getClaimAsString("scope");
    }

    @PostMapping
    @PreAuthorize(AuthorizationMatrix.EVALUATION_CREATE)
    public ResponseEntity<EvaluationGlobaleDTO> createEvaluationGlobale(
            @AuthenticationPrincipal Jwt jwt,
            @Valid @RequestBody EvaluationGlobaleDTO evaluation) {
        return ResponseEntity.status(HttpStatus.CREATED).body(
                evaluationGlobaleService.createEvaluationGlobale(evaluation, extractUserEmail(jwt), extractUserRole(jwt)));
    }

    @GetMapping
    @PreAuthorize(AuthorizationMatrix.EVALUATION_READ_ALL)
    public ResponseEntity<Page<EvaluationGlobaleDTO>> getAllEvaluationGlobales(Pageable pageable) {
        return ResponseEntity.ok(evaluationGlobaleService.getAllEvaluationGlobales(pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.EVALUATION_READ_ALL)
    public ResponseEntity<EvaluationGlobaleDTO> getEvaluationGlobaleById(@PathVariable Long id) {
        return ResponseEntity.ok(evaluationGlobaleService.getEvaluationGlobaleById(id));
    }

    @GetMapping("/formation/{formationId}")
    @PreAuthorize(AuthorizationMatrix.EVALUATION_READ_FORMATION)
    public ResponseEntity<EvaluationGlobaleDTO> getEvaluationGlobaleByFormationId(@PathVariable Long formationId) {
        return ResponseEntity.ok(evaluationGlobaleService.getEvaluationGlobaleByFormationId(formationId));
    }

    @PutMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.EVALUATION_UPDATE)
    public ResponseEntity<EvaluationGlobaleDTO> updateEvaluationGlobale(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id,
            @Valid @RequestBody EvaluationGlobaleDTO evaluation) {
        return ResponseEntity.ok(
                evaluationGlobaleService.updateEvaluationGlobale(id, evaluation, extractUserEmail(jwt), extractUserRole(jwt)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.EVALUATION_DELETE)
    public ResponseEntity<Void> deleteEvaluationGlobale(@PathVariable Long id) {
        evaluationGlobaleService.deleteEvaluationGlobale(id);
        return ResponseEntity.noContent().build();
    }
}
