package esprit.pfe.serviceformation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceformation.dto.FormationDTO;
import esprit.pfe.serviceformation.dto.InscriptionDTO;
import esprit.pfe.serviceformation.dto.InscriptionSummaryDTO;
import esprit.pfe.serviceformation.services.InscriptionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v1/inscription")
public class InscriptionController {

    private final InscriptionService service;

    public InscriptionController(InscriptionService service) {
        this.service = service;
    }

    @GetMapping("/formations/accessibles")
    @PreAuthorize(AuthorizationMatrix.INSCRIPTION_READ)
    public ResponseEntity<Page<FormationDTO>> getFormationsAccessibles(
            @RequestParam String enseignantId,
            @PageableDefault(size = 20, sort = "idFormation") Pageable pageable) {
        return ResponseEntity.ok(service.listerFormationsAccessibles(enseignantId, pageable));
    }

    @PostMapping("/inscriptions")
    @PreAuthorize(AuthorizationMatrix.INSCRIPTION_CREATE)
    public InscriptionDTO postInscription(
            @RequestParam Long formationId,
            @RequestParam String enseignantId) {
        return service.demanderInscriptionDTO(formationId, enseignantId);
    }

    @GetMapping("/formations/{formationId}/inscriptions")
    @PreAuthorize(AuthorizationMatrix.INSCRIPTION_READ)
    public ResponseEntity<Page<InscriptionDTO>> getInscriptionsByFormation(
            @PathVariable Long formationId,
            @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        return ResponseEntity.ok(service.listerInscriptionsParFormation(formationId, pageable));
    }

    @PutMapping("/inscriptions/{id}/traiter")
    @PreAuthorize(AuthorizationMatrix.INSCRIPTION_APPROVE)
    public InscriptionDTO traiter(
            @PathVariable Long id,
            @RequestParam boolean approuver) {
        return service.traiterDemandeDTO(id, approuver);
    }

    @GetMapping("/enseignant/{enseignantId}")
    @PreAuthorize(AuthorizationMatrix.INSCRIPTION_READ)
    public ResponseEntity<Page<InscriptionSummaryDTO>> getByEnseignant(
            @PathVariable String enseignantId,
            @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        return ResponseEntity.ok(service.findSummariesByEnseignantId(enseignantId, pageable));
    }
}
