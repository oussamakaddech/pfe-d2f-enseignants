package tn.esprit.d2f.competence.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
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
import tn.esprit.d2f.competence.dto.CompetenceDTO;
import tn.esprit.d2f.competence.dto.CompetenceRequest;
import tn.esprit.d2f.competence.dto.EnseignantCompetenceDTO;
import tn.esprit.d2f.competence.service.ICompetenceService;
import tn.esprit.d2f.competence.service.IEnseignantCompetenceService;
import esprit.pfe.auth.Security.AuthorizationMatrix;

import java.util.List;

@Tag(name = "Compétences", description = "Gestion des compétences")
@RestController
@RequestMapping("/api/v1/competences")
@RequiredArgsConstructor
public class CompetenceController {

    private final ICompetenceService competenceService;
    private final IEnseignantCompetenceService enseignantCompetenceService;

    @Operation(summary = "Lister toutes les compétences (paginé)")
    @GetMapping
    @PreAuthorize(AuthorizationMatrix.COMPETENCE_READ)
    public ResponseEntity<Page<CompetenceDTO>> getAllCompetences(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(competenceService.getAllCompetences(pageable));
    }

    @Operation(summary = "Lister les compétences d'un domaine")
    @GetMapping("/domaine/{domaineId}")
    @PreAuthorize(AuthorizationMatrix.COMPETENCE_READ)
    public ResponseEntity<List<CompetenceDTO>> getCompetencesByDomaine(@PathVariable Long domaineId) {
        return ResponseEntity.ok(competenceService.getCompetencesByDomaine(domaineId));
    }

    @Operation(summary = "Obtenir une compétence par ID")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Compétence trouvée"),
        @ApiResponse(responseCode = "404", description = "Compétence introuvable")
    })
    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.COMPETENCE_READ)
    public ResponseEntity<CompetenceDTO> getCompetenceById(@PathVariable Long id) {
        return ResponseEntity.ok(competenceService.getCompetenceById(id));
    }

    @Operation(summary = "Rechercher des compétences par mot-clé (paginé)")
    @GetMapping("/search")
    @PreAuthorize(AuthorizationMatrix.COMPETENCE_READ)
    public ResponseEntity<Page<CompetenceDTO>> search(
            @RequestParam String keyword,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(competenceService.searchCompetences(keyword, pageable));
    }

    @Operation(summary = "Créer une compétence dans un domaine")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Compétence créée"),
        @ApiResponse(responseCode = "400", description = "Données invalides"),
        @ApiResponse(responseCode = "404", description = "Domaine introuvable")
    })
    @PostMapping("/domaine/{domaineId}")
    @PreAuthorize(AuthorizationMatrix.COMPETENCE_CREATE)
    public ResponseEntity<CompetenceDTO> createCompetence(
            @PathVariable Long domaineId,
            @Valid @RequestBody CompetenceRequest request) {
        return new ResponseEntity<>(competenceService.createCompetence(domaineId, request), HttpStatus.CREATED);
    }

    @Operation(summary = "Mettre à jour une compétence")
    @PutMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.COMPETENCE_UPDATE)
    public ResponseEntity<CompetenceDTO> updateCompetence(
            @PathVariable Long id,
            @Valid @RequestBody CompetenceRequest request) {
        return ResponseEntity.ok(competenceService.updateCompetence(id, request));
    }

    @Operation(summary = "Supprimer une compétence")
    @DeleteMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.COMPETENCE_DELETE)
    public ResponseEntity<Void> deleteCompetence(@PathVariable Long id) {
        competenceService.deleteCompetence(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Lister les enseignants d'une compétence")
    @GetMapping("/{id}/enseignants")
    @PreAuthorize(AuthorizationMatrix.COMPETENCE_READ)
    public ResponseEntity<List<EnseignantCompetenceDTO>> getEnseignantsByCompetence(@PathVariable Long id) {
        return ResponseEntity.ok(enseignantCompetenceService.getByCompetenceId(id));
    }
}
