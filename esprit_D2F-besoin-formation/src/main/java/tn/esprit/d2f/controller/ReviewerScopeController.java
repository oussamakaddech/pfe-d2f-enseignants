package tn.esprit.d2f.controller;

import esprit.d2f.common.security.AuthorizationMatrix;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import tn.esprit.d2f.dto.PageResponse;
import tn.esprit.d2f.dto.ReviewerScopeRequest;
import tn.esprit.d2f.entity.ReviewerScope;
import tn.esprit.d2f.service.ReviewerScopeService;

/**
 * Administration des périmètres validateurs (UP / département).
 *
 * <p>La table {@code reviewer_scope} est la source d'autorité serveur pour le
 * filtrage « appartient à lui » : seul l'administrateur la renseigne. Le
 * endpoint {@code /me} permet au frontend de pré-remplir les formulaires
 * (création collective verrouillée sur le périmètre).</p>
 */
@Tag(name = "Périmètres validateurs", description = "Assignation UP / département des CUP et chefs (ADMIN)")
@RestController
@RequestMapping("/api/v1/besoins-formations/reviewer-scopes")
@RequiredArgsConstructor
public class ReviewerScopeController {

    private final ReviewerScopeService reviewerScopeService;

    @Operation(summary = "Lister tous les périmètres validateurs (paginé)")
    @GetMapping
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_REVIEWER_SCOPE)
    public ResponseEntity<PageResponse<ReviewerScope>> list(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("username").ascending());
        return ResponseEntity.ok(PageResponse.of(reviewerScopeService.listScopes(pageable)));
    }

    @Operation(summary = "Consulter mon périmètre (utilisateur connecté)")
    @ApiResponse(responseCode = "200", description = "Périmètre de l'utilisateur")
    @ApiResponse(responseCode = "404", description = "Aucun périmètre assigné")
    @GetMapping("/me")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<ReviewerScope> me(@Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt) {
        return ResponseEntity.ok(reviewerScopeService.getScope(jwt.getSubject()));
    }

    @Operation(summary = "Assigner / mettre à jour le périmètre d'un validateur (ADMIN)")
    @PutMapping("/{username}")
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_REVIEWER_SCOPE)
    public ResponseEntity<ReviewerScope> upsert(
            @Parameter(description = "Username du validateur") @PathVariable String username,
            @Valid @RequestBody ReviewerScopeRequest request) {
        return ResponseEntity.ok(reviewerScopeService.upsertScope(
                username, request.getRole(), request.getUpCode(), request.getDepartmentCode()));
    }

    @Operation(summary = "Supprimer le périmètre d'un validateur (ADMIN)")
    @ApiResponse(responseCode = "204", description = "Périmètre supprimé")
    @DeleteMapping("/{username}")
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_REVIEWER_SCOPE)
    public ResponseEntity<Void> delete(
            @Parameter(description = "Username du validateur") @PathVariable String username) {
        reviewerScopeService.deleteScope(username);
        return ResponseEntity.noContent().build();
    }
}
