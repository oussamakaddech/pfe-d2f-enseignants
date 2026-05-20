package tn.esprit.d2f.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.d2f.dto.BesoinCompetenceDTO;
import tn.esprit.d2f.service.IBesoinCompetenceService;

import java.util.List;

@Tag(name = "Besoin Compétences", description = "Compétences et savoirs associés à un besoin de formation")
@RestController
@RequestMapping("/api/v1/besoins-formations/{besoinId}/competences")
@RequiredArgsConstructor
public class BesoinCompetenceController {

    private final IBesoinCompetenceService service;

    @Operation(summary = "Récupérer les compétences liées à un besoin")
    @GetMapping
    public ResponseEntity<List<BesoinCompetenceDTO>> getByBesoin(@PathVariable Long besoinId) {
        return ResponseEntity.ok(service.getByBesoin(besoinId));
    }

    @Operation(summary = "Remplacer toutes les compétences d'un besoin")
    @PutMapping
    public ResponseEntity<List<BesoinCompetenceDTO>> replaceAll(
            @PathVariable Long besoinId,
            @RequestBody List<BesoinCompetenceDTO> links) {
        return ResponseEntity.ok(service.replaceAll(besoinId, links));
    }
}
