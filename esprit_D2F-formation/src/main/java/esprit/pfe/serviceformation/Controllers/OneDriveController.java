package esprit.pfe.serviceformation.Controllers;



import esprit.pfe.serviceformation.DTO.FormationDTO;
import esprit.pfe.serviceformation.DTO.OneDriveItemDTO;
import esprit.pfe.serviceformation.Entities.Formation;
import esprit.pfe.serviceformation.Microsoft.OneDriveService;
import esprit.pfe.serviceformation.Services.FormationWorkflowService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/onedrive")
public class OneDriveController {

    @Autowired
    private OneDriveService oneDriveService;
    @Autowired
    private FormationWorkflowService formationService;
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
