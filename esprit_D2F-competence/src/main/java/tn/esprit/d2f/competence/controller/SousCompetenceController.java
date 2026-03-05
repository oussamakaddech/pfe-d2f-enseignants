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
import org.springframework.web.bind.annotation.*;
import tn.esprit.d2f.competence.dto.SousCompetenceDTO;
import tn.esprit.d2f.competence.dto.SousCompetenceRequest;
import tn.esprit.d2f.competence.service.ISousCompetenceService;

import java.util.List;

@Tag(name = "Sous-Compétences", description = "Gestion des sous-compétences")
@RestController
@RequestMapping("/api/v1/sous-competences")
@RequiredArgsConstructor
public class SousCompetenceController {

    private final ISousCompetenceService sousCompetenceService;

    @Operation(summary = "Lister toutes les sous-compétences (paginé)")
    @GetMapping
    public ResponseEntity<Page<SousCompetenceDTO>> getAllSousCompetences(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(sousCompetenceService.getAllSousCompetences(pageable));
    }

    @Operation(summary = "Lister les sous-compétences d'une compétence")
    @GetMapping("/competence/{competenceId}")
    public ResponseEntity<List<SousCompetenceDTO>> getSousCompetencesByCompetence(@PathVariable Long competenceId) {
        return ResponseEntity.ok(sousCompetenceService.getSousCompetencesByCompetence(competenceId));
    }

    @Operation(summary = "Obtenir une sous-compétence par ID")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Sous-compétence trouvée"),
        @ApiResponse(responseCode = "404", description = "Introuvable")
    })
    @GetMapping("/{id}")
    public ResponseEntity<SousCompetenceDTO> getSousCompetenceById(@PathVariable Long id) {
        return ResponseEntity.ok(sousCompetenceService.getSousCompetenceById(id));
    }

    @Operation(summary = "Rechercher des sous-compétences par mot-clé (paginé)")
    @GetMapping("/search")
    public ResponseEntity<Page<SousCompetenceDTO>> search(
            @RequestParam String keyword,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(sousCompetenceService.searchSousCompetences(keyword, pageable));
    }

    @Operation(summary = "Créer une sous-compétence dans une compétence")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Sous-compétence créée"),
        @ApiResponse(responseCode = "400", description = "Données invalides"),
        @ApiResponse(responseCode = "404", description = "Compétence introuvable")
    })
    @PostMapping("/competence/{competenceId}")
    public ResponseEntity<SousCompetenceDTO> createSousCompetence(
            @PathVariable Long competenceId,
            @Valid @RequestBody SousCompetenceRequest request) {
        return new ResponseEntity<>(sousCompetenceService.createSousCompetence(competenceId, request), HttpStatus.CREATED);
    }

    @Operation(summary = "Mettre à jour une sous-compétence")
    @PutMapping("/{id}")
    public ResponseEntity<SousCompetenceDTO> updateSousCompetence(
            @PathVariable Long id,
            @Valid @RequestBody SousCompetenceRequest request) {
        return ResponseEntity.ok(sousCompetenceService.updateSousCompetence(id, request));
    }

    @Operation(summary = "Supprimer une sous-compétence")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSousCompetence(@PathVariable Long id) {
        sousCompetenceService.deleteSousCompetence(id);
        return ResponseEntity.noContent().build();
    }
}
