package esprit.pfe.serviceformation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceformation.dto.DocumentDTO;
import esprit.pfe.serviceformation.entities.Document;
import esprit.pfe.serviceformation.services.DocumentMapper;
import esprit.pfe.serviceformation.services.DocumentService;
import esprit.pfe.serviceformation.utils.FileSecurityValidator;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import java.io.IOException;
import java.util.Arrays;
import java.util.List;
import java.util.Set;

@Slf4j
@RestController
@RequestMapping("/api/v1/documents")
@RequiredArgsConstructor
public class DocumentController {
    private final DocumentService service;

    private static final Set<String> ALLOWED_MIME_TYPES = Set.of(
            "application/pdf", "application/msword",
            "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            "application/vnd.ms-excel",
            "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            "image/jpeg", "image/png", "image/gif",
            "text/plain", "text/csv"
    );

    private static final long MAX_FILE_SIZE = 50L * 1024 * 1024; // 50 MB

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(AuthorizationMatrix.FORMATION_UPDATE)
    public ResponseEntity<Object> createDocument(
            @RequestParam Long formationId,
            @RequestParam String pathType,
            @RequestParam String nomDocument,
            @RequestParam boolean obligation,
            @RequestParam MultipartFile file) {

        // Validation defense-en-profondeur : taille, MIME, extension, magic bytes,
        // nom de fichier (path traversal, longueur, caracteres interdits).
        String validationError = FileSecurityValidator.validate(file, ALLOWED_MIME_TYPES, MAX_FILE_SIZE);
        if (validationError != null) {
            log.warn("Upload rejete pour formation {} : {}", formationId, validationError);
            return ResponseEntity.badRequest().body(validationError);
        }

        try {
            Document doc = service.createDocument(
                    formationId, pathType, nomDocument, obligation, file);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(DocumentMapper.mapToDTO(doc));
        } catch (Exception ex) {
            log.error("Erreur création document", ex);
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ex.getMessage());
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<DocumentDTO> getById(@PathVariable Long id) {
        try {
            Document doc = service.getById(id);
            return ResponseEntity.ok(DocumentMapper.mapToDTO(doc));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<Page<DocumentDTO>> getAll(
            @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        return ResponseEntity.ok(service.getAll(pageable).map(DocumentMapper::mapToDTO));
    }

    @PostMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(AuthorizationMatrix.FORMATION_UPDATE)
    public ResponseEntity<Object> updateDocument(
            @PathVariable Long id,
            @RequestParam String pathType,
            @RequestParam String nomDocument,
            @RequestParam boolean obligation,
            @RequestParam(required = false) MultipartFile file) throws IOException {
        if (file != null && !file.isEmpty()) {
            String validationError = FileSecurityValidator.validate(file, ALLOWED_MIME_TYPES, MAX_FILE_SIZE);
            if (validationError != null) {
                log.warn("Update document {} rejete : {}", id, validationError);
                return ResponseEntity.badRequest().body(validationError);
            }
        }
        try {
            Document doc = service.updateDocument(
                    id, pathType, nomDocument, obligation, file);
            return ResponseEntity.ok(DocumentMapper.mapToDTO(doc));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.FORMATION_DELETE)
    public ResponseEntity<Void> deleteDocument(@PathVariable Long id) {
        try {
            service.deleteDocument(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/download/{id}")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<byte[]> downloadDocument(@PathVariable Long id) {
        try {
            byte[] data = service.downloadDocumentFile(id);
            Document doc = service.getById(id);
            String filePath = doc.getFilePath();
            String fn = filePath.substring(filePath.lastIndexOf("/") + 1);

            return ResponseEntity.ok()
                    .contentType(MediaType.APPLICATION_OCTET_STREAM)
                    .header(HttpHeaders.CONTENT_DISPOSITION,
                            "attachment; filename=\"" + fn + "\"")
                    .body(data);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }
}
