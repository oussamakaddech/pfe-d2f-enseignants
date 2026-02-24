package tn.esprit.d2f.competence.controller;

import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.d2f.competence.dto.StructureArbreDTO;
import tn.esprit.d2f.competence.service.IStructureService;

import java.util.Map;

@RestController
@RequestMapping("/structure")
public class StructureController {

    @Autowired
    private IStructureService structureService;

    /** Structure arborescente complète avec statistiques */
    @GetMapping("/arbre")
    public ResponseEntity<StructureArbreDTO> getStructureComplete() {
        return ResponseEntity.ok(structureService.getStructureComplete());
    }

    /** Structure arborescente d'un domaine spécifique */
    @GetMapping("/arbre/domaine/{domaineId}")
    public ResponseEntity<StructureArbreDTO.DomaineArbreDTO> getStructureDomaine(
            @PathVariable Long domaineId) {
        return ResponseEntity.ok(structureService.getStructureDomaine(domaineId));
    }

    /** Recherche globale par mot-clé */
    @GetMapping("/recherche")
    public ResponseEntity<Map<String, Object>> rechercheGlobale(@RequestParam String keyword) {
        return ResponseEntity.ok(structureService.rechercheGlobale(keyword));
    }

    /** Recherche dans un domaine spécifique */
    @GetMapping("/recherche/domaine/{domaineId}")
    public ResponseEntity<Map<String, Object>> rechercheParDomaine(
            @PathVariable Long domaineId, @RequestParam String keyword) {
        return ResponseEntity.ok(structureService.rechercheParDomaine(domaineId, keyword));
    }
}
