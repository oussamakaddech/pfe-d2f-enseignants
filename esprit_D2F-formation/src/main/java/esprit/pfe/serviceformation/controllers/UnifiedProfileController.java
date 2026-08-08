package esprit.pfe.serviceformation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceformation.common.PageResponse;
import esprit.pfe.serviceformation.dto.AdvancedFilterRequest;
import esprit.pfe.serviceformation.dto.DeptDTO;
import esprit.pfe.serviceformation.dto.UnifiedProfileDTO;
import esprit.pfe.serviceformation.services.CurrentUser;
import esprit.pfe.serviceformation.services.UnifiedProfileService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import java.nio.charset.StandardCharsets;
import java.time.LocalDate;
import java.util.List;

/**
 * Page de gestion unifiée (comptes + enseignants).
 *
 * <p>RBAC : accès limité à ADMIN, CUP, CHEF_DEPARTEMENT, RESPONSABLE_DOSSIER
 * (cf. {@link AuthorizationMatrix#UNIFIED_PROFILE_READ}). Le périmètre fin
 * (CHEF_DEPARTEMENT = son département) est appliqué au niveau service, jamais
 * uniquement côté frontend.</p>
 */
@RestController
@RequestMapping("/api/v1/unified-profiles")
@Tag(name = "Gestion unifiée", description = "Profils unifiés comptes + enseignants, filtres avancés et export")
public class UnifiedProfileController {

    private final UnifiedProfileService unifiedProfileService;

    public UnifiedProfileController(UnifiedProfileService unifiedProfileService) {
        this.unifiedProfileService = unifiedProfileService;
    }

    @GetMapping
    @PreAuthorize(AuthorizationMatrix.UNIFIED_PROFILE_READ)
    @Operation(summary = "Liste paginée et filtrée des profils unifiés")
    public PageResponse<UnifiedProfileDTO> list(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String departementId,
            @RequestParam(required = false) String upId,
            @RequestParam(required = false) String grade,
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) String dossierStatus,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate recruitedFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate recruitedTo,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDirection,
            @RequestParam(required = false) Integer page,
            @RequestParam(required = false) Integer size,
            @AuthenticationPrincipal Jwt jwt) {
        AdvancedFilterRequest filter = buildFilter(search, role, departementId, upId, grade, statut,
                dossierStatus, isActive, recruitedFrom, recruitedTo, sortBy, sortDirection, page, size);
        return unifiedProfileService.getUnifiedProfiles(filter, CurrentUser.fromJwt(jwt));
    }

    @GetMapping("/departements")
    @PreAuthorize(AuthorizationMatrix.UNIFIED_PROFILE_READ)
    @Operation(summary = "Départements disponibles pour le filtre (selon le périmètre RBAC)")
    public List<DeptDTO> departements(@AuthenticationPrincipal Jwt jwt) {
        return unifiedProfileService.getDepartements(CurrentUser.fromJwt(jwt));
    }

    @GetMapping("/grades")
    @PreAuthorize(AuthorizationMatrix.UNIFIED_PROFILE_READ)
    @Operation(summary = "Grades distincts pour le filtre")
    public List<String> grades() {
        return unifiedProfileService.getGrades();
    }

    @GetMapping("/export")
    @PreAuthorize(AuthorizationMatrix.UNIFIED_PROFILE_EXPORT)
    @Operation(summary = "Export CSV des profils filtrés")
    public ResponseEntity<byte[]> export(
            @RequestParam(required = false) String search,
            @RequestParam(required = false) String role,
            @RequestParam(required = false) String departementId,
            @RequestParam(required = false) String upId,
            @RequestParam(required = false) String grade,
            @RequestParam(required = false) String statut,
            @RequestParam(required = false) String dossierStatus,
            @RequestParam(required = false) Boolean isActive,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate recruitedFrom,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate recruitedTo,
            @RequestParam(required = false) String sortBy,
            @RequestParam(required = false) String sortDirection,
            @AuthenticationPrincipal Jwt jwt) {
        AdvancedFilterRequest filter = buildFilter(search, role, departementId, upId, grade, statut,
                dossierStatus, isActive, recruitedFrom, recruitedTo, sortBy, sortDirection, 0, Integer.MAX_VALUE);
        byte[] csv = unifiedProfileService.exportCsv(filter, CurrentUser.fromJwt(jwt));
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"profils-unifies.csv\"")
                .contentType(new MediaType("text", "csv", StandardCharsets.UTF_8))
                .body(csv);
    }

    @SuppressWarnings("java:S107") // mapping direct des query params vers le DTO de filtre
    private AdvancedFilterRequest buildFilter(String search, String role, String departementId, String upId,
                                              String grade, String statut, String dossierStatus, Boolean isActive,
                                              LocalDate recruitedFrom, LocalDate recruitedTo, String sortBy,
                                              String sortDirection, Integer page, Integer size) {
        return AdvancedFilterRequest.builder()
                .search(search).role(role).departementId(departementId).upId(upId).grade(grade)
                .statut(statut).dossierStatus(dossierStatus).isActive(isActive)
                .recruitedFrom(recruitedFrom).recruitedTo(recruitedTo)
                .sortBy(sortBy).sortDirection(sortDirection).page(page).size(size)
                .build();
    }
}
