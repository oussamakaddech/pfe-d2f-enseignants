package tn.esprit.d2f.competence.controller;

import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.d2f.competence.dto.EnseignantCompetenceDTO;
import tn.esprit.d2f.competence.dto.EnseignantCompetenceRequest;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.service.IEnseignantCompetenceService;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/enseignant-competences")
public class EnseignantCompetenceController {

    @Autowired
    private IEnseignantCompetenceService enseignantCompetenceService;

    @GetMapping("/enseignant/{enseignantId}")
    public ResponseEntity<List<EnseignantCompetenceDTO>> getByEnseignant(@PathVariable String enseignantId) {
        return ResponseEntity.ok(enseignantCompetenceService.getCompetencesByEnseignant(enseignantId));
    }

    @GetMapping("/enseignant/{enseignantId}/domaine/{domaineId}")
    public ResponseEntity<List<EnseignantCompetenceDTO>> getByEnseignantAndDomaine(
            @PathVariable String enseignantId, @PathVariable Long domaineId) {
        return ResponseEntity.ok(enseignantCompetenceService.getCompetencesByEnseignantAndDomaine(enseignantId, domaineId));
    }

    @GetMapping("/enseignant/{enseignantId}/competence/{competenceId}")
    public ResponseEntity<List<EnseignantCompetenceDTO>> getByEnseignantAndCompetence(
            @PathVariable String enseignantId, @PathVariable Long competenceId) {
        return ResponseEntity.ok(enseignantCompetenceService.getCompetencesByEnseignantAndCompetence(enseignantId, competenceId));
    }

    @GetMapping("/enseignant/{enseignantId}/niveau/{niveau}")
    public ResponseEntity<List<EnseignantCompetenceDTO>> getByEnseignantAndNiveau(
            @PathVariable String enseignantId, @PathVariable NiveauMaitrise niveau) {
        return ResponseEntity.ok(enseignantCompetenceService.getCompetencesByEnseignantAndNiveau(enseignantId, niveau));
    }

    @GetMapping("/enseignant/{enseignantId}/count")
    public ResponseEntity<Map<String, Object>> countByEnseignant(@PathVariable String enseignantId) {
        long count = enseignantCompetenceService.countCompetences(enseignantId);
        return ResponseEntity.ok(Map.of("enseignantId", enseignantId, "count", count));
    }

    @PostMapping
    public ResponseEntity<EnseignantCompetenceDTO> assignCompetence(@Valid @RequestBody EnseignantCompetenceRequest request) {
        return new ResponseEntity<>(enseignantCompetenceService.assignCompetence(request), HttpStatus.CREATED);
    }

    @PatchMapping("/{id}/niveau")
    public ResponseEntity<EnseignantCompetenceDTO> updateNiveau(
            @PathVariable Long id, @RequestParam NiveauMaitrise niveau) {
        return ResponseEntity.ok(enseignantCompetenceService.updateNiveau(id, niveau));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> removeCompetence(@PathVariable Long id) {
        enseignantCompetenceService.removeCompetence(id);
        return ResponseEntity.noContent().build();
    }
}
