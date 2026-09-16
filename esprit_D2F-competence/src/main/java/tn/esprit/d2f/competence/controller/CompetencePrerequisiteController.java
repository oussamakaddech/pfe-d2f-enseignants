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
import tn.esprit.d2f.competence.dto.CompetencePrerequisiteDTO;
import tn.esprit.d2f.competence.dto.CompetencePrerequisiteRequest;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.service.ICompetencePrerequisiteService;

import java.util.Map;

@Tag(name = "Prerequis Competence", description = "Gestion des prerequis entre competences")
@RestController
@RequestMapping("/api/v1/competences/{competenceId}/prerequisite")
@RequiredArgsConstructor
public class CompetencePrerequisiteController {

    private final ICompetencePrerequisiteService prerequisiteService;

    @Operation(summary = "Lister les prerequis d'une competence (paginé)")
    @GetMapping
    @PreAuthorize(AuthorizationMatrix.COMPETENCE_READ)
    public ResponseEntity<Page<CompetencePrerequisiteDTO>> getByCompetence(
            @PathVariable Long competenceId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(prerequisiteService.getPrerequisitesByCompetence(competenceId, pageable));
    }

    @Operation(summary = "Verifier l'eligibilite d'un enseignant selon les prerequis")
    @GetMapping("/check/{enseignantId}")
    @PreAuthorize(AuthorizationMatrix.COMPETENCE_READ)
    public ResponseEntity<Map<String, Object>> checkEligibility(
            @PathVariable Long competenceId,
            @PathVariable String enseignantId) {
        return ResponseEntity.ok(prerequisiteService.checkEnseignantEligibilityDetails(competenceId, enseignantId));
    }

    @Operation(summary = "Ajouter un prerequis")
    @PostMapping
    @PreAuthorize(AuthorizationMatrix.COMPETENCE_UPDATE)
    public ResponseEntity<CompetencePrerequisiteDTO> addPrerequisite(
            @PathVariable Long competenceId,
            @Valid @RequestBody CompetencePrerequisiteRequest request) {
        return new ResponseEntity<>(prerequisiteService.addPrerequisite(competenceId, request), HttpStatus.CREATED);
    }

    @Operation(summary = "Modifier le niveau minimum d'un prerequis")
    @PatchMapping("/{id}/niveau")
    @PreAuthorize(AuthorizationMatrix.COMPETENCE_UPDATE)
    public ResponseEntity<CompetencePrerequisiteDTO> updateNiveau(
            @PathVariable Long competenceId,
            @PathVariable Long id,
            @RequestParam NiveauMaitrise niveauMinimum) {
        boolean ownedByCompetence = prerequisiteService.prerequisiteBelongsToCompetence(competenceId, id);
        if (!ownedByCompetence) {
            throw new jakarta.persistence.EntityNotFoundException(
                "Prerequis non trouve pour cette competence avec l'id: " + id);
        }

        return ResponseEntity.ok(prerequisiteService.updateNiveauMinimum(id, niveauMinimum));
    }

    @Operation(summary = "Supprimer un prerequis")
    @DeleteMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.COMPETENCE_UPDATE)
    public ResponseEntity<Void> deletePrerequisite(@PathVariable Long competenceId, @PathVariable Long id) {
        boolean ownedByCompetence = prerequisiteService.prerequisiteBelongsToCompetence(competenceId, id);
        if (!ownedByCompetence) {
            throw new jakarta.persistence.EntityNotFoundException(
                    "Prerequis non trouve pour cette competence avec l'id: " + id);
        }
        prerequisiteService.removePrerequisite(id);
        return ResponseEntity.noContent().build();
    }
}
