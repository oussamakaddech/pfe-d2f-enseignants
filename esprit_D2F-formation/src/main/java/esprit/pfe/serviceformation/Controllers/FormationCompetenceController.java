package esprit.pfe.serviceformation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceformation.entities.FormationCompetence;
import esprit.pfe.serviceformation.services.FormationCompetenceService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;

import java.util.List;

@RestController
@RequestMapping("/api/v1/formation-competences")
@RequiredArgsConstructor
public class FormationCompetenceController {
    private final FormationCompetenceService formationCompetenceService;

    /** GET les liaisons pour une formation */
    @PreAuthorize(AuthorizationMatrix.FORMATION_COMPETENCE_READ)
    @GetMapping("/formation/{formationId}")
    public ResponseEntity<Page<FormationCompetence>> getByFormation(
            @PathVariable Long formationId,
            @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        return ResponseEntity.ok(formationCompetenceService.getByFormationId(formationId, pageable));
    }

    /** POST ajouter une liaison formation-compétence */
    @PreAuthorize(AuthorizationMatrix.FORMATION_COMPETENCE_CREATE)
    @PostMapping("/formation/{formationId}")
    public ResponseEntity<FormationCompetence> addFormationCompetence(
            @PathVariable Long formationId,
            @RequestBody FormationCompetence fc) {
        return ResponseEntity.ok(formationCompetenceService.addFormationCompetence(formationId, fc));
    }

    /** PUT mettre à jour une liaison */
    @PreAuthorize(AuthorizationMatrix.FORMATION_COMPETENCE_UPDATE)
    @PutMapping("/{id}")
    public ResponseEntity<FormationCompetence> updateFormationCompetence(
            @PathVariable Long id,
            @RequestBody FormationCompetence fc) {
        return ResponseEntity.ok(formationCompetenceService.updateFormationCompetence(id, fc));
    }

    /** DELETE supprimer une liaison */
    @PreAuthorize(AuthorizationMatrix.FORMATION_COMPETENCE_DELETE)
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteFormationCompetence(@PathVariable Long id) {
        formationCompetenceService.deleteFormationCompetence(id);
        return ResponseEntity.noContent().build();
    }

    /** PUT remplacer toutes les liaisons pour une formation */
    @PreAuthorize(AuthorizationMatrix.FORMATION_COMPETENCE_UPDATE)
    @PutMapping("/formation/{formationId}/replace-all")
    public ResponseEntity<List<FormationCompetence>> replaceAllForFormation(
            @PathVariable Long formationId,
            @RequestBody List<FormationCompetence> newLinks) {
        return ResponseEntity.ok(formationCompetenceService.replaceAllForFormation(formationId, newLinks));
    }

    /** GET les formations liées à une compétence */
    @PreAuthorize(AuthorizationMatrix.FORMATION_COMPETENCE_READ)
    @GetMapping("/competence/{competenceId}")
    public ResponseEntity<Page<FormationCompetence>> getByCompetence(
            @PathVariable Long competenceId,
            @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        return ResponseEntity.ok(formationCompetenceService.getByCompetenceId(competenceId, pageable));
    }

    /** GET les formations liées à un domaine */
    @PreAuthorize(AuthorizationMatrix.FORMATION_COMPETENCE_READ)
    @GetMapping("/domaine/{domaineId}")
    public ResponseEntity<Page<FormationCompetence>> getByDomaine(
            @PathVariable Long domaineId,
            @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        return ResponseEntity.ok(formationCompetenceService.getByDomaineId(domaineId, pageable));
    }
}
