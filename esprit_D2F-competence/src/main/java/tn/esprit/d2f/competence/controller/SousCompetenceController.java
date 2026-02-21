package tn.esprit.d2f.competence.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.d2f.competence.dto.SousCompetenceDTO;
import tn.esprit.d2f.competence.entity.SousCompetence;
import tn.esprit.d2f.competence.service.ISousCompetenceService;

import java.util.List;

@RestController
@RequestMapping("/sous-competences")
public class SousCompetenceController {

    @Autowired
    private ISousCompetenceService sousCompetenceService;

    @GetMapping
    public ResponseEntity<List<SousCompetenceDTO>> getAllSousCompetences() {
        return ResponseEntity.ok(sousCompetenceService.getAllSousCompetences());
    }

    @GetMapping("/competence/{competenceId}")
    public ResponseEntity<List<SousCompetenceDTO>> getSousCompetencesByCompetence(@PathVariable Long competenceId) {
        return ResponseEntity.ok(sousCompetenceService.getSousCompetencesByCompetence(competenceId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SousCompetenceDTO> getSousCompetenceById(@PathVariable Long id) {
        return ResponseEntity.ok(sousCompetenceService.getSousCompetenceById(id));
    }

    @PostMapping("/competence/{competenceId}")
    public ResponseEntity<SousCompetenceDTO> createSousCompetence(@PathVariable Long competenceId, @RequestBody SousCompetence sousCompetence) {
        return new ResponseEntity<>(sousCompetenceService.createSousCompetence(competenceId, sousCompetence), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<SousCompetenceDTO> updateSousCompetence(@PathVariable Long id, @RequestBody SousCompetence sousCompetence) {
        return ResponseEntity.ok(sousCompetenceService.updateSousCompetence(id, sousCompetence));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSousCompetence(@PathVariable Long id) {
        sousCompetenceService.deleteSousCompetence(id);
        return ResponseEntity.noContent().build();
    }
}
