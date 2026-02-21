package tn.esprit.d2f.competence.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.d2f.competence.dto.SavoirDTO;
import tn.esprit.d2f.competence.entity.Savoir;
import tn.esprit.d2f.competence.entity.enumerations.TypeSavoir;
import tn.esprit.d2f.competence.service.ISavoirService;

import java.util.List;

@RestController
@RequestMapping("/savoirs")
public class SavoirController {

    @Autowired
    private ISavoirService savoirService;

    @GetMapping
    public ResponseEntity<List<SavoirDTO>> getAllSavoirs() {
        return ResponseEntity.ok(savoirService.getAllSavoirs());
    }

    @GetMapping("/sous-competence/{sousCompetenceId}")
    public ResponseEntity<List<SavoirDTO>> getSavoirsBySousCompetence(@PathVariable Long sousCompetenceId) {
        return ResponseEntity.ok(savoirService.getSavoirsBySousCompetence(sousCompetenceId));
    }

    @GetMapping("/type/{type}")
    public ResponseEntity<List<SavoirDTO>> getSavoirsByType(@PathVariable TypeSavoir type) {
        return ResponseEntity.ok(savoirService.getSavoirsByType(type));
    }

    @GetMapping("/{id}")
    public ResponseEntity<SavoirDTO> getSavoirById(@PathVariable Long id) {
        return ResponseEntity.ok(savoirService.getSavoirById(id));
    }

    @PostMapping("/sous-competence/{sousCompetenceId}")
    public ResponseEntity<SavoirDTO> createSavoir(@PathVariable Long sousCompetenceId, @RequestBody Savoir savoir) {
        return new ResponseEntity<>(savoirService.createSavoir(sousCompetenceId, savoir), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<SavoirDTO> updateSavoir(@PathVariable Long id, @RequestBody Savoir savoir) {
        return ResponseEntity.ok(savoirService.updateSavoir(id, savoir));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSavoir(@PathVariable Long id) {
        savoirService.deleteSavoir(id);
        return ResponseEntity.noContent().build();
    }
}
