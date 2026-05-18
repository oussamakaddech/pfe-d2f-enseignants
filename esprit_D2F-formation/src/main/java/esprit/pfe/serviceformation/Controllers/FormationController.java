package esprit.pfe.serviceformation.controllers;


import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.services.FormationService;
import esprit.d2f.common.security.AuthorizationMatrix;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.media.Content;
import io.swagger.v3.oas.annotations.media.Schema;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.security.SecurityRequirement;
import io.swagger.v3.oas.annotations.tags.Tag;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;

@RestController
@RequestMapping("/api/v1/formations")
@RequiredArgsConstructor
@Tag(name = "Formations", description = "Cycle de vie des formations enseignants ESPRIT")
@SecurityRequirement(name = "bearerAuth")
public class FormationController {
    private final FormationService formationService;

    @Operation(summary = "Créer une formation",
            description = "Réservé aux rôles ADMIN, CUP, D2F. Retourne la formation créée.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Formation créée",
                    content = @Content(schema = @Schema(implementation = Formation.class))),
            @ApiResponse(responseCode = "400", description = "Payload invalide"),
            @ApiResponse(responseCode = "401", description = "Non authentifié"),
            @ApiResponse(responseCode = "403", description = "Permissions insuffisantes")
    })
    @PostMapping
    @PreAuthorize(AuthorizationMatrix.FORMATION_CREATE)
    public ResponseEntity<Formation> createFormation(@RequestBody Formation formation){
        Formation savedFormation = formationService.createFormation(formation);
        return ResponseEntity.ok(savedFormation);
    }

    @Operation(summary = "Lister les formations (paginé)",
            description = "Page de formations. Accessible à tout utilisateur authentifié.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Page de formations"),
            @ApiResponse(responseCode = "401", description = "Non authentifié")
    })
    @GetMapping
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<Page<Formation>> getAllFormations(
            @Parameter(description = "Pagination (page, size, sort)") Pageable pageable){
        return ResponseEntity.ok(formationService.getAllFormations(pageable));
    }

    @Operation(summary = "Récupérer une formation par son id")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Formation trouvée"),
            @ApiResponse(responseCode = "404", description = "Formation inexistante")
    })
    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<Formation> getFormationById(
            @Parameter(description = "Identifiant interne", example = "42") @PathVariable Long id){
        return ResponseEntity.ok(formationService.getFormationById(id));
    }

    @Operation(summary = "Mettre à jour une formation",
            description = "Réservé aux rôles ADMIN, CUP, D2F, RESPONSABLE_DOSSIER.")
    @ApiResponses({
            @ApiResponse(responseCode = "200", description = "Formation mise à jour"),
            @ApiResponse(responseCode = "403", description = "Permissions insuffisantes"),
            @ApiResponse(responseCode = "404", description = "Formation inexistante")
    })
    @PutMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.FORMATION_UPDATE)
    public ResponseEntity<Formation> updateFormation(@PathVariable Long id, @RequestBody Formation formation){
        Formation updatedFormation = formationService.updateFormation(id, formation);
        return ResponseEntity.ok(updatedFormation);
    }

    @Operation(summary = "Supprimer une formation",
            description = "Réservé au rôle ADMIN.")
    @ApiResponses({
            @ApiResponse(responseCode = "204", description = "Suppression effectuée"),
            @ApiResponse(responseCode = "403", description = "Permissions insuffisantes"),
            @ApiResponse(responseCode = "404", description = "Formation inexistante")
    })
    @DeleteMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.FORMATION_DELETE)
    public ResponseEntity<Void> deleteFormation(@PathVariable Long id){
        formationService.deleteFormation(id);
        return ResponseEntity.noContent().build();
    }

}
