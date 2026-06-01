package esprit.pfe.serviceformation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceformation.dto.ReferentialMapper;
import esprit.pfe.serviceformation.dto.UpDTO;
import esprit.pfe.serviceformation.entities.Up;
import esprit.pfe.serviceformation.services.UpService;
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
@RequestMapping("/api/v1/ups")
@RequiredArgsConstructor
public class UpController {
    private final UpService upService;

    private static final Set<String> ALLOWED_EXCEL_MIME = Set.of(
        "application/vnd.ms-excel",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
    );
    private static final long MAX_EXCEL_SIZE = 20L * 1024 * 1024;

    @PostMapping("/import-excel")
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_IMPORT)
    public ResponseEntity<String> importExcel(@RequestParam("file") MultipartFile file) {
        String validationError = FileSecurityValidator.validate(file, ALLOWED_EXCEL_MIME, MAX_EXCEL_SIZE);
        if (validationError != null) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(validationError);
        }
        try {
            upService.importUpsFromExcel(file);
            return ResponseEntity.ok("Import UP réussi");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur import UP : " + e.getMessage());
        }
    }

    @GetMapping
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_READ)
    public ResponseEntity<Page<UpDTO>> getAllUp(
            @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        return ResponseEntity.ok(upService.findAll(pageable).map(ReferentialMapper::toUpDTO));
    }

    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_READ)
    public ResponseEntity<UpDTO> getUpById(@PathVariable String id) {
        return ResponseEntity.ok(ReferentialMapper.toUpDTO(upService.findById(id)));
    }

    @PostMapping
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_WRITE)
    public ResponseEntity<UpDTO> createUp(@RequestBody Up up) {
        return ResponseEntity.ok(ReferentialMapper.toUpDTO(upService.create(up)));
    }

    @PutMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_WRITE)
    public ResponseEntity<UpDTO> updateUp(@PathVariable String id, @RequestBody Up up) {
        return ResponseEntity.ok(ReferentialMapper.toUpDTO(upService.update(id, up)));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_WRITE)
    public ResponseEntity<Void> deleteUp(@PathVariable String id) {
        upService.delete(id);
        return ResponseEntity.noContent().build();
    }
}

