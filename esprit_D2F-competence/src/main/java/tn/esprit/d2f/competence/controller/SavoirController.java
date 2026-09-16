package tn.esprit.d2f.competence.controller;

import esprit.d2f.common.security.AuthorizationMatrix;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
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
import tn.esprit.d2f.competence.dto.SavoirDTO;
import tn.esprit.d2f.competence.dto.SavoirRequest;
import tn.esprit.d2f.competence.entity.enumerations.TypeSavoir;
import tn.esprit.d2f.competence.service.ISavoirService;

@Tag(name = "Savoirs", description = "Gestion des savoirs")
@RestController
@RequestMapping("/api/v1/savoirs")
@RequiredArgsConstructor
public class SavoirController {

    private final ISavoirService savoirService;

    @Operation(summary = "Lister tous les savoirs (paginé)")
    @GetMapping
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_READ)
    public ResponseEntity<Page<SavoirDTO>> getAllSavoirs(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(savoirService.getAllSavoirs(pageable));
    }

    @Operation(summary = "Lister les savoirs d'une sous-compétence (paginé)")
    @GetMapping("/sous-competence/{sousCompetenceId}")
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_READ)
    public ResponseEntity<Page<SavoirDTO>> getSavoirsBySousCompetence(
            @PathVariable Long sousCompetenceId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(savoirService.getSavoirsBySousCompetence(sousCompetenceId, pageable));
    }

    @Operation(summary = "Lister les savoirs directs d'une compétence (paginé)")
    @GetMapping("/competence/{competenceId}")
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_READ)
    public ResponseEntity<Page<SavoirDTO>> getSavoirsByCompetence(
            @PathVariable Long competenceId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(savoirService.getSavoirsByCompetence(competenceId, pageable));
    }

    @Operation(summary = "Lister les savoirs par type (paginé)")
    @GetMapping("/type/{type}")
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_READ)
    public ResponseEntity<Page<SavoirDTO>> getSavoirsByType(
            @PathVariable TypeSavoir type,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(savoirService.getSavoirsByType(type, pageable));
    }

    @Operation(summary = "Rechercher des savoirs par mot-clé (paginé)")
    @GetMapping("/search")
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_READ)
    public ResponseEntity<Page<SavoirDTO>> searchSavoirs(
            @RequestParam String keyword,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(savoirService.searchSavoirs(keyword, pageable));
    }

    @Operation(summary = "Obtenir un savoir par ID")
    @ApiResponse(responseCode = "200", description = "Savoir trouvé")
    @ApiResponse(responseCode = "404", description = "Introuvable")
    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_READ)
    public ResponseEntity<SavoirDTO> getSavoirById(@PathVariable Long id) {
        return ResponseEntity.ok(savoirService.getSavoirById(id));
    }

    @Operation(summary = "Créer un savoir pour une sous-compétence")
    @ApiResponse(responseCode = "201", description = "Savoir créé")
    @ApiResponse(responseCode = "400", description = "Données invalides")
    @ApiResponse(responseCode = "404", description = "Sous-compétence introuvable")
    @PostMapping("/sous-competence/{sousCompetenceId}")
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_WRITE)
    public ResponseEntity<SavoirDTO> createSavoir(
            @PathVariable Long sousCompetenceId,
            @Valid @RequestBody SavoirRequest request) {
        return new ResponseEntity<>(savoirService.createSavoir(sousCompetenceId, request), HttpStatus.CREATED);
    }

    @Operation(summary = "Créer un savoir direct pour une compétence")
    @PostMapping("/competence/{competenceId}")
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_WRITE)
    public ResponseEntity<SavoirDTO> createSavoirForCompetence(
            @PathVariable Long competenceId,
            @Valid @RequestBody SavoirRequest request) {
        return new ResponseEntity<>(savoirService.createSavoirForCompetence(competenceId, request), HttpStatus.CREATED);
    }

    @Operation(summary = "Mettre à jour un savoir")
    @PutMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_WRITE)
    public ResponseEntity<SavoirDTO> updateSavoir(
            @PathVariable Long id,
            @Valid @RequestBody SavoirRequest request) {
        return ResponseEntity.ok(savoirService.updateSavoir(id, request));
    }

    @Operation(summary = "Supprimer un savoir")
    @DeleteMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_WRITE)
    public ResponseEntity<Void> deleteSavoir(@PathVariable Long id) {
        savoirService.deleteSavoir(id);
        return ResponseEntity.noContent().build();
    }
}
