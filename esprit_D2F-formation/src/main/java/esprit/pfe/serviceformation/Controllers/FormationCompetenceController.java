package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.entities.FormationCompetence;
import esprit.pfe.serviceformation.services.FormationCompetenceService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;

import java.util.List;

@RestController
@RequestMapping("/api/v1/formation-competences")
@RequiredArgsConstructor
public class FormationCompetenceController {
    private final FormationCompetenceService formationCompetenceService;

    /** GET les liaisons pour une formation */
    @GetMapping("/formation/{formationId}")
    public ResponseEntity<List<FormationCompetence>> getByFormation(@PathVariable Long formationId) {
        return ResponseEntity.ok(formationCompetenceService.getByFormationId(formationId));
    }

    /** POST ajouter une liaison formation-compétence */
    @PostMapping("/formation/{formationId}")
    public ResponseEntity<FormationCompetence> addFormationCompetence(
            @PathVariable Long formationId,
            @RequestBody FormationCompetence fc) {
        return ResponseEntity.ok(formationCompetenceService.addFormationCompetence(formationId, fc));
    }

    /** PUT mettre à jour une liaison */
    @PutMapping("/{id}")
    public ResponseEntity<FormationCompetence> updateFormationCompetence(
            @PathVariable Long id,
            @RequestBody FormationCompetence fc) {
        return ResponseEntity.ok(formationCompetenceService.updateFormationCompetence(id, fc));
    }

    /** DELETE supprimer une liaison */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFormationCompetence(@PathVariable Long id) {
        formationCompetenceService.deleteFormationCompetence(id);
        return ResponseEntity.noContent().build();
    }

    /** PUT remplacer toutes les liaisons pour une formation */
    @PutMapping("/formation/{formationId}/replace-all")
    public ResponseEntity<List<FormationCompetence>> replaceAllForFormation(
            @PathVariable Long formationId,
            @RequestBody List<FormationCompetence> newLinks) {
        return ResponseEntity.ok(formationCompetenceService.replaceAllForFormation(formationId, newLinks));
    }

    /** GET les formations liées à une compétence */
    @GetMapping("/competence/{competenceId}")
    public ResponseEntity<List<FormationCompetence>> getByCompetence(@PathVariable Long competenceId) {
        return ResponseEntity.ok(formationCompetenceService.getByCompetenceId(competenceId));
    }

    /** GET les formations liées à un domaine */
    @GetMapping("/domaine/{domaineId}")
    public ResponseEntity<List<FormationCompetence>> getByDomaine(@PathVariable Long domaineId) {
        return ResponseEntity.ok(formationCompetenceService.getByDomaineId(domaineId));
    }
}
