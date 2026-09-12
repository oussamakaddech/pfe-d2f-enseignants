package esprit.pfe.serviceformation.controllers;



import esprit.pfe.serviceformation.dto.FormationResponseDTO;
import esprit.pfe.serviceformation.dto.OneDriveItemDTO;
import esprit.pfe.serviceformation.microsoft.OneDriveService;
import esprit.pfe.serviceformation.services.FormationWorkflowService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import esprit.d2f.common.security.AuthorizationMatrix;
import lombok.RequiredArgsConstructor;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import java.util.List;

@RestController
@RequestMapping("/api/v1/onedrive")
@RequiredArgsConstructor
@ConditionalOnProperty(name = "azure.ad.enabled", havingValue = "true")
@PreAuthorize(AuthorizationMatrix.FORMATION_READ)
public class OneDriveController {
    private final OneDriveService oneDriveService;
    private final FormationWorkflowService formationService;
    @GetMapping("/hierarchy")
    public ResponseEntity<Page<OneDriveItemDTO>> getDriveHierarchy(
            @PageableDefault(size = 50) Pageable pageable) {
        List<OneDriveItemDTO> all = oneDriveService.getDriveHierarchy();
        int from = (int) pageable.getOffset();
        int to = Math.min(from + pageable.getPageSize(), all.size());
        return ResponseEntity.ok(new PageImpl<>(from >= all.size() ? List.of() : all.subList(from, to), pageable, all.size()));
    }

    @GetMapping("/formations/{id}/hierarchy")
    public ResponseEntity<Page<OneDriveItemDTO>> getHierarchyForFormation(
            @PathVariable Long id,
            @PageableDefault(size = 50) Pageable pageable) {
        FormationResponseDTO formation = formationService.getFormationWorkflowById(id);
        List<OneDriveItemDTO> all = oneDriveService.getFormationHierarchy(formation.getTitreFormation());
        int from = (int) pageable.getOffset();
        int to = Math.min(from + pageable.getPageSize(), all.size());
        return ResponseEntity.ok(new PageImpl<>(from >= all.size() ? List.of() : all.subList(from, to), pageable, all.size()));
    }

    /**
     * Télécharge un fichier : d2F/{formation}/{pathType}/{nomDocument}/{originalFileName}.
     * Consommé par le front (OneDriveService.downloadFile).
     */
    @GetMapping("/download")
    public ResponseEntity<byte[]> downloadFile(
            @RequestParam String nomFormation,
            @RequestParam String nomDocument,
            @RequestParam String originalFileName,
            @RequestParam(required = false, defaultValue = "documents") String pathType) {
        byte[] content = oneDriveService.downloadDocument(nomFormation, pathType, nomDocument, originalFileName);
        return ResponseEntity.ok()
                .header(org.springframework.http.HttpHeaders.CONTENT_DISPOSITION,
                        "attachment; filename=\"" + originalFileName.replace("\"", "") + "\"")
                .contentType(org.springframework.http.MediaType.APPLICATION_OCTET_STREAM)
                .body(content);
    }

    /**
     * Supprime un fichier. Consommé par le front (OneDriveService.deleteFile).
     */
    @DeleteMapping("/delete")
    public ResponseEntity<Void> deleteFile(
            @RequestParam String nomFormation,
            @RequestParam String nomDocument,
            @RequestParam String originalFileName,
            @RequestParam(required = false, defaultValue = "documents") String pathType) {
        oneDriveService.deleteDocument(nomFormation, pathType, nomDocument, originalFileName);
        return ResponseEntity.noContent().build();
    }

    /**
     * Lien d'aperçu anonyme du premier fichier du dossier.
     * Consommé par le front (OneDriveService.getEmbedLink).
     */
    @GetMapping("/embed-link")
    public ResponseEntity<java.util.Map<String, String>> getEmbedLink(
            @RequestParam(name = "formation") String nomFormation,
            @RequestParam(name = "document") String nomDocument,
            @RequestParam(required = false, defaultValue = "documents") String pathType) {
        String url = oneDriveService.getEmbedLink(nomFormation, pathType, nomDocument);
        return ResponseEntity.ok(java.util.Map.of("url", url));
    }

}

