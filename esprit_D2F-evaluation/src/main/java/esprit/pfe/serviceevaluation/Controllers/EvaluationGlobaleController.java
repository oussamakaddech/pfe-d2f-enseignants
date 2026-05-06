package esprit.pfe.serviceevaluation.Controllers;

import esprit.pfe.serviceevaluation.DTO.EvaluationGlobaleDTO;
import esprit.pfe.serviceevaluation.Services.EvaluationGlobaleService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/evaluations-globales")
public class EvaluationGlobaleController {

    @Autowired
    private EvaluationGlobaleService evaluationGlobaleService;

    @PostMapping
    public ResponseEntity<EvaluationGlobaleDTO> createEvaluationGlobale(@RequestBody EvaluationGlobaleDTO evaluation) {
        return ResponseEntity.ok(evaluationGlobaleService.createEvaluationGlobale(evaluation));
    }

    @GetMapping
    public ResponseEntity<List<EvaluationGlobaleDTO>> getAllEvaluationGlobales() {
        return ResponseEntity.ok(evaluationGlobaleService.getAllEvaluationGlobales());
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
