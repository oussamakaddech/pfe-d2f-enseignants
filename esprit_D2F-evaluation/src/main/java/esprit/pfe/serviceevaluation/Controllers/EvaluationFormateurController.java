package esprit.pfe.serviceevaluation.controllers;



import esprit.pfe.serviceevaluation.dto.EvaluationEnseignantDTO;
import esprit.pfe.serviceevaluation.dto.EvaluationFormateurDTO;
import esprit.pfe.serviceevaluation.services.EvaluationFormateurService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/evaluations")
@RequiredArgsConstructor
public class EvaluationFormateurController {

    private final EvaluationFormateurService evaluationService;

    // CREATE
    @PostMapping
    public ResponseEntity<EvaluationFormateurDTO> ajouterEvalParticipant(@Valid @RequestBody EvaluationFormateurDTO evaluation) {
        return ResponseEntity.status(HttpStatus.CREATED).body(evaluationService.ajouterEvalParticipant(evaluation));
    }

    // UPDATE
    @PutMapping("/{id}")
    public ResponseEntity<EvaluationFormateurDTO> modifierEvalParticipant(@PathVariable Long id,
                                                                         @Valid @RequestBody EvaluationFormateurDTO updatedEval) {
        return ResponseEntity.ok(evaluationService.modifierEvalParticipant(id, updatedEval));
    }

    // DELETE
    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void supprimerEvalParticipant(@PathVariable Long id) {
        evaluationService.supprimerEvalParticipant(id);
    }

    // READ (un seul)
    @GetMapping("/{id}")
    public ResponseEntity<EvaluationFormateurDTO> consulterEvalParticipant(@PathVariable Long id) {
        return ResponseEntity.ok(evaluationService.getEvaluationDto(id));
    }

    // READ (tous, paginé)
    @GetMapping
    public ResponseEntity<Page<EvaluationFormateurDTO>> listAllEvaluations(Pageable pageable) {
        return ResponseEntity.ok(evaluationService.listAllEvaluationsDto(pageable));
    }

    // Logique personnalisée
    @PostMapping("/{id}/valider-competences")
    public ResponseEntity<Void> validerCompetences(@PathVariable Long id) {
        evaluationService.validerCompetences(id);
        return ResponseEntity.ok().build();
    }

    @PostMapping("/bulk")
    public ResponseEntity<Void> createEvaluationsBulk(@Valid @RequestBody List<EvaluationFormateurDTO> dtos) {
        evaluationService.createEvaluationsBulk(dtos);
        return ResponseEntity.status(HttpStatus.CREATED).build();
    }

    @GetMapping("/formation/{formationId}/enriched")
    public List<EvaluationEnseignantDTO> listEvaluationsEnrichedByFormation(@PathVariable Long formationId) {
        return evaluationService.listEvaluationsEnrichedByFormation(formationId);
    }

    @PostMapping("/formation/{formationId}/bulk/update")
    public ResponseEntity<Void> updateEvaluationsBulkByFormation(@PathVariable Long formationId,
                                                                @Valid @RequestBody List<EvaluationFormateurDTO> dtos) {
        evaluationService.updateEvaluationsBulkByFormation(formationId, dtos);
        return ResponseEntity.ok().build();
    }
}


