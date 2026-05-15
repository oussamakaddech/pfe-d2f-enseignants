package tn.esprit.d2f.controller;

import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.Parameter;
import io.swagger.v3.oas.annotations.tags.Tag;
import jakarta.validation.Valid;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.data.domain.Sort;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import tn.esprit.d2f.dto.BesoinFormationRequest;
import tn.esprit.d2f.dto.BesoinFormationResponse;
import tn.esprit.d2f.entity.Notification;
import tn.esprit.d2f.entity.enumerations.Priorite;
import tn.esprit.d2f.repository.NotificationRepository;
import tn.esprit.d2f.service.IBesoinFormationService;
import esprit.d2f.common.security.AuthorizationMatrix;

import lombok.extern.slf4j.Slf4j;
@Slf4j
@RestController
@RequestMapping({"/api/v1/besoins-formations", "/api/v1/besoins-formations/"})
@Tag(name = "Besoin de Formation", description = "Gestion des besoins de formation avec DTO et Validation")
public class BesoinFormationController {

    private static final String ID_BESOIN_FORMATION = "idBesoinFormation";

    private final IBesoinFormationService besoinFormationService;
    private final NotificationRepository notificationRepository;

    public BesoinFormationController(IBesoinFormationService besoinFormationService, 
                                    NotificationRepository notificationRepository) {
        this.besoinFormationService = besoinFormationService;
        this.notificationRepository = notificationRepository;
    }

    @Operation(summary = "Récupérer tous les besoins de formation (Paginé)")
    @GetMapping
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_READ_ALL)
    public ResponseEntity<Page<BesoinFormationResponse>> getBesoinFormations(
            @Parameter(description = "Index de la page") @RequestParam(defaultValue = "0") int page,
            @Parameter(description = "Taille de la page") @RequestParam(defaultValue = "10") int size,
            @Parameter(description = "Tri (ex: idBesoinFormation,asc)") @RequestParam(defaultValue = ID_BESOIN_FORMATION + ",desc") String[] sort) {
        
        Pageable pageable = PageRequest.of(page, size, getSortOrder(sort));
        return ResponseEntity.ok(besoinFormationService.retrieveAllBesoinFormations(pageable));
    }

    @GetMapping("/{idBesoinFormation}")
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_READ_ALL)
    public ResponseEntity<BesoinFormationResponse> retrieveBesoinFormation(@PathVariable("idBesoinFormation") long idBesoinFormation) {
        return ResponseEntity.ok(besoinFormationService.retrieveBesoinFormation(idBesoinFormation));
    }

    @Operation(summary = "Ajouter un besoin de formation")
    @PostMapping
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_CREATE)
    public ResponseEntity<Object> addBesoinFormation(@Valid @RequestBody BesoinFormationRequest b, org.springframework.validation.BindingResult result) {
        if (result.hasErrors()) {
            log.error("Validation errors in add-BesoinFormation: {}", result.getAllErrors());
            return ResponseEntity.badRequest().body(result.getAllErrors());
        }
        return ResponseEntity.ok(besoinFormationService.addBesoinFormation(b));
    }

    @DeleteMapping("/{idBesoinFormation}")
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_DELETE)
    public ResponseEntity<Void> removeBesoinFormation(@PathVariable("idBesoinFormation") long idBesoinFormation) {
        besoinFormationService.removeBesoinFormation(idBesoinFormation);
        return ResponseEntity.noContent().build();
    }

    @Operation(summary = "Modifier un besoin de formation")
    @PutMapping
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_UPDATE)
    public ResponseEntity<BesoinFormationResponse> modifyBesoinFormation(@Valid @RequestBody BesoinFormationRequest request) {
        return ResponseEntity.ok(besoinFormationService.modifyBesoinFormation(request));
    }

    @Operation(summary = "Récupérer les notifications d'un utilisateur (Paginé)")
    @GetMapping("/notifications/{username}")
    @PreAuthorize("#username == authentication.name "
            + "or hasAnyRole('ROLE_ADMIN','ROLE_CUP','ROLE_D2F')")
    public ResponseEntity<Page<Notification>> getUserNotifications(
            @PathVariable String username,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by("id").descending());
        return ResponseEntity.ok(notificationRepository.findByUsername(username, pageable));
    }

    @PutMapping("/{id}/approve")
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_APPROVE)
    public ResponseEntity<BesoinFormationResponse> approveBesoin(@PathVariable Long id) {
        return ResponseEntity.ok(besoinFormationService.approuverBesoin(id));
    }

    @Operation(summary = "Récupérer les besoins approuvés (Paginé)")
    @GetMapping("/approved")
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_READ_ALL)
    public ResponseEntity<Page<BesoinFormationResponse>> getApprovedBesoinFormations(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(ID_BESOIN_FORMATION).descending());
        return ResponseEntity.ok(besoinFormationService.retrieveApprovedBesoinFormations(pageable));
    }

    @Operation(summary = "Consulter les besoins par UP (Paginé)")
    @GetMapping("/by-up/{up}")
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_READ_ALL)
    public ResponseEntity<Page<BesoinFormationResponse>> getBesoinsByUp(
            @PathVariable String up,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(ID_BESOIN_FORMATION).descending());
        return ResponseEntity.ok(besoinFormationService.retrieveByUp(up, pageable));
    }

    @Operation(summary = "Consulter les besoins par département (Paginé)")
    @GetMapping("/by-departement/{departement}")
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_READ_ALL)
    public ResponseEntity<Page<BesoinFormationResponse>> getBesoinsByDepartement(
            @PathVariable String departement,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(ID_BESOIN_FORMATION).descending());
        return ResponseEntity.ok(besoinFormationService.retrieveByDepartement(departement, pageable));
    }

    @Operation(summary = "Récupérer tous les besoins triés par priorité (Paginé)")
    @GetMapping("/by-priorite")
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_READ_ALL)
    public ResponseEntity<Page<BesoinFormationResponse>> getBesoinsByPriorite(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size);
        return ResponseEntity.ok(besoinFormationService.retrieveAllByPriorite(pageable));
    }

    @Operation(summary = "Filtrer les besoins par niveau de priorité (Paginé)")
    @GetMapping("/by-priorite/{priorite}")
    @PreAuthorize(AuthorizationMatrix.BESOIN_FORMATION_READ_ALL)
    public ResponseEntity<Page<BesoinFormationResponse>> getBesoinsByPrioriteLevel(
            @PathVariable Priorite priorite,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "10") int size) {
        Pageable pageable = PageRequest.of(page, size, Sort.by(ID_BESOIN_FORMATION).descending());
        return ResponseEntity.ok(besoinFormationService.retrieveByPriorite(priorite, pageable));
    }

    private Sort getSortOrder(String[] sort) {
        if (sort.length >= 2) {
            return Sort.by(sort[1].equalsIgnoreCase("asc") ? Sort.Direction.ASC : Sort.Direction.DESC, sort[0]);
        }
        return Sort.by(Sort.Direction.DESC, ID_BESOIN_FORMATION);
    }

}
