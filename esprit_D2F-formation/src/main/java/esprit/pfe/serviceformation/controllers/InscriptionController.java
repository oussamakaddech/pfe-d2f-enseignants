package esprit.pfe.serviceformation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceformation.dto.FormationResponseDTO;
import esprit.pfe.serviceformation.dto.InscriptionDTO;
import esprit.pfe.serviceformation.dto.InscriptionSummaryDTO;
import esprit.pfe.serviceformation.dto.TraiterDemandeBulkRequest;
import esprit.pfe.serviceformation.services.InscriptionService;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/v1/inscription")
public class InscriptionController {

    private final InscriptionService service;

    public InscriptionController(InscriptionService service) {
        this.service = service;
    }

    @GetMapping("/formations/accessibles")
    @PreAuthorize(AuthorizationMatrix.INSCRIPTION_READ)
    public ResponseEntity<Page<FormationResponseDTO>> getFormationsAccessibles(
            @RequestParam String enseignantId,
            @PageableDefault(size = 20, sort = "idFormation") Pageable pageable) {
        return ResponseEntity.ok(service.listerFormationsAccessibles(enseignantId, pageable));
    }

    @PostMapping("/inscriptions")
    @PreAuthorize(AuthorizationMatrix.INSCRIPTION_CREATE)
    @ResponseStatus(HttpStatus.CREATED)
    public InscriptionDTO postInscription(
            @RequestParam Long formationId,
            @RequestParam String enseignantId) {
        return service.demanderInscriptionDTO(formationId, enseignantId);
    }

    /**
     * Vue globale (ADMIN / CUP / D2F) : toutes les inscriptions, paginées.
     * Alimente la page de suivi des inscriptions (compteurs + listes).
     */
    @GetMapping("/inscriptions")
    @PreAuthorize(AuthorizationMatrix.INSCRIPTION_APPROVE)
    public ResponseEntity<Page<InscriptionDTO>> getAllInscriptions(
            @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        return ResponseEntity.ok(service.listerToutesInscriptions(pageable));
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
            @RequestParam boolean approuver,
            @RequestParam(required = false) String motif) {
        return service.traiterDemandeDTO(id, approuver, motif);
    }

    /**
     * P3 - F4 : traitement en lot d'un ensemble de demandes. Body JSON :
     * <pre>{"ids":[1,2,3],"approuver":true,"motif":null}</pre>
     * Le motif n'est appliqué que lorsque {@code approuver=false}. Retourne la
     * liste des inscriptions effectivement mises à jour (les ids inexistants
     * sont ignorés).
     */
    @PutMapping("/inscriptions/traiter-bulk")
    @PreAuthorize(AuthorizationMatrix.INSCRIPTION_APPROVE)
    public ResponseEntity<List<InscriptionDTO>> traiterBulk(
            @RequestBody TraiterDemandeBulkRequest body) {
        List<InscriptionDTO> updated = service.traiterDemandeBulkDTO(
                body == null ? null : body.getIds(),
                body != null && body.isApprouver(),
                body == null ? null : body.getMotif());
        return ResponseEntity.ok(updated);
    }

    /**
     * Annulation par l'enseignant propriétaire d'une demande PENDING.
     * L'enseignantId (id fonctionnel ou email) est obligatoire côté service pour
     * vérifier la propriété ; on le passe en query param pour rester homogène
     * avec les autres endpoints d'inscription.
     */
    @DeleteMapping("/inscriptions/{id}")
    @PreAuthorize(AuthorizationMatrix.INSCRIPTION_CREATE)
    public ResponseEntity<Void> annuler(
            @PathVariable Long id,
            @RequestParam String enseignantId) {
        service.annulerInscriptionDTO(id, enseignantId);
        return ResponseEntity.noContent().build();
    }

    /**
     * P3 - F11 : retourne les inscriptions de l'utilisateur connecté.
     * Le JWT est utilisé pour résoudre l'identité (email/subject) → enseignant
     * → ses inscriptions. Utilisé par Enseignant/Animateur dans "Mes Inscriptions".
     */
    @GetMapping("/mine")
    @PreAuthorize(AuthorizationMatrix.INSCRIPTION_READ)
    public ResponseEntity<Page<InscriptionSummaryDTO>> getMine(
            @AuthenticationPrincipal Jwt jwt,
            @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        String emailOrUsername = jwt.getClaimAsString("email");
        if (emailOrUsername == null || emailOrUsername.isBlank()) {
            emailOrUsername = jwt.getSubject();
        }
        return ResponseEntity.ok(service.findSummariesByCurrentUser(emailOrUsername, pageable));
    }

    @GetMapping("/enseignant/{enseignantId}")
    @PreAuthorize(AuthorizationMatrix.INSCRIPTION_READ)
    public ResponseEntity<Page<InscriptionSummaryDTO>> getByEnseignant(
            @PathVariable String enseignantId,
            @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        return ResponseEntity.ok(service.findSummariesByEnseignantId(enseignantId, pageable));
    }
}
