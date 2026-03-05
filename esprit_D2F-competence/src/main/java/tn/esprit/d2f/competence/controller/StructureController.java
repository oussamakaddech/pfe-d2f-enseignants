package tn.esprit.d2f.competence.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.d2f.competence.dto.SearchResultDTO;
import tn.esprit.d2f.competence.dto.StructureArbreDTO;
import tn.esprit.d2f.competence.service.IStructureService;

@Tag(name = "Structure", description = "Consultation de l'arbre des compétences et recherche")
@RestController
@RequestMapping("/api/v1/structure")
@RequiredArgsConstructor
public class StructureController {

    private final IStructureService structureService;

    @Operation(summary = "Structure arborescente complète avec statistiques")
    @GetMapping("/arbre")
    public ResponseEntity<StructureArbreDTO> getStructureComplete() {
        return ResponseEntity.ok(structureService.getStructureComplete());
    }

    @Operation(summary = "Structure arborescente d'un domaine spécifique")
    @GetMapping("/arbre/domaine/{domaineId}")
    public ResponseEntity<StructureArbreDTO.DomaineArbreDTO> getStructureDomaine(
            @PathVariable Long domaineId) {
        return ResponseEntity.ok(structureService.getStructureDomaine(domaineId));
    }

    @Operation(summary = "Recherche globale par mot-clé (retourne domaines, compétences, sous-compétences, savoirs)")
    @GetMapping("/recherche")
    public ResponseEntity<SearchResultDTO> rechercheGlobale(@RequestParam String keyword) {
        return ResponseEntity.ok(structureService.rechercheGlobale(keyword));
    }

    @Operation(summary = "Recherche dans un domaine spécifique par mot-clé")
    @GetMapping("/recherche/domaine/{domaineId}")
    public ResponseEntity<SearchResultDTO> rechercheParDomaine(
            @PathVariable Long domaineId, @RequestParam String keyword) {
        return ResponseEntity.ok(structureService.rechercheParDomaine(domaineId, keyword));
    }
}
