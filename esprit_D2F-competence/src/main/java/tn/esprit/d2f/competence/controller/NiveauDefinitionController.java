package tn.esprit.d2f.competence.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.d2f.competence.dto.NiveauSavoirRequisDTO;
import tn.esprit.d2f.competence.dto.NiveauSavoirRequisRequest;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.service.INiveauDefinitionService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/niveaux")
public class NiveauDefinitionController {

    @Autowired
    private INiveauDefinitionService niveauService;

    /** Tous les niveaux définis */
    @GetMapping
    public ResponseEntity<List<NiveauSavoirRequisDTO>> getAll() {
        return ResponseEntity.ok(niveauService.getAll());
    }

    /** Niveaux groupés par niveau pour une compétence */
    @GetMapping("/competence/{competenceId}")
    public ResponseEntity<Map<String, List<NiveauSavoirRequisDTO>>> getByCompetence(
            @PathVariable Long competenceId) {
        return ResponseEntity.ok(niveauService.getNiveauxByCompetence(competenceId));
    }

    /** Niveaux groupés par niveau pour une sous-compétence */
    @GetMapping("/sous-competence/{sousCompetenceId}")
    public ResponseEntity<Map<String, List<NiveauSavoirRequisDTO>>> getBySousCompetence(
            @PathVariable Long sousCompetenceId) {
        return ResponseEntity.ok(niveauService.getNiveauxBySousCompetence(sousCompetenceId));
    }

    /** Savoirs requis pour un niveau spécifique d'une compétence */
    @GetMapping("/competence/{competenceId}/niveau/{niveau}")
    public ResponseEntity<List<NiveauSavoirRequisDTO>> getByCompetenceAndNiveau(
            @PathVariable Long competenceId, @PathVariable NiveauMaitrise niveau) {
        return ResponseEntity.ok(niveauService.getSavoirsRequisByCompetenceAndNiveau(competenceId, niveau));
    }

    /** Savoirs requis pour un niveau spécifique d'une sous-compétence */
    @GetMapping("/sous-competence/{sousCompetenceId}/niveau/{niveau}")
    public ResponseEntity<List<NiveauSavoirRequisDTO>> getBySousCompetenceAndNiveau(
            @PathVariable Long sousCompetenceId, @PathVariable NiveauMaitrise niveau) {
        return ResponseEntity.ok(niveauService.getSavoirsRequisBySousCompetenceAndNiveau(sousCompetenceId, niveau));
    }

    /** Associer un savoir requis à un niveau */
    @PostMapping
    public ResponseEntity<NiveauSavoirRequisDTO> addSavoirRequis(
            @Valid @RequestBody NiveauSavoirRequisRequest request) {
        return new ResponseEntity<>(niveauService.addSavoirRequis(request), HttpStatus.CREATED);
    }

    /** Supprimer une association savoir-niveau */
    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removeSavoirRequis(@PathVariable Long id) {
        niveauService.removeSavoirRequis(id);
        return ResponseEntity.noContent().build();
    }
}
