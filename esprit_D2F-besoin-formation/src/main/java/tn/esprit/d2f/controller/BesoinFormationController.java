package tn.esprit.d2f.controller;

import esprit.d2f.common.security.AuthorizationMatrix;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.responses.ApiResponse;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;
import tn.esprit.d2f.dto.BesoinFormationRequest;
import tn.esprit.d2f.dto.BesoinFormationResponse;
import tn.esprit.d2f.dto.NotificationDTO;
import tn.esprit.d2f.dto.PageResponse;
import tn.esprit.d2f.entity.enumerations.Priorite;
import tn.esprit.d2f.service.IBesoinFormationService;

/**
 * Contrôleur REST pour la gestion des besoins de formation.
 *
 * <p>Fix 7 — toutes les réponses paginées utilisent {@link PageResponse} (enveloppe canonique DSI).</p>
 * <p>Fix 8 — validation via {@code @Valid} ; les erreurs sont traitées par {@code GlobalExceptionHandler}.</p>
 * <p>Fix 13 — documentation Swagger complète : {@code @Operation} + {@code @ApiResponses} sur tous les endpoints.</p>
 */
@Slf4j
@RestController
@RequestMapping("/api/v1/besoins-formations")
@Tag(name = "Besoin de Formation", description = "Gestion des besoins de formation des enseignants ESPRIT")
public class BesoinFormationController {

    private static final String SORT_FIELD = "idBesoinFormation";

    private final IBesoinFormationService besoinFormationService;

    public BesoinFormationController(IBesoinFormationService besoinFormationService) {
        this.besoinFormationService = besoinFormationService;
    }

    // ── Lecture ───────────────────────────────────────────────────────────────

    @Operation(
        summary = "Lister tous les besoins de formation (paginé)",
        description = "Retourne la liste paginée de tous les besoins, triable sur n'importe quel champ."
    )
    @ApiResponse(responseCode = "200", description = "Liste paginée des besoins")
    @ApiResponse(responseCode = "400", description = "Paramètres de pagination invalides")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Permissions insuffisantes")
    @GetMapping
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_READ_ALL)
    public ResponseEntity<PageResponse<BesoinFormationResponse>> getBesoinFormations(
            @Parameter(description = "Index de la page (base 0)") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Taille de la page (max 100)") @RequestParam(defaultValue = "10") int size,
            @Parameter(description = "Tri, ex: idBesoinFormation,desc") @RequestParam(defaultValue = SORT_FIELD + ",desc") String[] sort) {
        Pageable pageable = PageRequest.of(page, size, buildSort(sort));
        return ResponseEntity.ok(PageResponse.of(besoinFormationService.retrieveAllBesoinFormations(pageable)));
    }

    @Operation(
        summary = "Récupérer un besoin de formation par son identifiant",
        description = "Retourne le détail complet d'un besoin. Retourne 404 si inexistant."
    )
    @ApiResponse(responseCode = "200", description = "Besoin trouvé")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Permissions insuffisantes")
    @ApiResponse(responseCode = "404", description = "Besoin introuvable")
    @GetMapping("/{idBesoinFormation}")
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_READ_ALL)
    public ResponseEntity<BesoinFormationResponse> retrieveBesoinFormation(
            @Parameter(description = "Identifiant du besoin") @PathVariable long idBesoinFormation) {
        return ResponseEntity.ok(besoinFormationService.retrieveBesoinFormation(idBesoinFormation));
    }

    // ── Création ──────────────────────────────────────────────────────────────

    @Operation(
        summary = "Créer un nouveau besoin de formation",
        description = "Crée un besoin de formation. Les champs obligatoires sont validés. Retourne HTTP 201."
    )
    @ApiResponse(responseCode = "201", description = "Besoin créé avec succès")
    @ApiResponse(responseCode = "400", description = "Données invalides (voir message de validation)")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Réservé à ROLE_CUP, ROLE_ADMIN")
    @PostMapping
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_CREATE)
    public ResponseEntity<BesoinFormationResponse> addBesoinFormation(
            @Valid @RequestBody BesoinFormationRequest request) {
        // Fix 8: supprimer le BindingResult manuel — GlobalExceptionHandler traite MethodArgumentNotValidException
        // Fix 7: HTTP 201 Created pour une création de ressource (DSI §3)
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(besoinFormationService.addBesoinFormation(request));
    }

    // ── Modification ──────────────────────────────────────────────────────────

    @Operation(
        summary = "Mettre à jour un besoin de formation",
        description = "Mise à jour partielle : seuls les champs non-null du body sont appliqués."
    )
    @ApiResponse(responseCode = "200", description = "Besoin mis à jour")
    @ApiResponse(responseCode = "400", description = "Données invalides")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Réservé à ROLE_ADMIN")
    @ApiResponse(responseCode = "404", description = "Besoin introuvable")
    @PutMapping
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_UPDATE)
    public ResponseEntity<BesoinFormationResponse> modifyBesoinFormation(
            @Valid @RequestBody BesoinFormationRequest request) {
        return ResponseEntity.ok(besoinFormationService.modifyBesoinFormation(request));
    }

    // ── Suppression (soft) ────────────────────────────────────────────────────

    @Operation(
        summary = "Supprimer (logiquement) un besoin de formation",
        description = "Suppression logique : positionne deleted_at. L'enregistrement n'est plus visible. Réservé à ROLE_ADMIN."
    )
    @ApiResponse(responseCode = "204", description = "Suppression réussie")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Réservé à ROLE_ADMIN")
    @ApiResponse(responseCode = "404", description = "Besoin introuvable")
    @DeleteMapping("/{idBesoinFormation}")
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_DELETE)
    public ResponseEntity<Void> removeBesoinFormation(
            @Parameter(description = "Identifiant du besoin") @PathVariable long idBesoinFormation) {
        besoinFormationService.removeBesoinFormation(idBesoinFormation);
        return ResponseEntity.noContent().build();
    }

    // ── Workflow d'approbation ────────────────────────────────────────────────

    @Operation(
        summary = "Approuver un besoin (workflow 3 niveaux)",
        description = """
            Progresse le workflow d'approbation d'un cran selon le rôle de l'appelant :
            - CUP ou ADMIN → approuveCUP = true (étape 1)
            - CHEF_DEPARTEMENT ou ADMIN → approuveChefDep = true (étape 2)
            - ADMIN → approuveAdmin = true + publication événement RabbitMQ (étape 3)
            Retourne 403 si le rôle de l'appelant ne correspond pas à l'étape courante.
            """
    )
    @ApiResponse(responseCode = "200", description = "Étape d'approbation enregistrée")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Rôle insuffisant pour l'étape courante du workflow")
    @ApiResponse(responseCode = "404", description = "Besoin introuvable")
    @PutMapping("/{id}/approve")
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_APPROVE)
    public ResponseEntity<BesoinFormationResponse> approveBesoin(
            @Parameter(description = "Identifiant du besoin à approuver") @PathVariable Long id) {
        return ResponseEntity.ok(besoinFormationService.approuverBesoin(id));
    }

    @Operation(
        summary = "Refuser un besoin (workflow)",
        description = """
            Refuse le besoin à l'étape courante selon le rôle de l'appelant
            (CUP → étape CUP, CHEF_DEPARTEMENT → étape département, ADMIN → étape finale).
            Le motif est obligatoire et notifié au demandeur. Le créateur ne peut
            jamais refuser son propre besoin. Périmètre UP/département contrôlé.
            """
    )
    @ApiResponse(responseCode = "200", description = "Refus enregistré (statut REJECTED)")
    @ApiResponse(responseCode = "400", description = "Motif manquant")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Rôle/périmètre insuffisant ou propre besoin")
    @ApiResponse(responseCode = "404", description = "Besoin introuvable")
    @ApiResponse(responseCode = "409", description = "Besoin déjà traité")
    @PutMapping("/{id}/reject")
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_REJECT)
    public ResponseEntity<BesoinFormationResponse> rejectBesoin(
            @Parameter(description = "Identifiant du besoin à refuser") @PathVariable Long id,
            @Valid @RequestBody tn.esprit.d2f.dto.RejectBesoinRequest request) {
        return ResponseEntity.ok(besoinFormationService.refuserBesoin(id, request.getReason()));
    }

    @Operation(
        summary = "Annuler son propre besoin (avant toute approbation)",
        description = "Le créateur (ou l'administrateur) annule un besoin au statut SUBMITTED."
    )
    @ApiResponse(responseCode = "200", description = "Besoin annulé (statut CANCELLED)")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Ni créateur ni administrateur")
    @ApiResponse(responseCode = "404", description = "Besoin introuvable")
    @ApiResponse(responseCode = "409", description = "Besoin déjà en cours de traitement")
    @PutMapping("/{id}/cancel")
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_CANCEL)
    public ResponseEntity<BesoinFormationResponse> cancelBesoin(
            @Parameter(description = "Identifiant du besoin à annuler") @PathVariable Long id) {
        return ResponseEntity.ok(besoinFormationService.annulerBesoin(id));
    }

    @Operation(
        summary = "Lister les besoins en attente pour l'utilisateur connecté",
        description = "Périmètre calculé côté serveur : CUP → besoins de son UP à l'étape CUP, "
                + "CHEF_DEPARTEMENT → besoins de son département à l'étape département, "
                + "ADMIN → tous les besoins en attente."
    )
    @ApiResponse(responseCode = "200", description = "Besoins en attente du périmètre")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Réservé aux valideurs / périmètre non configuré")
    @GetMapping("/pending-approval")
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_PENDING)
    public ResponseEntity<PageResponse<BesoinFormationResponse>> getPendingApproval(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(SORT_FIELD).descending());
        return ResponseEntity.ok(PageResponse.of(besoinFormationService.retrievePendingApproval(pageable)));
    }

    @Operation(
        summary = "Lister les besoins du périmètre de l'utilisateur connecté",
        description = "Périmètre calculé côté serveur : CUP → besoins de son UP, "
                + "CHEF_DEPARTEMENT → besoins de son département, ADMIN → tous."
    )
    @ApiResponse(responseCode = "200", description = "Besoins du périmètre")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Périmètre non configuré")
    @GetMapping("/scope")
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_SCOPE)
    public ResponseEntity<PageResponse<BesoinFormationResponse>> getScope(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(SORT_FIELD).descending());
        return ResponseEntity.ok(PageResponse.of(besoinFormationService.retrieveScope(pageable)));
    }

    @Operation(
        summary = "Historique d'audit des transitions d'un besoin",
        description = "Créations, approbations, refus et annulations avec acteur, rôles et motifs. Réservé à l'administrateur."
    )
    @ApiResponse(responseCode = "200", description = "Historique du besoin")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Réservé à l'administrateur")
    @ApiResponse(responseCode = "404", description = "Besoin introuvable")
    @GetMapping("/{id}/history")
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_HISTORY)
    public ResponseEntity<java.util.List<tn.esprit.d2f.entity.BesoinApprovalHistory>> getHistory(
            @Parameter(description = "Identifiant du besoin") @PathVariable Long id) {
        return ResponseEntity.ok(besoinFormationService.getApprovalHistory(id));
    }

    // ── Requêtes filtrées ─────────────────────────────────────────────────────

    @Operation(summary = "Lister les besoins intégralement approuvés (paginé)")
    @ApiResponse(responseCode = "200", description = "Besoins approuvés")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Permissions insuffisantes")
    @GetMapping("/approved")
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_READ_ALL)
    public ResponseEntity<PageResponse<BesoinFormationResponse>> getApprovedBesoinFormations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(SORT_FIELD).descending());
        return ResponseEntity.ok(PageResponse.of(besoinFormationService.retrieveApprovedBesoinFormations(pageable)));
    }

    @Operation(summary = "Filtrer les besoins par Unité Pédagogique (paginé)")
    @ApiResponse(responseCode = "200", description = "Besoins de l'UP")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Permissions insuffisantes")
    @GetMapping("/by-up/{up}")
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_READ_ALL)
    public ResponseEntity<PageResponse<BesoinFormationResponse>> getBesoinsByUp(
            @Parameter(description = "Code de l'UP") @PathVariable String up,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(SORT_FIELD).descending());
        return ResponseEntity.ok(PageResponse.of(besoinFormationService.retrieveByUp(up, pageable)));
    }

    @Operation(summary = "Filtrer les besoins par département (paginé)")
    @ApiResponse(responseCode = "200", description = "Besoins du département")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Permissions insuffisantes")
    @GetMapping("/by-departement/{departement}")
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_READ_ALL)
    public ResponseEntity<PageResponse<BesoinFormationResponse>> getBesoinsByDepartement(
            @Parameter(description = "Code du département") @PathVariable String departement,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(SORT_FIELD).descending());
        return ResponseEntity.ok(PageResponse.of(besoinFormationService.retrieveByDepartement(departement, pageable)));
    }

    @Operation(summary = "Lister tous les besoins triés par priorité décroissante (paginé)")
    @ApiResponse(responseCode = "200", description = "Besoins triés par priorité")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Permissions insuffisantes")
    @GetMapping("/by-priorite")
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_READ_ALL)
    public ResponseEntity<PageResponse<BesoinFormationResponse>> getBesoinsByPriorite(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        return ResponseEntity.ok(PageResponse.of(
                besoinFormationService.retrieveAllByPriorite(PageRequest.of(page, size))));
    }

    @Operation(summary = "Filtrer les besoins par niveau de priorité exact (paginé)")
    @ApiResponse(responseCode = "200", description = "Besoins du niveau de priorité donné")
    @ApiResponse(responseCode = "400", description = "Valeur de priorité invalide")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Permissions insuffisantes")
    @GetMapping("/by-priorite/{priorite}")
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_READ_ALL)
    public ResponseEntity<PageResponse<BesoinFormationResponse>> getBesoinsByPrioriteLevel(
            @Parameter(description = "Niveau de priorité (HAUTE, MOYENNE, FAIBLE)") @PathVariable Priorite priorite,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(SORT_FIELD).descending());
        return ResponseEntity.ok(PageResponse.of(besoinFormationService.retrieveByPriorite(priorite, pageable)));
    }

    // ── Besoins personnels (pour ENSEIGNANT / ANIMATEUR) ──────────────────────

    @Operation(
        summary = "Lister mes besoins de formation (paginé)",
        description = "Retourne les besoins de l'utilisateur connecté. Accessible à tout utilisateur authentifié ; " +
                      "les données sont filtrées par le username extrait du JWT."
    )
    @ApiResponse(responseCode = "200", description = "Besoins personnels de l'utilisateur")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @GetMapping("/mine")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<PageResponse<BesoinFormationResponse>> getMyBesoinFormations(
            @Parameter(hidden = true) @AuthenticationPrincipal Jwt jwt,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        String username = jwt.getSubject();
        Pageable pageable = PageRequest.of(page, size, Sort.by(SORT_FIELD).descending());
        return ResponseEntity.ok(PageResponse.of(besoinFormationService.retrieveByUsername(username, pageable)));
    }

    // ── Notifications ─────────────────────────────────────────────────────────

    @Operation(
        summary = "Consulter les notifications d'un utilisateur (paginé)",
        description = "Un utilisateur peut consulter ses propres notifications. Admin/CUP/D2F peuvent voir toutes."
    )
    @ApiResponse(responseCode = "200", description = "Notifications de l'utilisateur")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Accès interdit")
    @GetMapping("/notifications/{username}")
    @PreAuthorize("#username == authentication.name or hasAnyRole('ROLE_ADMIN','ROLE_CUP')")
    public ResponseEntity<PageResponse<NotificationDTO>> getUserNotifications(
            @Parameter(description = "Identifiant de l'utilisateur") @PathVariable String username,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("idNotification").descending());
        return ResponseEntity.ok(PageResponse.of(
                besoinFormationService.findNotificationsByUsername(username, pageable).map(NotificationDTO::from)));
    }

    // ── Helper ────────────────────────────────────────────────────────────────

    private Sort buildSort(String[] sort) {
        if (sort.length >= 2) {
            Sort.Direction dir = sort[1].equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC;
            return Sort.by(dir, sort[0]);
        }
        return Sort.by(Sort.Direction.DESC, SORT_FIELD);
    }
}
