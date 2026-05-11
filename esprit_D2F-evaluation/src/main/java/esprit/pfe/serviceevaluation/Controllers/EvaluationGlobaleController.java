package esprit.pfe.serviceevaluation.controllers;

import esprit.pfe.serviceevaluation.dto.EvaluationGlobaleDTO;
import esprit.pfe.serviceevaluation.services.EvaluationGlobaleService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/evaluations-globales")
@RequiredArgsConstructor
public class EvaluationGlobaleController {

    private final EvaluationGlobaleService evaluationGlobaleService;

    @PostMapping
    public ResponseEntity<EvaluationGlobaleDTO> createEvaluationGlobale(@RequestBody EvaluationGlobaleDTO evaluation) {
        return ResponseEntity.ok(evaluationGlobaleService.createEvaluationGlobale(evaluation));
    }

    @GetMapping
    public ResponseEntity<Page<EvaluationGlobaleDTO>> getAllEvaluationGlobales(Pageable pageable) {
        return ResponseEntity.ok(evaluationGlobaleService.getAllEvaluationGlobales(pageable));
    }

    @GetMapping("/{id}")
    public ResponseEntity<EvaluationGlobaleDTO> getEvaluationGlobaleById(@PathVariable Long id) {
        return ResponseEntity.ok(evaluationGlobaleService.getEvaluationGlobaleById(id));
    }

    @GetMapping("/formation/{formationId}")
    public ResponseEntity<EvaluationGlobaleDTO> getEvaluationGlobaleByFormationId(@PathVariable Long formationId) {
        return ResponseEntity.ok(evaluationGlobaleService.getEvaluationGlobaleByFormationId(formationId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EvaluationGlobaleDTO> updateEvaluationGlobale(@PathVariable Long id, @RequestBody EvaluationGlobaleDTO evaluation) {
        return ResponseEntity.ok(evaluationGlobaleService.updateEvaluationGlobale(id, evaluation));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvaluationGlobale(@PathVariable Long id) {
        evaluationGlobaleService.deleteEvaluationGlobale(id);
        return ResponseEntity.noContent().build();
    }
}
