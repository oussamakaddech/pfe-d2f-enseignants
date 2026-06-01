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
    @ApiResponse(responseCode = "403", description = "Réservé à ROLE_D2F, ROLE_CUP, ROLE_ADMIN")
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

    // ── Notifications ─────────────────────────────────────────────────────────

    @Operation(
        summary = "Consulter les notifications d'un utilisateur (paginé)",
        description = "Un utilisateur peut consulter ses propres notifications. Admin/CUP/D2F peuvent voir toutes."
    )
    @ApiResponse(responseCode = "200", description = "Notifications de l'utilisateur")
    @ApiResponse(responseCode = "401", description = "Non authentifié")
    @ApiResponse(responseCode = "403", description = "Accès interdit")
    @GetMapping("/notifications/{username}")
    @PreAuthorize("#username == authentication.name or hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_D2F')")
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
