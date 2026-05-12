package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.dto.DocumentDTO;
import esprit.pfe.serviceformation.entities.Document;
import esprit.pfe.serviceformation.services.DocumentMapper;
import esprit.pfe.serviceformation.services.DocumentService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;
import lombok.RequiredArgsConstructor;

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

    private static final long MAX_FILE_SIZE = 50 * 1024 * 1024; // 50 MB

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<Object> createDocument(
            @RequestParam Long formationId,
            @RequestParam String pathType,
            @RequestParam String nomDocument,
            @RequestParam boolean obligation,
            @RequestParam MultipartFile file) {

        if (file.getSize() > MAX_FILE_SIZE) {
            return ResponseEntity.badRequest().body(
                    "Fichier trop volumineux : " + file.getSize()
                    + " octets. Maximum : " + MAX_FILE_SIZE + " octets.");
        }

        String contentType = file.getContentType();
        if (contentType == null || !ALLOWED_MIME_TYPES.contains(contentType)) {
            return ResponseEntity.badRequest().body(
                    "Type de fichier non autorisé : " + contentType
                    + ". Types autorisés : PDF, DOC, DOCX, XLS, XLSX, JPG, PNG, GIF, TXT, CSV");
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
    public ResponseEntity<DocumentDTO> getById(@PathVariable Long id) {
        try {
            Document doc = service.getById(id);
            return ResponseEntity.ok(DocumentMapper.mapToDTO(doc));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping
    public ResponseEntity<List<DocumentDTO>> getAll() {
        List<DocumentDTO> dtos = service.getAll()
                .stream()
                .map(DocumentMapper::mapToDTO)
                .toList();
        return ResponseEntity.ok(dtos);
    }

    @PostMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentDTO> updateDocument(
            @PathVariable Long id,
            @RequestParam String pathType,
            @RequestParam String nomDocument,
            @RequestParam boolean obligation,
            @RequestParam(required = false) MultipartFile file) throws IOException {
        try {
            Document doc = service.updateDocument(
                    id, pathType, nomDocument, obligation, file);
            return ResponseEntity.ok(DocumentMapper.mapToDTO(doc));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDocument(@PathVariable Long id) {
        try {
            service.deleteDocument(id);
            return ResponseEntity.noContent().build();
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        }
    }

    @GetMapping("/download/{id}")
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
