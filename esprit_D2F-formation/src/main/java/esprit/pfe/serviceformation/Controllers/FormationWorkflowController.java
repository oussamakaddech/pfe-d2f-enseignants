package esprit.pfe.serviceformation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.services.ExportExcelService;
import esprit.pfe.serviceformation.services.FormationWorkflowService;
import lombok.extern.slf4j.Slf4j;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.*;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.*;

import java.io.ByteArrayOutputStream;
import java.util.Date;
import java.util.List;
import java.util.Map;
import jakarta.validation.Valid;

@Slf4j
@RestController
@RequestMapping("/api/v1/formations-workflow")
public class FormationWorkflowController {

    private static final String KEY_ERROR = "error";
    private static final String KEY_MESSAGE = "message";
    private static final String MSG_ERREUR_INTERNE = "Erreur interne";

    private final ExportExcelService exportExcelService;
    private final FormationWorkflowService formationWorkflowService;

    public FormationWorkflowController(ExportExcelService exportExcelService, FormationWorkflowService formationWorkflowService) {
        this.exportExcelService = exportExcelService;
        this.formationWorkflowService = formationWorkflowService;
    }

    @PostMapping
    @PreAuthorize(AuthorizationMatrix.FORMATION_CREATE)
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
            FormationDTO dto = formationWorkflowService.mapFormationToDTO(formation);
            return ResponseEntity.status(HttpStatus.CREATED).body(dto);
        } catch (IllegalStateException e) {
            log.error("Erreur metier lors de la creation de la formation : {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(KEY_ERROR, e.getMessage()));
        } catch (IllegalArgumentException e) {
            log.error("Argument invalide lors de la creation de la formation : {}", e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(KEY_ERROR, e.getMessage()));
        } catch (Exception e) {
            log.error("Erreur interne lors de la creation de la formation : ", e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(KEY_ERROR, MSG_ERREUR_INTERNE, KEY_MESSAGE, e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.FORMATION_UPDATE)
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
            FormationDTO dto = formationWorkflowService.mapFormationToDTO(formation);
            return ResponseEntity.ok(dto);
        } catch (IllegalStateException e) {
            log.error("Erreur metier lors de la mise a jour de la formation {} : {}", id, e.getMessage());
            return ResponseEntity.badRequest().body(Map.of(KEY_ERROR, e.getMessage()));
        } catch (IllegalArgumentException e) {
            log.error("Argument invalide lors de la mise a jour de la formation {} : {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(KEY_ERROR, e.getMessage()));
        } catch (Exception e) {
            log.error("Erreur interne lors de la mise a jour de la formation {} : {}", id, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(KEY_ERROR, MSG_ERREUR_INTERNE, KEY_MESSAGE, e.getMessage()));
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
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(KEY_ERROR, MSG_ERREUR_INTERNE, KEY_MESSAGE, e.getMessage()));
        }
    }

    @GetMapping("/{id}")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<Object> getFormationById(@PathVariable Long id) {
        try {
            FormationDTO dto = formationWorkflowService.getFormationWorkflowById(id);
            return ResponseEntity.ok(dto);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(KEY_ERROR, e.getMessage()));
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(KEY_ERROR, MSG_ERREUR_INTERNE, KEY_MESSAGE, e.getMessage()));
        }
    }

    @GetMapping
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<Object> getAllFormations() {
        try {
            List<FormationDTO> dtos = formationWorkflowService.getAllFormationWorkflows();
            return ResponseEntity.ok(dtos);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(KEY_ERROR, MSG_ERREUR_INTERNE, KEY_MESSAGE, e.getMessage()));
        }
    }

    @PutMapping("/presence/{id}")
    @PreAuthorize(AuthorizationMatrix.FORMATION_UPDATE)
    public ResponseEntity<Object> updatePresence(@PathVariable Long id, @RequestParam boolean present, @RequestParam String commentaire) {
        try {
            formationWorkflowService.updatePresence(id, present, commentaire);
            return ResponseEntity.ok("Presence mise a jour avec succes !");
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of(KEY_ERROR, e.getMessage()));
        }
    }

    @GetMapping("/export/excel")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<Object> exportExcel(
            @RequestParam("start") @DateTimeFormat(pattern = "yyyy-MM-dd") Date startDate,
            @RequestParam("end") @DateTimeFormat(pattern = "yyyy-MM-dd") Date endDate
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
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(KEY_ERROR, MSG_ERREUR_INTERNE, KEY_MESSAGE, e.getMessage()));
        }
    }

    @GetMapping("/animateur")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ_OWN)
    public ResponseEntity<List<FormationDTO>> getFormationsByAnimateurEmail(@AuthenticationPrincipal Jwt jwt) {
        String email = jwt.getClaim("email");
        List<FormationDTO> formations = formationWorkflowService.getFormationsByAnimateurEmail(email);
        return ResponseEntity.ok(formations);
    }

    @GetMapping("/seances/{seanceId}/presences")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<List<PresenceDTO>> getPresencesBySeance(@PathVariable("seanceId") Long seanceId) {
        List<PresenceDTO> presences = formationWorkflowService.getPresencesBySeance(seanceId);
        return ResponseEntity.ok(presences);
    }

    @PutMapping("/seances/{seanceId}/presences/batch")
    @PreAuthorize(AuthorizationMatrix.FORMATION_UPDATE)
    public ResponseEntity<Object> batchUpdatePresences(@PathVariable("seanceId") Long seanceId,
                                                       @RequestBody BatchPresenceUpdateRequest request) {
        try {
            List<PresenceDTO> updated = formationWorkflowService.batchUpdatePresences(seanceId, request);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(KEY_ERROR, e.getMessage()));
        } catch (Exception e) {
            log.error("Erreur lors du batch update des presences (seance {}) : {}", seanceId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(KEY_ERROR, MSG_ERREUR_INTERNE, KEY_MESSAGE, e.getMessage()));
        }
    }

    @PutMapping("/seances/{seanceId}/presences/mark-all")
    @PreAuthorize(AuthorizationMatrix.FORMATION_UPDATE)
    public ResponseEntity<Object> markAllPresences(@PathVariable("seanceId") Long seanceId,
                                                   @RequestParam("present") boolean present) {
        try {
            List<PresenceDTO> updated = formationWorkflowService.markAllPresences(seanceId, present);
            return ResponseEntity.ok(updated);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(KEY_ERROR, e.getMessage()));
        } catch (Exception e) {
            log.error("Erreur lors du mark-all des presences (seance {}) : {}", seanceId, e.getMessage());
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(KEY_ERROR, MSG_ERREUR_INTERNE, KEY_MESSAGE, e.getMessage()));
        }
    }

    @GetMapping("/seances/{seanceId}/presences/stats")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<SeancePresenceStatsDTO> getSeancePresenceStats(@PathVariable("seanceId") Long seanceId) {
        return ResponseEntity.ok(formationWorkflowService.getSeancePresenceStats(seanceId));
    }

    @GetMapping("/achevees")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<Object> getFormationsAchevees() {
        try {
            List<FormationDTO> achevees = formationWorkflowService.getFormationsAchevees();
            return ResponseEntity.ok(achevees);
        } catch (Exception e) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(KEY_ERROR, MSG_ERREUR_INTERNE, KEY_MESSAGE, e.getMessage()));
        }
    }

    @GetMapping("/with-documents")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<List<FormationWithDocumentsDTO>> getAllFormationsWithDocuments() {
        List<FormationWithDocumentsDTO> dtos = formationWorkflowService.getAllFormationsWithDocuments();
        return ResponseEntity.ok(dtos);
    }

    @GetMapping("/enseignants/{id}/calendar")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<FormationsByRoleDTO> getCalendarFormations(@PathVariable("id") String enseignantId) {
        FormationsByRoleDTO dto = formationWorkflowService.getFormationsForCalendar(enseignantId);
        return ResponseEntity.ok(dto);
    }

    @PutMapping("/{id}/inscriptionsOuvertes")
    @PreAuthorize(AuthorizationMatrix.FORMATION_UPDATE)
    public FormationDTO updateInscriptionsOuvertes(@PathVariable Long id, @RequestParam boolean ouvert) {
        return formationWorkflowService.setInscriptionsOuvertes(id, ouvert);
    }

    @GetMapping("/visibles")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public List<FormationDTO> getFormationsVisibles() {
        return formationWorkflowService.getFormationsVisibles();
    }

    @GetMapping("/par-up")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public List<FormationDTO> getFormationsParUp(@RequestParam String upId) {
        return formationWorkflowService.getFormationsParUp(upId);
    }

    @GetMapping("/par-departement")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public List<FormationDTO> getFormationsParDepartement(@RequestParam String deptId) {
        return formationWorkflowService.getFormationsParDepartement(deptId);
    }
}
