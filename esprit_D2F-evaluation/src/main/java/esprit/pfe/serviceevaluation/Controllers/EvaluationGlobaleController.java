package esprit.pfe.serviceevaluation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceevaluation.dto.EvaluationGlobaleDTO;
import esprit.pfe.serviceevaluation.services.EvaluationGlobaleService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/evaluations-globales")
@RequiredArgsConstructor
public class EvaluationGlobaleController {

    private final EvaluationGlobaleService evaluationGlobaleService;

    @PostMapping
    @PreAuthorize(AuthorizationMatrix.EVALUATION_CREATE)
    public ResponseEntity<EvaluationGlobaleDTO> createEvaluationGlobale(@Valid @RequestBody EvaluationGlobaleDTO evaluation) {
        return ResponseEntity.ok(evaluationGlobaleService.createEvaluationGlobale(evaluation));
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
    @PreAuthorize(AuthorizationMatrix.EVALUATION_READ_ALL)
    public ResponseEntity<EvaluationGlobaleDTO> getEvaluationGlobaleByFormationId(@PathVariable Long formationId) {
        return ResponseEntity.ok(evaluationGlobaleService.getEvaluationGlobaleByFormationId(formationId));
    }

    @PutMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.EVALUATION_UPDATE)
    public ResponseEntity<EvaluationGlobaleDTO> updateEvaluationGlobale(@PathVariable Long id, @Valid @RequestBody EvaluationGlobaleDTO evaluation) {
        return ResponseEntity.ok(evaluationGlobaleService.updateEvaluationGlobale(id, evaluation));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.EVALUATION_DELETE)
    public ResponseEntity<Void> deleteEvaluationGlobale(@PathVariable Long id) {
        evaluationGlobaleService.deleteEvaluationGlobale(id);
        return ResponseEntity.noContent().build();
    }
}
