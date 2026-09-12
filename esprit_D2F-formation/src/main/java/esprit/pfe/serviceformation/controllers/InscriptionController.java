package esprit.pfe.serviceformation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceformation.dto.FormationResponseDTO;
import esprit.pfe.serviceformation.dto.InscriptionDTO;
import esprit.pfe.serviceformation.dto.InscriptionSummaryDTO;
import esprit.pfe.serviceformation.dto.TraiterDemandeBulkRequest;
import esprit.pfe.serviceformation.services.InscriptionService;
import esprit.pfe.serviceformation.services.CurrentUser;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
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

    /**
     * Identité LDAP de l'appelant : l'email est la clé fonctionnelle de la
     * fiche enseignant ; repli sur le subject du JWT.
     */
    private static String callerIdentity(Jwt jwt) {
        return CurrentUser.fromJwt(jwt).emailOrUsername();
    }

    private static boolean isAdminOrCup(Jwt jwt) {
        CurrentUser user = CurrentUser.fromJwt(jwt);
        return user.hasRole("ADMIN") || user.hasRole("CUP");
    }

    /**
     * Un non-admin ne peut agir que pour lui-même : l'enseignantId client est
     * ignoré et remplacé par l'identité du JWT (anti-inscription pour autrui).
     * Sans JWT (tests standalone / appel interne), la requête est refusée.
     */
    private static String selfOrAdmin(Jwt jwt, String requestedEnseignantId) {
        if (jwt == null) {
            throw new AccessDeniedException("Authentification requise.");
        }
        if (isAdminOrCup(jwt)) {
            return requestedEnseignantId;
        }
        String caller = callerIdentity(jwt);
        if (requestedEnseignantId != null && !requestedEnseignantId.isBlank()
                && !requestedEnseignantId.equalsIgnoreCase(caller)) {
            throw new AccessDeniedException(
                    "Vous ne pouvez agir que sur vos propres inscriptions.");
        }
        return caller;
    }

    @GetMapping("/formations/accessibles")
    @PreAuthorize(AuthorizationMatrix.INSCRIPTION_READ)
    public ResponseEntity<Page<FormationResponseDTO>> getFormationsAccessibles(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam(required = false) String enseignantId,
            @PageableDefault(size = 20, sort = "idFormation") Pageable pageable) {
        String target = jwt == null
                ? enseignantId
                : (isAdminOrCup(jwt)
                        ? (enseignantId != null && !enseignantId.isBlank() ? enseignantId : callerIdentity(jwt))
                        : selfOrAdmin(jwt, enseignantId));
        return ResponseEntity.ok(service.listerFormationsAccessibles(target, pageable));
    }

    @PostMapping("/inscriptions")
    @PreAuthorize(AuthorizationMatrix.INSCRIPTION_CREATE)
    @ResponseStatus(HttpStatus.CREATED)
    public InscriptionDTO postInscription(
            @AuthenticationPrincipal Jwt jwt,
            @RequestParam Long formationId,
            @RequestParam(required = false) String enseignantId) {
        String target = jwt == null
                ? enseignantId
                : (isAdminOrCup(jwt)
                        ? (enseignantId != null && !enseignantId.isBlank() ? enseignantId : callerIdentity(jwt))
                        : selfOrAdmin(jwt, enseignantId));
        return service.demanderInscriptionDTO(formationId, target);
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
     * Anti-IDOR : un non-admin ne peut annuler QUE sa propre demande —
     * l'enseignantId fourni est comparé à l'identité du JWT, le propriétaire
     * réel de l'inscription est toujours revérifié côté service.
     */
    @DeleteMapping("/inscriptions/{id}")
    @PreAuthorize(AuthorizationMatrix.INSCRIPTION_CREATE)
    public ResponseEntity<Void> annuler(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable Long id,
            @RequestParam(required = false) String enseignantId) {
        String target = jwt == null
                ? enseignantId
                : (isAdminOrCup(jwt)
                        ? (enseignantId != null && !enseignantId.isBlank() ? enseignantId : callerIdentity(jwt))
                        : selfOrAdmin(jwt, enseignantId));
        service.annulerInscriptionDTO(id, target);
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
        String emailOrUsername = callerIdentity(jwt);
        return ResponseEntity.ok(service.findSummariesByCurrentUser(emailOrUsername, pageable));
    }

    /**
     * Inscriptions d'un enseignant donné. Anti-énumération : un non-admin
     * ne peut consulter que ses propres inscriptions.
     */
    @GetMapping("/enseignant/{enseignantId}")
    @PreAuthorize(AuthorizationMatrix.INSCRIPTION_READ)
    public ResponseEntity<Page<InscriptionSummaryDTO>> getByEnseignant(
            @AuthenticationPrincipal Jwt jwt,
            @PathVariable String enseignantId,
            @PageableDefault(size = 20, sort = "id") Pageable pageable) {
        String target = jwt == null ? enseignantId : selfOrAdmin(jwt, enseignantId);
        return ResponseEntity.ok(service.findSummariesByEnseignantId(target, pageable));
    }
}
