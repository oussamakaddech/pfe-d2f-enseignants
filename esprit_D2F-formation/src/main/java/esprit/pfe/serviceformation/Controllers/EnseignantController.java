package esprit.pfe.serviceformation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceformation.dto.EnseignantDTO;
import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.services.EnseignantExcelService;
import esprit.pfe.serviceformation.services.EnseignantService;
import esprit.pfe.serviceformation.utils.FileSecurityValidator;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import java.util.Set;

@RestController
@RequestMapping("/api/v1/enseignants")
@RequiredArgsConstructor
public class EnseignantController {
    private final EnseignantExcelService excelService;
    private final EnseignantService enseignantService;

    private static final Set<String> ALLOWED_EXCEL_MIME = Set.of(
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    private static final long MAX_EXCEL_SIZE = 20L * 1024 * 1024;

    @GetMapping
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_READ)
    public ResponseEntity<Page<EnseignantDTO>> getAllEnseignants(
            @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        return ResponseEntity.ok(enseignantService.getAllEnseignantsDTO(pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_READ)
    public ResponseEntity<Enseignant> getEnseignantById(@PathVariable String id) {
        return ResponseEntity.ok(enseignantService.getEnseignantById(id));
    }

    @PostMapping
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_WRITE)
    public ResponseEntity<Enseignant> createEnseignant(@RequestBody Enseignant enseignant) {
        return ResponseEntity.ok(enseignantService.createEnseignant(enseignant));
    }

    @PutMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_WRITE)
    public ResponseEntity<Enseignant> updateEnseignant(@PathVariable String id, @RequestBody Enseignant enseignant) {
        return ResponseEntity.ok(enseignantService.updateEnseignant(id, enseignant));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_WRITE)
    public ResponseEntity<Void> deleteEnseignant(@PathVariable String id) {
        enseignantService.deleteEnseignant(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/upload")
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_IMPORT)
    public ResponseEntity<String> uploadEnseignants(@RequestParam("file") MultipartFile file) {
        String validationError = FileSecurityValidator.validate(file, ALLOWED_EXCEL_MIME, MAX_EXCEL_SIZE);
        if (validationError != null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(validationError);
        }
        try {
            excelService.importEnseignantsFromExcel(file);
            return ResponseEntity.ok("Import des enseignants réussi");
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body("Erreur import Enseignants : " + e.getMessage());
        }
    }
}
