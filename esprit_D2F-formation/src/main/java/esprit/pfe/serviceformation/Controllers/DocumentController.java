package esprit.pfe.serviceformation.Controllers;

import esprit.pfe.serviceformation.DTO.DocumentDTO;
import esprit.pfe.serviceformation.Entities.Document;
import esprit.pfe.serviceformation.Entities.DriveSubPath;
import esprit.pfe.serviceformation.Services.DocumentMapper;
import esprit.pfe.serviceformation.Services.DocumentService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.List;
import java.util.stream.Collectors;
@Slf4j
@RestController
@RequestMapping("/documents")
public class DocumentController {

    @Autowired
    private DocumentService service;

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<?> createDocument(
            @RequestParam Long formationId,
            @RequestParam String pathType,
            @RequestParam String nomDocument,
            @RequestParam boolean obligation,
            @RequestParam MultipartFile file) {

        try {
            Document doc = service.createDocument(
                    formationId, pathType, nomDocument, obligation, file);

            return ResponseEntity
                    .status(HttpStatus.CREATED)
                    .body(DocumentMapper.mapToDTO(doc));
        } catch (Exception ex) {
            // log pour le back-office
            log.error("Erreur création document", ex);
            // réponse lisible pour le front
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(ex.getMessage());
        }
    }
    @GetMapping("/{id}")
    public ResponseEntity<DocumentDTO> getById(@PathVariable Long id) {
        Document doc = service.getById(id);
        return ResponseEntity.ok(DocumentMapper.mapToDTO(doc));
    }

    @GetMapping
    public ResponseEntity<List<DocumentDTO>> getAll() {
        List<DocumentDTO> dtos = service.getAll()
                .stream()
                .map(DocumentMapper::mapToDTO)
                .collect(Collectors.toList());
        return ResponseEntity.ok(dtos);
    }

    @PutMapping(value = "/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<DocumentDTO> updateDocument(
            @PathVariable Long id,
            @RequestParam String pathType,
            @RequestParam String nomDocument,
            @RequestParam boolean obligation,
            @RequestParam(required = false) MultipartFile file
    ) throws IOException {
        Document doc = service.updateDocument(
                id, pathType, nomDocument, obligation, file
        );
        return ResponseEntity.ok(DocumentMapper.mapToDTO(doc));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteDocument(@PathVariable Long id) {
        service.deleteDocument(id);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/download/{id}")
    public ResponseEntity<byte[]> downloadDocument(@PathVariable Long id) {
        byte[] data = service.downloadDocumentFile(id);
        Document doc = service.getById(id);
        String fn = doc.getFilePath()
                .substring(doc.getFilePath().lastIndexOf("/") + 1);

        return ResponseEntity.ok()
                .contentType(MediaType.APPLICATION_OCTET_STREAM)
                .header(HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + fn + "\"")
                .body(data);
    }
}
