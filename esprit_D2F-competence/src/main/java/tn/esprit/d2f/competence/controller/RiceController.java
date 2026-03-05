package tn.esprit.d2f.competence.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.responses.ApiResponses;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.d2f.competence.dto.RiceImportRequest;
import tn.esprit.d2f.competence.dto.RiceImportResult;
import tn.esprit.d2f.competence.service.IRiceImportService;

import java.util.List;

@Tag(name = "RICE Import", description = "Import de la structure RICE validée par l'IA")
@RestController
@RequestMapping("/api/v1/rice")
@RequiredArgsConstructor
public class RiceController {

    private final IRiceImportService riceImportService;

    @Operation(summary = "Importer la structure RICE complète",
               description = "Persiste l'éarborescence RICE validée (domaines, compétences, sous-compétences, savoirs)")
    @ApiResponses({
        @ApiResponse(responseCode = "200", description = "Import réussi"),
        @ApiResponse(responseCode = "400", description = "Données RICE invalides")
    })
    @PostMapping("/import")
    public ResponseEntity<RiceImportResult> importRice(
            @Valid @RequestBody RiceImportRequest request) {
        return ResponseEntity.ok(riceImportService.importRice(request));
    }

    @Operation(summary = "Historique des imports RICE")
    @GetMapping("/imports")
    public ResponseEntity<List<RiceImportResult>> getImportHistory() {
        return ResponseEntity.ok(riceImportService.getImportHistory());
    }
}
