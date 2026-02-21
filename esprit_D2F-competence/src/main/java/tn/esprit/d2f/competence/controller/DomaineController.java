package tn.esprit.d2f.competence.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.d2f.competence.dto.DomaineDTO;
import tn.esprit.d2f.competence.entity.Domaine;
import tn.esprit.d2f.competence.service.IDomaineService;

import java.util.List;

@RestController
@RequestMapping("/domaines")
public class DomaineController {

    @Autowired
    private IDomaineService domaineService;

    @GetMapping
    public ResponseEntity<List<DomaineDTO>> getAllDomaines() {
        return ResponseEntity.ok(domaineService.getAllDomaines());
    }

    @GetMapping("/actifs")
    public ResponseEntity<List<DomaineDTO>> getDomainesActifs() {
        return ResponseEntity.ok(domaineService.getDomainesActifs());
    }

    @GetMapping("/{id}")
    public ResponseEntity<DomaineDTO> getDomaineById(@PathVariable Long id) {
        return ResponseEntity.ok(domaineService.getDomaineById(id));
    }

    @GetMapping("/code/{code}")
    public ResponseEntity<DomaineDTO> getDomaineByCode(@PathVariable String code) {
        return ResponseEntity.ok(domaineService.getDomaineByCode(code));
    }

    @PostMapping
    public ResponseEntity<DomaineDTO> createDomaine(@RequestBody Domaine domaine) {
        return new ResponseEntity<>(domaineService.createDomaine(domaine), HttpStatus.CREATED);
    }

    @PutMapping("/{id}")
    public ResponseEntity<DomaineDTO> updateDomaine(@PathVariable Long id, @RequestBody Domaine domaine) {
        return ResponseEntity.ok(domaineService.updateDomaine(id, domaine));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDomaine(@PathVariable Long id) {
        domaineService.deleteDomaine(id);
        return ResponseEntity.noContent().build();
    }

    @PatchMapping("/{id}/toggle-actif")
    public ResponseEntity<DomaineDTO> toggleActif(@PathVariable Long id) {
        return ResponseEntity.ok(domaineService.toggleActif(id));
    }
}
