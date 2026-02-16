package esprit.pfe.serviceevaluation.Controllers;



import esprit.pfe.serviceevaluation.DTO.EvaluationEnseignantDTO;
import esprit.pfe.serviceevaluation.DTO.EvaluationFormateurDTO;
import esprit.pfe.serviceevaluation.Entities.EvaluationFormateur;
import esprit.pfe.serviceevaluation.Services.EvaluationFormateurService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/evaluations")

public class EvaluationFormateurController {

    @Autowired
    private EvaluationFormateurService evaluationService;

    // CREATE
    @PostMapping
    public EvaluationFormateur ajouterEvalParticipant(@RequestBody EvaluationFormateur evaluation) {
        return evaluationService.ajouterEvalParticipant(evaluation);
    }

    // UPDATE
    @PutMapping("/{id}")
    public EvaluationFormateur modifierEvalParticipant(@PathVariable Long id,
                                                       @RequestBody EvaluationFormateur updatedEval) {
        return evaluationService.modifierEvalParticipant(id, updatedEval);
    }

    // DELETE
    @DeleteMapping("/{id}")
    public void supprimerEvalParticipant(@PathVariable Long id) {
        evaluationService.supprimerEvalParticipant(id);
    }

    // READ (un seul)
    @GetMapping("/{id}")
    public EvaluationFormateur consulterEvalParticipant(@PathVariable Long id) {
        return evaluationService.consulterEvalParticipant(id);
    }

    // READ (tous)
    @GetMapping
    public List<EvaluationFormateur> listAllEvaluations() {
        return evaluationService.listAllEvaluations();
    }

    // Logique personnalisée
    @PostMapping("/{id}/valider-competences")
    public void validerCompetences(@PathVariable Long id) {
        evaluationService.validerCompetences(id);
    }


    @PostMapping("/bulk")
    public void createEvaluationsBulk(@RequestBody List<EvaluationFormateurDTO> dtos) {
        evaluationService.createEvaluationsBulk(dtos);
    }
    // GET /evaluations/formation/{formationId}/enriched
    @GetMapping("/formation/{formationId}/enriched")
    public List<EvaluationEnseignantDTO> listEvaluationsEnrichedByFormation(@PathVariable Long formationId) {
        return evaluationService.listEvaluationsEnrichedByFormation(formationId);
    }

    // POST /evaluations/formation/{formationId}/bulk/update
    @PostMapping("/formation/{formationId}/bulk/update")
    public void updateEvaluationsBulkByFormation(@PathVariable Long formationId,
                                                 @RequestBody List<EvaluationFormateurDTO> dtos) {
        evaluationService.updateEvaluationsBulkByFormation(formationId, dtos);
    }

}
