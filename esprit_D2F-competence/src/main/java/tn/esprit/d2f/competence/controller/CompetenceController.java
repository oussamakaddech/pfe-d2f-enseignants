package tn.esprit.d2f.competence.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.d2f.competence.dto.CompetenceDTO;
import tn.esprit.d2f.competence.entity.Competence;
import tn.esprit.d2f.competence.service.ICompetenceService;

import java.util.List;

@RestController
@RequestMapping("/competences")
public class CompetenceController {

    @Autowired
    private ICompetenceService competenceService;

    @GetMapping
    public ResponseEntity<List<CompetenceDTO>> getAllCompetences() {
        return ResponseEntity.ok(competenceService.getAllCompetences());
    }

    @GetMapping("/domaine/{domaineId}")
    public ResponseEntity<List<CompetenceDTO>> getCompetencesByDomaine(@PathVariable Long domaineId) {
        return ResponseEntity.ok(competenceService.getCompetencesByDomaine(domaineId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CompetenceDTO> getCompetenceById(@PathVariable Long id) {
        return ResponseEntity.ok(competenceService.getCompetenceById(id));
    }

    @PostMapping("/domaine/{domaineId}")
    public ResponseEntity<CompetenceDTO> createCompetence(@PathVariable Long domaineId, @RequestBody Competence competence) {
        return new ResponseEntity<>(competenceService.createCompetence(domaineId, competence), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<CompetenceDTO> updateCompetence(@PathVariable Long id, @RequestBody Competence competence) {
        return ResponseEntity.ok(competenceService.updateCompetence(id, competence));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteCompetence(@PathVariable Long id) {
        competenceService.deleteCompetence(id);
        return ResponseEntity.noContent().build();
    }
}
