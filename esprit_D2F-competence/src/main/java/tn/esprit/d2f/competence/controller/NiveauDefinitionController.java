package tn.esprit.d2f.competence.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.d2f.competence.dto.NiveauSavoirRequisDTO;
import tn.esprit.d2f.competence.dto.NiveauSavoirRequisRequest;
import tn.esprit.d2f.competence.dto.NiveauxGroupesDTO;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.service.INiveauDefinitionService;

import java.util.List;

@Tag(name = "Niveaux & Savoirs Requis", description = "Définition des niveaux de maîtrise requis par compétence")
@RestController
@RequestMapping("/api/v1/niveaux")
@RequiredArgsConstructor
public class NiveauDefinitionController {

    private final INiveauDefinitionService niveauService;

    @Operation(summary = "Tous les savoirs requis définis")
    @GetMapping
    public ResponseEntity<List<NiveauSavoirRequisDTO>> getAll() {
        return ResponseEntity.ok(niveauService.getAll());
    }

    @Operation(summary = "Savoirs requis groupés par niveau pour une compétence")
    @GetMapping("/competence/{competenceId}")
    public ResponseEntity<NiveauxGroupesDTO> getByCompetence(@PathVariable Long competenceId) {
        return ResponseEntity.ok(niveauService.getNiveauxByCompetence(competenceId));
    }

    @Operation(summary = "Savoirs requis groupés par niveau pour une sous-compétence")
    @GetMapping("/sous-competence/{sousCompetenceId}")
    public ResponseEntity<NiveauxGroupesDTO> getBySousCompetence(@PathVariable Long sousCompetenceId) {
        return ResponseEntity.ok(niveauService.getNiveauxBySousCompetence(sousCompetenceId));
    }

    @Operation(summary = "Savoirs requis pour un niveau spécifique d'une compétence")
    @GetMapping("/competence/{competenceId}/niveau/{niveau}")
    public ResponseEntity<List<NiveauSavoirRequisDTO>> getByCompetenceAndNiveau(
            @PathVariable Long competenceId, @PathVariable NiveauMaitrise niveau) {
        return ResponseEntity.ok(niveauService.getSavoirsRequisByCompetenceAndNiveau(competenceId, niveau));
    }

    @Operation(summary = "Savoirs requis pour un niveau spécifique d'une sous-compétence")
    @GetMapping("/sous-competence/{sousCompetenceId}/niveau/{niveau}")
    public ResponseEntity<List<NiveauSavoirRequisDTO>> getBySousCompetenceAndNiveau(
            @PathVariable Long sousCompetenceId, @PathVariable NiveauMaitrise niveau) {
        return ResponseEntity.ok(niveauService.getSavoirsRequisBySousCompetenceAndNiveau(sousCompetenceId, niveau));
    }

    @Operation(summary = "Associer un savoir requis à un niveau")
    @PostMapping
    public ResponseEntity<NiveauSavoirRequisDTO> addSavoirRequis(
            @Valid @RequestBody NiveauSavoirRequisRequest request) {
        return new ResponseEntity<>(niveauService.addSavoirRequis(request), HttpStatus.CREATED);
    }

    @Operation(summary = "Mettre à jour une association savoir-niveau")
    @PutMapping("/{id}")
    public ResponseEntity<NiveauSavoirRequisDTO> updateSavoirRequis(
            @PathVariable Long id,
            @Valid @RequestBody NiveauSavoirRequisRequest request) {
        return ResponseEntity.ok(niveauService.updateSavoirRequis(id, request));
    }

    @Operation(summary = "Supprimer une association savoir-niveau")
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removeSavoirRequis(@PathVariable Long id) {
        niveauService.removeSavoirRequis(id);
        return ResponseEntity.noContent().build();
    }
}
