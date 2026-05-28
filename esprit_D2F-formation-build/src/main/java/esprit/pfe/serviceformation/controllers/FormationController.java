package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.dto.CreateFormationRequest;
import esprit.pfe.serviceformation.dto.FormationResponseDTO;
import esprit.pfe.serviceformation.dto.UpdateFormationRequest;
import esprit.pfe.serviceformation.services.FormationService;
import esprit.pfe.serviceformation.services.FormationSearchService;
import esprit.pfe.serviceformation.dto.FormationFilter;
import esprit.d2f.common.security.AuthorizationMatrix;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

/**
 * REST Controller for Formation resource.
 * Provides complete CRUD operations and advanced queries for training management.
 * All endpoints return DTOs (not entities) for API contract stability.
 */
@RestController
@RequestMapping("/api/v1/formations")
@RequiredArgsConstructor
@Slf4j
@Tag(name = "Formations", description = "Cycle de vie des formations enseignants ESPRIT")
@SecurityRequirement(name = "bearerAuth")
public class FormationController {

    private final FormationService formationService;
    private final FormationSearchService formationSearchService;

    /**
     * Create a new formation.
     * Restricted to ADMIN, CUP, D2F roles.
     *
     * @param request formation creation request (validated)
     * @return created formation with 201 status
     */
    @Operation(
        summary = "Créer une nouvelle formation",
        description = "Crée une nouvelle formation. Réservé aux rôles ADMIN, CUP, D2F."
    )
    @ApiResponse(
        responseCode = "201",
        description = "Formation créée avec succès",
        content = @Content(schema = @Schema(implementation = FormationResponseDTO.class))
    )
    @ApiResponse(responseCode = "400", description = "Requête invalide (validation échouée)")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Permissions insuffisantes")
    @PostMapping
    @PreAuthorize(AuthorizationMatrix.FORMATION_CREATE)
    public ResponseEntity<FormationResponseDTO> createFormation(
            @Valid @RequestBody CreateFormationRequest request) {
        log.info("Creating new formation with title: {}", request.getTitreFormation());
        FormationResponseDTO created = formationService.createFormation(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(created);
    }

    /**
     * Get all formations with pagination.
     * Accessible to all authenticated users with FORMATION_READ permission.
     *
     * @param pageable pagination parameters (page, size, sort)
     * @return paginated list of formations
     */
    @Operation(
        summary = "Lister toutes les formations (paginé)",
        description = "Retourne une page de formations. Accessible à tout utilisateur authentifié."
    )
    @ApiResponse(
        responseCode = "200",
        description = "Page de formations",
        content = @Content(schema = @Schema(implementation = Page.class))
    )
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @GetMapping
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<Page<FormationResponseDTO>> getAllFormations(
            @Parameter(description = "Pagination (page, size, sort)") Pageable pageable) {
        log.debug("Fetching formations with pagination: {}", pageable);
        return ResponseEntity.ok(formationService.getAllFormations(pageable));
    }

    /**
     * Get a formation by its ID.
     * Returns full details of the formation.
     *
     * @param id formation ID
     * @return formation details
     */
    @Operation(
        summary = "Récupérer une formation par son ID",
        description = "Retourne les détails complets d'une formation spécifique."
    )
    @ApiResponse(
        responseCode = "200",
        description = "Formation trouvée",
        content = @Content(schema = @Schema(implementation = FormationResponseDTO.class))
    )
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "404", description = "Formation introuvable")
    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<FormationResponseDTO> getFormationById(
            @Parameter(description = "ID de la formation", example = "42") @PathVariable Long id) {
        log.debug("Fetching formation with id: {}", id);
        return ResponseEntity.ok(formationService.getFormationById(id));
    }

    /**
     * Update an entire formation.
     * Restricted to ADMIN, CUP, D2F, RESPONSABLE_DOSSIER roles.
     *
     * @param id formation ID
     * @param request update request (validated, all fields present)
     * @return updated formation
     */
    @Operation(
        summary = "Mettre à jour une formation",
        description = "Met à jour tous les champs d'une formation. Réservé aux rôles ADMIN, CUP, D2F, RESPONSABLE_DOSSIER."
    )
    @ApiResponse(
        responseCode = "200",
        description = "Formation mise à jour",
        content = @Content(schema = @Schema(implementation = FormationResponseDTO.class))
    )
    @ApiResponse(responseCode = "400", description = "Requête invalide")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Permissions insuffisantes")
    @ApiResponse(responseCode = "404", description = "Formation introuvable")
    @PutMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.FORMATION_UPDATE)
    public ResponseEntity<FormationResponseDTO> updateFormation(
            @Parameter(description = "ID de la formation") @PathVariable Long id,
            @Valid @RequestBody UpdateFormationRequest request) {
        log.info("Updating formation id: {}", id);
        FormationResponseDTO updated = formationService.updateFormation(id, request);
        return ResponseEntity.ok(updated);
    }

    /**
     * Partially update a formation.
     * Supports partial updates (only provided fields are updated).
     * Restricted to same roles as PUT.
     *
     * @param id formation ID
     * @param request partial update request
     * @return updated formation
     */
    @Operation(
        summary = "Mettre à jour partiellement une formation",
        description = "Met à jour seulement les champs fournis (PATCH). Réservé aux rôles ADMIN, CUP, D2F."
    )
    @ApiResponse(
        responseCode = "200",
        description = "Formation mise à jour",
        content = @Content(schema = @Schema(implementation = FormationResponseDTO.class))
    )
    @ApiResponse(responseCode = "400", description = "Requête invalide")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Permissions insuffisantes")
    @ApiResponse(responseCode = "404", description = "Formation introuvable")
    @PatchMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.FORMATION_UPDATE)
    public ResponseEntity<FormationResponseDTO> partialUpdateFormation(
            @Parameter(description = "ID de la formation") @PathVariable Long id,
            @Valid @RequestBody UpdateFormationRequest request) {
        log.info("Partially updating formation id: {}", id);
        FormationResponseDTO updated = formationService.updateFormation(id, request);
        return ResponseEntity.ok(updated);
    }

    /**
     * Delete a formation (soft delete).
     * Restricted to ADMIN role only.
     * The formation is marked as deleted but not removed from database.
     *
     * @param id formation ID
     * @return 204 No Content
     */
    @Operation(
        summary = "Supprimer une formation",
        description = "Supprime (soft delete) une formation. Réservé au rôle ADMIN uniquement."
    )
    @ApiResponse(responseCode = "204", description = "Suppression effectuée")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Permissions insuffisantes")
    @ApiResponse(responseCode = "404", description = "Formation introuvable")
    @DeleteMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.FORMATION_DELETE)
    public ResponseEntity<Void> deleteFormation(
            @Parameter(description = "ID de la formation") @PathVariable Long id) {
        log.info("Deleting formation id: {}", id);
        formationService.deleteFormation(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/{id}/recover")
    @PreAuthorize(AuthorizationMatrix.FORMATION_DELETE)
    @Operation(
        summary = "Récupérer une formation supprimée",
        description = "Restaure une formation supprimée (soft delete). Réservé au rôle ADMIN."
    )
    @ApiResponse(responseCode = "200", description = "Formation restaurée")
    @ApiResponse(responseCode = "404", description = "Formation supprimée introuvable")
    @ApiResponse(responseCode = "403", description = "Permissions insuffisantes")
    public ResponseEntity<FormationResponseDTO> recoverDeletedFormation(
            @Parameter(description = "ID de la formation supprimée") @PathVariable Long id) {
        log.info("Recovering deleted formation id: {}", id);
        FormationResponseDTO recovered = formationService.recoverDeletedFormation(id);
        return ResponseEntity.ok(recovered);
    }

    @PostMapping("/{id}/clone")
    @PreAuthorize(AuthorizationMatrix.FORMATION_CREATE)
    @Operation(
        summary = "Dupliquer une formation",
        description = "Crée une copie d'une formation existante avec un nouveau titre. Réservé aux rôles ADMIN, CUP, D2F."
    )
    @ApiResponse(
        responseCode = "201",
        description = "Formation dupliquée créée",
        content = @Content(schema = @Schema(implementation = FormationResponseDTO.class))
    )
    @ApiResponse(responseCode = "400", description = "Requête invalide")
    @ApiResponse(responseCode = "404", description = "Formation source introuvable")
    public ResponseEntity<FormationResponseDTO> cloneFormation(
            @Parameter(description = "ID de la formation à dupliquer") @PathVariable Long id,
            @Parameter(description = "Titre pour la formation dupliquée") @RequestParam String newTitle) {
        log.info("Cloning formation id: {} with new title: {}", id, newTitle);
        FormationResponseDTO cloned = formationService.cloneFormation(id, newTitle);
        return ResponseEntity.status(HttpStatus.CREATED).body(cloned);
    }

    @GetMapping("/search/by-title")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    @Operation(
        summary = "Rechercher les formations par titre",
        description = "Retourne une page de formations correspondant au titre recherché."
    )
    @ApiResponse(
        responseCode = "200",
        description = "Résultats de recherche (paginé)",
        content = @Content(schema = @Schema(implementation = Page.class))
    )
    public ResponseEntity<Page<FormationResponseDTO>> searchByTitle(
            @Parameter(description = "Titre (ou partie du titre) à rechercher") @RequestParam String title,
            @Parameter(description = "Pagination (page, size, sort)") Pageable pageable) {
        log.debug("Searching formations by title: {}", title);
        return ResponseEntity.ok(formationSearchService.searchByTitle(title, pageable));
    }

    @GetMapping("/search/by-state")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    @Operation(
        summary = "Rechercher les formations par état",
        description = "Retourne une page de formations dans un état donné (PLANIFIEE, EN_COURS, ACHEVEE, ANNULEE)."
    )
    @ApiResponse(
        responseCode = "200",
        description = "Formations par état (paginé)",
        content = @Content(schema = @Schema(implementation = Page.class))
    )
    public ResponseEntity<Page<FormationResponseDTO>> searchByState(
            @Parameter(description = "État de la formation (PLANIFIEE, EN_COURS, ACHEVEE, ANNULEE)") @RequestParam String state,
            @Parameter(description = "Pagination (page, size, sort)") Pageable pageable) {
        log.debug("Searching formations by state: {}", state);
        return ResponseEntity.ok(formationSearchService.searchByState(state, pageable));
    }

    @GetMapping("/search/by-domain")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    @Operation(
        summary = "Rechercher les formations par domaine",
        description = "Retourne une page de formations appartenant à un domaine donné."
    )
    @ApiResponse(
        responseCode = "200",
        description = "Formations par domaine (paginé)",
        content = @Content(schema = @Schema(implementation = Page.class))
    )
    public ResponseEntity<Page<FormationResponseDTO>> searchByDomain(
            @Parameter(description = "Domaine de compétence") @RequestParam String domain,
            @Parameter(description = "Pagination (page, size, sort)") Pageable pageable) {
        log.debug("Searching formations by domain: {}", domain);
        return ResponseEntity.ok(formationSearchService.searchByDomain(domain, pageable));
    }

    @PostMapping("/search/advanced")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    @Operation(
        summary = "Recherche avancée avec filtres multiples",
        description = "Recherche formations avec critères complexes (compétence, domaine, UP, département, état, dates, type de formateur)."
    )
    @ApiResponse(
        responseCode = "200",
        description = "Formations filtrées (paginé)",
        content = @Content(schema = @Schema(implementation = Page.class))
    )
    public ResponseEntity<Page<FormationResponseDTO>> advancedSearch(
            @Valid @RequestBody FormationFilter filter,
            @Parameter(description = "Pagination (page, size, sort)") Pageable pageable) {
        log.debug("Advanced search with filter: {}", filter);
        return ResponseEntity.ok(formationSearchService.searchFormations(filter, pageable));
    }
}
