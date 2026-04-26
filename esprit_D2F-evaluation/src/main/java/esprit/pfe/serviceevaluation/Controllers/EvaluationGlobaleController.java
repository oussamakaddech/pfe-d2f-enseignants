package esprit.pfe.serviceevaluation.Controllers;

import esprit.pfe.serviceevaluation.Entities.EvaluationGlobale;
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
    public ResponseEntity<EvaluationGlobale> createEvaluationGlobale(@RequestBody EvaluationGlobale evaluation) {
        return ResponseEntity.ok(evaluationGlobaleService.createEvaluationGlobale(evaluation));
    }

    @GetMapping
    public ResponseEntity<List<EvaluationGlobale>> getAllEvaluationGlobales() {
        return ResponseEntity.ok(evaluationGlobaleService.getAllEvaluationGlobales());
    }

    @GetMapping("/{id}")
    public ResponseEntity<EvaluationGlobale> getEvaluationGlobaleById(@PathVariable Long id) {
        return ResponseEntity.ok(evaluationGlobaleService.getEvaluationGlobaleById(id));
    }

    @GetMapping("/formation/{formationId}")
    public ResponseEntity<EvaluationGlobale> getEvaluationGlobaleByFormationId(@PathVariable Long formationId) {
        return ResponseEntity.ok(evaluationGlobaleService.getEvaluationGlobaleByFormationId(formationId));
    }

    @PutMapping("/{id}")
    public ResponseEntity<EvaluationGlobale> updateEvaluationGlobale(@PathVariable Long id, @RequestBody EvaluationGlobale evaluation) {
        return ResponseEntity.ok(evaluationGlobaleService.updateEvaluationGlobale(id, evaluation));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteEvaluationGlobale(@PathVariable Long id) {
        evaluationGlobaleService.deleteEvaluationGlobale(id);
        return ResponseEntity.noContent().build();
    }
}
