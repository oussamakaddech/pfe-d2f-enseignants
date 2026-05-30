package esprit.pfe.serviceformation.controllers;



import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceformation.dto.FormationResponseDTO;
import esprit.pfe.serviceformation.dto.OneDriveItemDTO;
import esprit.pfe.serviceformation.microsoft.OneDriveService;
import esprit.pfe.serviceformation.services.FormationWorkflowService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
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
public class OneDriveController {
    private final OneDriveService oneDriveService;
    private final FormationWorkflowService formationService;
    @GetMapping("/hierarchy")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<Page<OneDriveItemDTO>> getDriveHierarchy(
            @PageableDefault(size = 50) Pageable pageable) {
        List<OneDriveItemDTO> all = oneDriveService.getDriveHierarchy();
        int from = (int) pageable.getOffset();
        int to = Math.min(from + pageable.getPageSize(), all.size());
        return ResponseEntity.ok(new PageImpl<>(from >= all.size() ? List.of() : all.subList(from, to), pageable, all.size()));
    }

    @GetMapping("/formations/{id}/hierarchy")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<Page<OneDriveItemDTO>> getHierarchyForFormation(
            @PathVariable Long id,
            @PageableDefault(size = 50) Pageable pageable) {
        FormationResponseDTO formation = formationService.getFormationWorkflowById(id);
        List<OneDriveItemDTO> all = oneDriveService.getFormationHierarchy(formation.getTitreFormation());
        int from = (int) pageable.getOffset();
        int to = Math.min(from + pageable.getPageSize(), all.size());
        return ResponseEntity.ok(new PageImpl<>(from >= all.size() ? List.of() : all.subList(from, to), pageable, all.size()));
    }

}

