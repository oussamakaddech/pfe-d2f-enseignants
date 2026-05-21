package esprit.pfe.serviceformation.controllers;



import esprit.pfe.serviceformation.dto.FormationDTO;
import esprit.pfe.serviceformation.dto.OneDriveItemDTO;
import esprit.pfe.serviceformation.microsoft.OneDriveService;
import esprit.pfe.serviceformation.services.FormationWorkflowService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;

import java.util.List;

@RestController
@RequestMapping("/api/v1/onedrive")
@RequiredArgsConstructor
@ConditionalOnProperty(name = "azure.ad.enabled", havingValue = "true")
public class OneDriveController {
    private final OneDriveService oneDriveService;
    private final FormationWorkflowService formationService;
    @GetMapping("/hierarchy")
    public ResponseEntity<List<OneDriveItemDTO>> getDriveHierarchy() {
        List<OneDriveItemDTO> hierarchy = oneDriveService.getDriveHierarchy();
        return ResponseEntity.ok(hierarchy);
    }

    @GetMapping("/formations/{id}/hierarchy")
    public ResponseEntity<List<OneDriveItemDTO>> getHierarchyForFormation(@PathVariable Long id) {

        // 1. Vérifier que la formation existe
        FormationDTO formation = formationService.getFormationWorkflowById(id);

        // 2. Récupérer l’arborescence limitée à cette formation
        List<OneDriveItemDTO> tree =
                oneDriveService.getFormationHierarchy(formation.getTitreFormation());

        return ResponseEntity.ok(tree);
    }

}

