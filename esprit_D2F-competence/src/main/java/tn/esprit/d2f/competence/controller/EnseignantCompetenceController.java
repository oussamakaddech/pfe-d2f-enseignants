package tn.esprit.d2f.competence.controller;

import esprit.d2f.common.security.AuthorizationMatrix;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import tn.esprit.d2f.competence.dto.EnseignantCompetenceDTO;
import tn.esprit.d2f.competence.dto.EnseignantCompetenceRequest;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.service.IEnseignantCompetenceService;

import java.util.Map;

@Tag(name = "Affectations Enseignant", description = "Gestion des affectations compétences/savoirs aux enseignants")
@RestController
@RequestMapping("/api/v1/enseignant-competences")
@RequiredArgsConstructor
public class EnseignantCompetenceController {

    private final IEnseignantCompetenceService enseignantCompetenceService;

    @Operation(summary = "Lister toutes les affectations (paginé)")
    @GetMapping
    @PreAuthorize(AuthorizationMatrix.AFFECTATION_READ)
    public ResponseEntity<Page<EnseignantCompetenceDTO>> getAll(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(enseignantCompetenceService.getAll(pageable));
    }

    @Operation(summary = "Affectations d'un enseignant (paginé)")
    @GetMapping("/enseignant/{enseignantId}")
    @PreAuthorize(AuthorizationMatrix.AFFECTATION_READ)
    public ResponseEntity<Page<EnseignantCompetenceDTO>> getByEnseignant(
            @PathVariable String enseignantId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(enseignantCompetenceService.getCompetencesByEnseignant(enseignantId, pageable));
    }

    @Operation(summary = "Affectations d'un enseignant filtrées par domaine (paginé)")
    @GetMapping("/enseignant/{enseignantId}/domaine/{domaineId}")
    @PreAuthorize(AuthorizationMatrix.AFFECTATION_READ)
    public ResponseEntity<Page<EnseignantCompetenceDTO>> getByEnseignantAndDomaine(
            @PathVariable String enseignantId, @PathVariable Long domaineId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(enseignantCompetenceService.getCompetencesByEnseignantAndDomaine(enseignantId, domaineId, pageable));
    }

    @Operation(summary = "Affectations d'un enseignant filtrées par compétence (paginé)")
    @GetMapping("/enseignant/{enseignantId}/competence/{competenceId}")
    @PreAuthorize(AuthorizationMatrix.AFFECTATION_READ)
    public ResponseEntity<Page<EnseignantCompetenceDTO>> getByEnseignantAndCompetence(
            @PathVariable String enseignantId, @PathVariable Long competenceId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(enseignantCompetenceService.getCompetencesByEnseignantAndCompetence(enseignantId, competenceId, pageable));
    }

    @Operation(summary = "Affectations d'un enseignant filtrées par niveau (paginé)")
    @GetMapping("/enseignant/{enseignantId}/niveau/{niveau}")
    @PreAuthorize(AuthorizationMatrix.AFFECTATION_READ)
    public ResponseEntity<Page<EnseignantCompetenceDTO>> getByEnseignantAndNiveau(
            @PathVariable String enseignantId, @PathVariable NiveauMaitrise niveau,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(enseignantCompetenceService.getCompetencesByEnseignantAndNiveau(enseignantId, niveau, pageable));
    }

    @Operation(summary = "Nombre de savoirs maîtrisés par un enseignant")
    @GetMapping("/enseignant/{enseignantId}/count")
    @PreAuthorize(AuthorizationMatrix.AFFECTATION_READ)
    public ResponseEntity<Map<String, Object>> countByEnseignant(@PathVariable String enseignantId) {
        long count = enseignantCompetenceService.countCompetences(enseignantId);
        return ResponseEntity.ok(Map.of("enseignantId", enseignantId, "count", count));
    }

    @Operation(summary = "Affecter un savoir à un enseignant")
    @PostMapping
    @PreAuthorize(AuthorizationMatrix.AFFECTATION_CREATE)
    public ResponseEntity<EnseignantCompetenceDTO> assignCompetence(@Valid @RequestBody EnseignantCompetenceRequest request) {
        return new ResponseEntity<>(enseignantCompetenceService.assignCompetence(request), HttpStatus.CREATED);
    }

    @Operation(summary = "Mettre à jour le niveau de maîtrise d'une affectation")
    @PatchMapping("/{id}/niveau")
    @PreAuthorize(AuthorizationMatrix.AFFECTATION_UPDATE_SELF)
    public ResponseEntity<EnseignantCompetenceDTO> updateNiveau(
            @PathVariable Long id, @RequestParam NiveauMaitrise niveau) {
        return ResponseEntity.ok(enseignantCompetenceService.updateNiveau(id, niveau));
    }

    @Operation(summary = "Supprimer une affectation")
    @DeleteMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.AFFECTATION_DELETE)
    public ResponseEntity<Void> removeCompetence(@PathVariable Long id) {
        enseignantCompetenceService.removeCompetence(id);
        return ResponseEntity.noContent().build();
    }
}
