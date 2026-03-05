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
import tn.esprit.d2f.competence.dto.DomaineDTO;
import tn.esprit.d2f.competence.dto.DomaineRequest;
import tn.esprit.d2f.competence.service.IDomaineService;

import java.util.List;

@Tag(name = "Domaines", description = "Gestion des domaines de compétences")
@RestController
@RequestMapping("/api/v1/domaines")
@RequiredArgsConstructor
public class DomaineController {

    private final IDomaineService domaineService;

    @Operation(summary = "Lister tous les domaines (paginé)")
    @GetMapping
    public ResponseEntity<Page<DomaineDTO>> getAllDomaines(
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(domaineService.getAllDomaines(pageable));
    }

    @Operation(summary = "Lister les domaines actifs")
    @GetMapping("/actifs")
    public ResponseEntity<List<DomaineDTO>> getDomainesActifs() {
        return ResponseEntity.ok(domaineService.getDomainesActifs());
    }

    @Operation(summary = "Obtenir un domaine par ID")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Domaine trouvé"),
        @ApiResponse(responseCode = "404", description = "Domaine introuvable")
    })
    @GetMapping("/{id}")
    public ResponseEntity<DomaineDTO> getDomaineById(@PathVariable Long id) {
        return ResponseEntity.ok(domaineService.getDomaineById(id));
    }

    @Operation(summary = "Obtenir un domaine par code")
    @GetMapping("/code/{code}")
    public ResponseEntity<DomaineDTO> getDomaineByCode(@PathVariable String code) {
        return ResponseEntity.ok(domaineService.getDomaineByCode(code));
    }

    @Operation(summary = "Rechercher des domaines par mot-clé (paginé)")
    @GetMapping("/search")
    public ResponseEntity<Page<DomaineDTO>> search(
            @RequestParam String keyword,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(domaineService.searchDomaines(keyword, pageable));
    }

    @Operation(summary = "Créer un nouveau domaine")
    @ApiResponses({
        @ApiResponse(responseCode = "201", description = "Domaine créé"),
        @ApiResponse(responseCode = "400", description = "Données invalides ou code déjà existant")
    })
    @PostMapping
    public ResponseEntity<DomaineDTO> createDomaine(@Valid @RequestBody DomaineRequest request) {
        return new ResponseEntity<>(domaineService.createDomaine(request), HttpStatus.CREATED);
    }

    @Operation(summary = "Mettre à jour un domaine")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Domaine mis à jour"),
        @ApiResponse(responseCode = "404", description = "Introuvable"),
        @ApiResponse(responseCode = "400", description = "Données invalides")
    })
    @PutMapping("/{id}")
    public ResponseEntity<DomaineDTO> updateDomaine(
            @PathVariable Long id,
            @Valid @RequestBody DomaineRequest request) {
        return ResponseEntity.ok(domaineService.updateDomaine(id, request));
    }

    @Operation(summary = "Supprimer un domaine")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDomaine(@PathVariable Long id) {
        domaineService.deleteDomaine(id);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Activer / désactiver un domaine")
    @PatchMapping("/{id}/toggle-actif")
    public ResponseEntity<DomaineDTO> toggleActif(@PathVariable Long id) {
        return ResponseEntity.ok(domaineService.toggleActif(id));
    }
}
