package tn.esprit.d2f.competence.controller;

import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import tn.esprit.d2f.competence.dto.RiceImportRequest;
import tn.esprit.d2f.competence.dto.RiceImportResult;
import tn.esprit.d2f.competence.service.IRiceImportService;

@RestController
@RequestMapping("/rice")
@RequiredArgsConstructor
public class RiceController {

    private final IRiceImportService riceImportService;

    /**
     * Persist the full validated RICE structure in the database.
     * Called after the administrator reviews and approves the AI proposals.
     *
     * POST /api/competence/rice/import
     */
    @PostMapping("/import")
    public ResponseEntity<RiceImportResult> importRice(
            @Valid @RequestBody RiceImportRequest request) {
        return ResponseEntity.ok(riceImportService.importRice(request));
    }
}
