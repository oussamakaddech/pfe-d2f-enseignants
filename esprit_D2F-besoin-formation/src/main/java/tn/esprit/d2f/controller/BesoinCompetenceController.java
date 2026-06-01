package tn.esprit.d2f.controller;

import esprit.d2f.common.security.AuthorizationMatrix;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import tn.esprit.d2f.dto.BesoinCompetenceDTO;
import tn.esprit.d2f.dto.PageResponse;
import tn.esprit.d2f.service.IBesoinCompetenceService;

import java.util.List;

@Tag(name = "Besoin Compétences", description = "Compétences et savoirs associés à un besoin de formation")
@RestController
@RequestMapping("/api/v1/besoins-formations/{besoinId}/competences")
@RequiredArgsConstructor
public class BesoinCompetenceController {

    private final IBesoinCompetenceService service;

    @Operation(
        summary = "Récupérer les compétences liées à un besoin (paginé)",
        description = "Retourne la liste paginée des compétences/savoirs associés au besoin donné."
    )
    @ApiResponse(responseCode = "200", description = "Liste des compétences")
    @ApiResponse(responseCode = "400", description = "Paramètres de pagination invalides")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Permissions insuffisantes")
    @ApiResponse(responseCode = "404", description = "Besoin introuvable")
    @GetMapping
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_READ_ALL)
    public ResponseEntity<PageResponse<BesoinCompetenceDTO>> getByBesoin(
            @Parameter(description = "Identifiant du besoin de formation") @PathVariable Long besoinId,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(PageResponse.of(service.getByBesoin(besoinId, pageable)));
    }

    @Operation(
        summary = "Remplacer toutes les compétences d'un besoin",
        description = "Supprime les compétences existantes et les remplace par la liste fournie (idempotent)."
    )
    @ApiResponse(responseCode = "200", description = "Compétences remplacées avec succès")
    @ApiResponse(responseCode = "400", description = "Corps de la requête invalide")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Réservé à ADMIN ou D2F")
    @ApiResponse(responseCode = "404", description = "Besoin introuvable")
    @PutMapping
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_UPDATE)
    public ResponseEntity<List<BesoinCompetenceDTO>> replaceAll(
            @Parameter(description = "Identifiant du besoin de formation") @PathVariable Long besoinId,
            @RequestBody List<BesoinCompetenceDTO> links) {
        return ResponseEntity.ok(service.replaceAll(besoinId, links));
    }
}
