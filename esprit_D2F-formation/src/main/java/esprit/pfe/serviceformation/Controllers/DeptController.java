package esprit.pfe.serviceformation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceformation.entities.Dept;
import esprit.pfe.serviceformation.services.DeptService;
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
@RequestMapping("/api/v1/departements")
@RequiredArgsConstructor
public class DeptController {
    private final DeptService deptService;

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
            deptService.importDeptsFromExcel(file);
            return ResponseEntity.ok("Import Dept réussi");
        } catch (Exception e) {
            return ResponseEntity.badRequest().body("Erreur import Dept : " + e.getMessage());
        }
    }

    @GetMapping
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_READ)
    public ResponseEntity<Page<Dept>> getAllDept(
            @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        return ResponseEntity.ok(deptService.findAll(pageable));
    }

    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_READ)
    public ResponseEntity<Dept> getDeptById(@PathVariable String id) {
        return ResponseEntity.ok(deptService.findById(id));
    }

    @PostMapping
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_WRITE)
    public ResponseEntity<Dept> createDept(@RequestBody Dept dept) {
        return ResponseEntity.ok(deptService.create(dept));
    }

    @PutMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_WRITE)
    public ResponseEntity<Dept> updateDept(@PathVariable String id, @RequestBody Dept dept) {
        return ResponseEntity.ok(deptService.update(id, dept));
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_WRITE)
    public ResponseEntity<Void> deleteDept(@PathVariable String id) {
        deptService.delete(id);
        return ResponseEntity.noContent().build();
    }
}

