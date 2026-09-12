package esprit.pfe.serviceformation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.services.CurrentUser;
import esprit.pfe.serviceformation.services.ExportExcelService;
import esprit.pfe.serviceformation.services.FormationService;
import esprit.pfe.serviceformation.services.FormationWorkflowService;
import esprit.pfe.serviceformation.services.FormationMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;

import java.io.ByteArrayOutputStream;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import jakarta.validation.Valid;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;

@Slf4j
@RestController
@RequestMapping("/api/v1/formations-workflow")
@Tag(name = "Formations Workflow", description = "Opérations de workflow et fonctionnalités avancées pour les formations")
public class FormationWorkflowController {

    private static final String KEY_ERROR = "error";
    private static final String KEY_MESSAGE = "message";
    private static final String MSG_ERREUR_INTERNE = "Erreur interne";

    private final ExportExcelService exportExcelService;
    private final FormationWorkflowService formationWorkflowService;
    private final FormationService formationService;
    private final FormationMapper formationMapper;

    public FormationWorkflowController(ExportExcelService exportExcelService,
                                       FormationWorkflowService formationWorkflowService,
                                       FormationService formationService,
                                       FormationMapper formationMapper) {
        this.exportExcelService = exportExcelService;
        this.formationWorkflowService = formationWorkflowService;
        this.formationService = formationService;
        this.formationMapper = formationMapper;
    }

    @PostMapping
    @PreAuthorize(AuthorizationMatrix.FORMATION_CREATE)
    @Operation(summary = "Créer une formation via workflow", description = "Crée une formation avec toutes ses relations (séances, animateurs, participants)")
    public ResponseEntity<Object> createFormation(@Valid @RequestBody FormationWorkflowRequest request, org.springframework.validation.BindingResult result) {
        if (result.hasErrors()) {
            log.error("Validation errors: {}", result.getAllErrors());
            return ResponseEntity.badRequest().body(result.getAllErrors());
        }
        try {
            log.info("Creating formation workflow: titre={}, dateDebut={}, dateFin={}, seances={}, animateurs={}, participants={}",
                    request.getTitreFormation(), request.getDateDebut(), request.getDateFin(),
                    request.getSeances() != null ? request.getSeances().size() : 0,
                    request.getAnimateursIds() != null ? request.getAnimateursIds().size() : 0,
                    request.getParticipantsIds() != null ? request.getParticipantsIds().size() : 0);
            Formation formation = formationWorkflowService.createFormationWorkflow(request);
            FormationResponseDTO dto = formationMapper.toResponseDTO(formation);
            return ResponseEntity.status(HttpStatus.CREATED).body(dto);
        } catch (IllegalStateException e) {
            log.error("Erreur metier lors de la creation de la formation : {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(KEY_ERROR, e.getMessage()));
        } catch (IllegalArgumentException e) {
            log.error("Argument invalide lors de la creation de la formation : {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(KEY_ERROR, e.getMessage()));
        } catch (Exception e) {
            log.error("Erreur interne lors de la creation de la formation : ", e);
            String errorMsg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(KEY_ERROR, MSG_ERREUR_INTERNE, KEY_MESSAGE, errorMsg));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.FORMATION_UPDATE)
    @Operation(summary = "Mettre à jour une formation via workflow")
    public ResponseEntity<Object> updateFormation(@PathVariable Long id, @Valid @RequestBody FormationWorkflowRequest request, org.springframework.validation.BindingResult result) {
        if (result.hasErrors()) {
            log.error("Validation errors for update: {}", result.getAllErrors());
            return ResponseEntity.badRequest().body(result.getAllErrors());
        }
        try {
            Formation formation = formationWorkflowService.updateFormationWorkflow(id, request);
            if (formation == null) {
                return ResponseEntity.status(HttpStatus.NOT_FOUND).build();
            }
            FormationResponseDTO dto = formationMapper.toResponseDTO(formation);
            return ResponseEntity.ok(dto);
        } catch (IllegalStateException e) {
            log.error("Erreur metier lors de la mise a jour de la formation {} : {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(KEY_ERROR, e.getMessage()));
        } catch (IllegalArgumentException e) {
            log.error("Argument invalide lors de la mise a jour de la formation {} : {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(KEY_ERROR, e.getMessage()));
        } catch (Exception e) {
            log.error("Erreur interne lors de la mise a jour de la formation {} : ", id, e);
            String errorMsg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(KEY_ERROR, MSG_ERREUR_INTERNE, KEY_MESSAGE, errorMsg));
        }
    }

    @DeleteMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.FORMATION_DELETE)
    public ResponseEntity<Object> deleteFormation(@PathVariable Long id) {
        try {
            formationWorkflowService.deleteFormationWorkflow(id);
            return ResponseEntity.ok("Formation supprimee avec succes !");
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(Map.of(KEY_ERROR, e.getMessage()));
        } catch (Exception e) {
            log.error("Erreur interne lors de la suppression de la formation {} : ", id, e);
            String errorMsg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(KEY_ERROR, MSG_ERREUR_INTERNE, KEY_MESSAGE, errorMsg));
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    @Operation(summary = "Récupérer une formation par son ID")
    public ResponseEntity<Object> getFormationById(@PathVariable Long id) {
        try {
            FormationResponseDTO dto = formationService.getFormationById(id);
            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException e) {
            log.warn("Formation introuvable : {}", e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(KEY_ERROR, e.getMessage()));
        } catch (Exception e) {
            log.error("Erreur interne lors de la recuperation de la formation {} : ", id, e);
            String errorMsg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(KEY_ERROR, MSG_ERREUR_INTERNE, KEY_MESSAGE, errorMsg));
        }
    }

    @GetMapping
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    @Operation(summary = "Lister toutes les formations (legacy - utiliser /api/v1/formations)")
    public ResponseEntity<Object> getAllFormations(@PageableDefault(size = 20) Pageable pageable) {
        try {
            List<FormationResponseDTO> dtos = formationWorkflowService.getAllFormationWorkflows();
            int from = (int) pageable.getOffset();
            int to = Math.min(from + pageable.getPageSize(), dtos.size());
            return ResponseEntity.ok(new PageImpl<>(from >= dtos.size() ? List.of() : dtos.subList(from, to), pageable, dtos.size()));
        } catch (Exception e) {
            log.error("Erreur interne lors de la recuperation de toutes les formations : ", e);
            String errorMsg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(KEY_ERROR, MSG_ERREUR_INTERNE, KEY_MESSAGE, errorMsg));
        }
    }

    @PutMapping("/presence/{id}")
    @PreAuthorize(AuthorizationMatrix.PRESENCE_MARK)
    public ResponseEntity<Object> updatePresence(@PathVariable Long id, @RequestParam boolean present,
                                                 @RequestParam String commentaire,
                                                 @AuthenticationPrincipal Jwt jwt) {
        try {
            formationWorkflowService.updatePresence(id, present, commentaire, CurrentUser.fromJwt(jwt));
            return ResponseEntity.ok("Presence mise a jour avec succes !");
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(KEY_ERROR, e.getMessage()));
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(KEY_ERROR, e.getMessage()));
        }
    }

    @GetMapping("/export/excel")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<Object> exportExcel(
            @RequestParam("start") @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate startDate,
            @RequestParam("end") @DateTimeFormat(pattern = "yyyy-MM-dd") LocalDate endDate
    ) {
        try {
            ByteArrayOutputStream out = exportExcelService.exportFormationsAvance(startDate, endDate);
            byte[] content = out.toByteArray();

            HttpHeaders headers = new HttpHeaders();
            headers.setContentDisposition(ContentDisposition.attachment().filename(String.format("formations_%tF_%tF.xlsx", startDate, endDate)).build());
            headers.setContentType(MediaType.parseMediaType("application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"));

            return ResponseEntity.ok().headers(headers).body(content);
        } catch (Exception e) {
            log.error("Erreur lors de l'export Excel", e);
            String errorMsg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(KEY_ERROR, MSG_ERREUR_INTERNE, KEY_MESSAGE, errorMsg));
        }
    }

    @GetMapping("/animateur")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ_OWN)
    public ResponseEntity<Page<FormationResponseDTO>> getFormationsByAnimateurEmail(
            @AuthenticationPrincipal Jwt jwt,
            @PageableDefault(size = 20, sort = "idFormation") Pageable pageable) {
        String email = jwt.getClaim("email");
        List<FormationResponseDTO> all = formationWorkflowService.getFormationsByAnimateurEmail(email);
        int from = (int) pageable.getOffset();
        int to = Math.min(from + pageable.getPageSize(), all.size());
        return ResponseEntity.ok(new PageImpl<>(from >= all.size() ? List.of() : all.subList(from, to), pageable, all.size()));
    }

    @GetMapping("/seances/{seanceId}/presences")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<Page<PresenceDTO>> getPresencesBySeance(
            @PathVariable("seanceId") Long seanceId,
            @PageableDefault(size = 50, sort = "id") Pageable pageable) {
        List<PresenceDTO> all = formationWorkflowService.getPresencesBySeance(seanceId);
        int from = (int) pageable.getOffset();
        int to = Math.min(from + pageable.getPageSize(), all.size());
        return ResponseEntity.ok(new PageImpl<>(from >= all.size() ? List.of() : all.subList(from, to), pageable, all.size()));
    }

    @PutMapping("/seances/{seanceId}/presences/batch")
    @PreAuthorize(AuthorizationMatrix.PRESENCE_MARK)
    public ResponseEntity<Object> batchUpdatePresences(@PathVariable("seanceId") Long seanceId,
                                                       @RequestBody BatchPresenceUpdateRequest request,
                                                       @AuthenticationPrincipal Jwt jwt) {
        try {
            List<PresenceDTO> updated = formationWorkflowService.batchUpdatePresences(seanceId, request, CurrentUser.fromJwt(jwt));
            return ResponseEntity.ok(updated);
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(KEY_ERROR, e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(KEY_ERROR, e.getMessage()));
        } catch (Exception e) {
            log.error("Erreur lors du batch update des presences (seance {}) : ", seanceId, e);
            String errorMsg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(KEY_ERROR, MSG_ERREUR_INTERNE, KEY_MESSAGE, errorMsg));
        }
    }

    @PutMapping("/seances/{seanceId}/presences/mark-all")
    @PreAuthorize(AuthorizationMatrix.PRESENCE_MARK)
    public ResponseEntity<Object> markAllPresences(@PathVariable("seanceId") Long seanceId,
                                                   @RequestParam("present") boolean present,
                                                   @AuthenticationPrincipal Jwt jwt) {
        try {
            List<PresenceDTO> updated = formationWorkflowService.markAllPresences(seanceId, present, CurrentUser.fromJwt(jwt));
            return ResponseEntity.ok(updated);
        } catch (org.springframework.security.access.AccessDeniedException e) {
            return ResponseEntity.status(HttpStatus.FORBIDDEN).body(Map.of(KEY_ERROR, e.getMessage()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(KEY_ERROR, e.getMessage()));
        } catch (Exception e) {
            log.error("Erreur lors du mark-all des presences (seance {}) : ", seanceId, e);
            String errorMsg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(KEY_ERROR, MSG_ERREUR_INTERNE, KEY_MESSAGE, errorMsg));
        }
    }

    @GetMapping("/seances/{seanceId}/presences/stats")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<SeancePresenceStatsDTO> getSeancePresenceStats(@PathVariable("seanceId") Long seanceId) {
        return ResponseEntity.ok(formationWorkflowService.getSeancePresenceStats(seanceId));
    }

    @GetMapping("/mes-presences")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ_OWN)
    @Operation(summary = "Récupérer les présences de l'enseignant connecté")
    public ResponseEntity<Object> getMesPresences(@AuthenticationPrincipal Jwt jwt, @PageableDefault(size = 20) Pageable pageable) {
        try {
            String email = jwt.getClaim("email");
            List<MesPresenceDTO> presences = formationWorkflowService.getMesPresences(email);
            int from = (int) pageable.getOffset();
            int to = Math.min(from + pageable.getPageSize(), presences.size());
            return ResponseEntity.ok(new PageImpl<>(from >= presences.size() ? List.of() : presences.subList(from, to), pageable, presences.size()));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(KEY_ERROR, e.getMessage()));
        } catch (Exception e) {
            log.error("Erreur lors de la récupération des mes présences : ", e);
            String errorMsg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(KEY_ERROR, MSG_ERREUR_INTERNE, KEY_MESSAGE, errorMsg));
        }
    }

    @GetMapping("/achevees")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<Object> getFormationsAchevees(@PageableDefault(size = 20) Pageable pageable) {
        try {
            List<FormationResponseDTO> achevees = formationWorkflowService.getFormationsAchevees();
            int from = (int) pageable.getOffset();
            int to = Math.min(from + pageable.getPageSize(), achevees.size());
            return ResponseEntity.ok(new PageImpl<>(from >= achevees.size() ? List.of() : achevees.subList(from, to), pageable, achevees.size()));
        } catch (Exception e) {
            log.error("Erreur lors de la recuperation des formations achevees : ", e);
            String errorMsg = e.getMessage() != null ? e.getMessage() : e.getClass().getSimpleName();
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(KEY_ERROR, MSG_ERREUR_INTERNE, KEY_MESSAGE, errorMsg));
        }
    }

    @GetMapping("/with-documents")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<Page<FormationWithDocumentsDTO>> getAllFormationsWithDocuments(
            @PageableDefault(size = 20, sort = "idFormation") Pageable pageable) {
        List<FormationWithDocumentsDTO> all = formationWorkflowService.getAllFormationsWithDocuments();
        int from = (int) pageable.getOffset();
        int to = Math.min(from + pageable.getPageSize(), all.size());
        return ResponseEntity.ok(new PageImpl<>(from >= all.size() ? List.of() : all.subList(from, to), pageable, all.size()));
    }

    @GetMapping("/enseignants/{id}/calendar")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<FormationsByRoleDTO> getCalendarFormations(@PathVariable("id") String enseignantId) {
        FormationsByRoleDTO dto = formationWorkflowService.getFormationsForCalendar(enseignantId);
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/{id}/inscriptions-ouvertes")
    @PreAuthorize(AuthorizationMatrix.FORMATION_UPDATE)
    public FormationResponseDTO updateInscriptionsOuvertes(@PathVariable Long id, @RequestParam boolean ouvert) {
        return formationWorkflowService.setInscriptionsOuvertes(id, ouvert);
    }

    @GetMapping("/visibles")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<Page<FormationResponseDTO>> getFormationsVisibles(
            @PageableDefault(size = 20, sort = "idFormation") Pageable pageable) {
        List<FormationResponseDTO> all = formationWorkflowService.getFormationsVisibles();
        int from = (int) pageable.getOffset();
        int to = Math.min(from + pageable.getPageSize(), all.size());
        return ResponseEntity.ok(new PageImpl<>(from >= all.size() ? List.of() : all.subList(from, to), pageable, all.size()));
    }

    @GetMapping("/par-up")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<Page<FormationResponseDTO>> getFormationsParUp(
            @RequestParam String upId,
            @PageableDefault(size = 20, sort = "idFormation") Pageable pageable) {
        List<FormationResponseDTO> all = formationWorkflowService.getFormationsParUp(upId);
        int from = (int) pageable.getOffset();
        int to = Math.min(from + pageable.getPageSize(), all.size());
        return ResponseEntity.ok(new PageImpl<>(from >= all.size() ? List.of() : all.subList(from, to), pageable, all.size()));
    }

    @GetMapping("/par-departement")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<Page<FormationResponseDTO>> getFormationsParDepartement(
            @RequestParam String deptId,
            @PageableDefault(size = 20, sort = "idFormation") Pageable pageable) {
        List<FormationResponseDTO> all = formationWorkflowService.getFormationsParDepartement(deptId);
        int from = (int) pageable.getOffset();
        int to = Math.min(from + pageable.getPageSize(), all.size());
        return ResponseEntity.ok(new PageImpl<>(from >= all.size() ? List.of() : all.subList(from, to), pageable, all.size()));
    }

    /**
     * Catalogue scopé serveur (§8 droits) : un CUP ne voit que les formations
     * de son UP, un chef de département celles de son département. Le périmètre
     * est résolu depuis le JWT côté serveur — non falsifiable par le client.
     */
    @GetMapping("/mes-formations-pilote")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<Page<FormationResponseDTO>> getMesFormationsPilote(
            @AuthenticationPrincipal Jwt jwt,
            @PageableDefault(size = 20, sort = "idFormation") Pageable pageable) {
        List<FormationResponseDTO> all = formationWorkflowService
                .getMesFormationsPilote(CurrentUser.fromJwt(jwt));
        int from = (int) pageable.getOffset();
        int to = Math.min(from + pageable.getPageSize(), all.size());
        return ResponseEntity.ok(new PageImpl<>(from >= all.size() ? List.of() : all.subList(from, to), pageable, all.size()));
    }
}
