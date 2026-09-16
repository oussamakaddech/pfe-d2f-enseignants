package esprit.pfe.serviceformation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceformation.common.PageResponse;
import esprit.pfe.serviceformation.dto.calendar.CalendarFormationDTO;
import esprit.pfe.serviceformation.dto.calendar.CalendarParticipantDTO;
import esprit.pfe.serviceformation.dto.calendar.ConflictReportDTO;
import esprit.pfe.serviceformation.dto.calendar.ImportReportDTO;
import esprit.pfe.serviceformation.dto.calendar.ParsedCalendarDTO;
import esprit.pfe.serviceformation.dto.calendar.SendInvitationsResultDTO;
import esprit.pfe.serviceformation.services.CalendarExportService;
import esprit.pfe.serviceformation.services.calendar.CalendarConflictService;
import esprit.pfe.serviceformation.services.calendar.CalendarInvitationService;
import esprit.pfe.serviceformation.services.calendar.CalendarQueryService;
import esprit.pfe.serviceformation.services.calendar.WorkshopCalendarImportService;
import io.swagger.v3.oas.annotations.Operation;
import io.swagger.v3.oas.annotations.tags.Tag;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.nio.charset.StandardCharsets;

/**
 * API de gestion du calendrier des ateliers : import Excel, aperçu, détection de
 * conflits, export iCalendar (.ics) et envoi d'invitations.
 * <p>
 * Sécurité (DSI §12) : import et envoi d'invitations réservés à {@code ROLE_ADMIN}
 * ({@link AuthorizationMatrix#REFERENTIEL_IMPORT}) ; lectures et exports ouverts
 * aux utilisateurs authentifiés autorisés ({@link AuthorizationMatrix#FORMATION_READ}).
 */
@RestController
@RequestMapping("/api/v1/calendar")
@RequiredArgsConstructor
@Tag(name = "Calendrier", description = "Import, conflits, export .ics et invitations du calendrier des ateliers")
public class CalendarController {

    private static final String CALENDAR_MEDIA_TYPE = "text/calendar";

    private final WorkshopCalendarImportService importService;
    private final CalendarQueryService queryService;
    private final CalendarConflictService conflictService;
    private final CalendarExportService exportService;
    private final CalendarInvitationService invitationService;

    // ==================== IMPORT ====================

    @Operation(summary = "Importer un calendrier Excel (.xlsx) et persister les données")
    @PostMapping(value = "/import", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_IMPORT)
    public ResponseEntity<ImportReportDTO> importCalendar(
            @RequestParam("file") MultipartFile file,
            @RequestParam(value = "force", defaultValue = "false") boolean force) {
        return ResponseEntity.ok(importService.importCalendar(file, force));
    }

    @Operation(summary = "Prévisualiser un calendrier Excel sans persistance (parsing + problèmes détectés)")
    @PostMapping(value = "/import/preview", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_IMPORT)
    public ResponseEntity<ParsedCalendarDTO> previewImport(@RequestParam("file") MultipartFile file) {
        return ResponseEntity.ok(importService.preview(file));
    }

    // ==================== LECTURES ====================

    @Operation(summary = "Lister les formations planifiées (paginé, filtres titre/état)")
    @GetMapping("/formations")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<PageResponse<CalendarFormationDTO>> listFormations(
            @RequestParam(required = false) String titre,
            @RequestParam(required = false) String etat,
            @PageableDefault(size = 20) Pageable pageable) {
        return ResponseEntity.ok(queryService.listFormations(titre, etat, pageable));
    }

    @Operation(summary = "Détail calendrier d'une formation")
    @GetMapping("/formations/{id}")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<CalendarFormationDTO> getFormation(@PathVariable Long id) {
        return ResponseEntity.ok(queryService.getFormation(id));
    }

    @Operation(summary = "Participants d'une formation (paginé)")
    @GetMapping("/formations/{id}/participants")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<PageResponse<CalendarParticipantDTO>> getParticipants(
            @PathVariable Long id,
            @PageableDefault(size = 50) Pageable pageable) {
        return ResponseEntity.ok(queryService.getParticipants(id, pageable));
    }

    @Operation(summary = "Rapport de détection des conflits sur l'ensemble du calendrier")
    @GetMapping("/conflicts")
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<ConflictReportDTO> detectConflicts() {
        return ResponseEntity.ok(conflictService.detectAllConflicts());
    }

    // ==================== EXPORT .ICS ====================

    @Operation(summary = "Exporter tout le calendrier au format .ics")
    @GetMapping(value = "/export/ics/all", produces = CALENDAR_MEDIA_TYPE)
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<byte[]> exportAll() {
        return icsResponse(exportService.generateIcsForAll(), "calendrier-complet.ics");
    }

    @Operation(summary = "Exporter une formation au format .ics")
    @GetMapping(value = "/export/ics/formation/{id}", produces = CALENDAR_MEDIA_TYPE)
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<byte[]> exportFormation(@PathVariable Long id) {
        return icsResponse(exportService.generateIcsForFormation(id), "formation-" + id + ".ics");
    }

    @Operation(summary = "Exporter le calendrier personnel d'un participant (par e-mail) au format .ics")
    @GetMapping(value = "/export/ics/participant/{email:.+}", produces = CALENDAR_MEDIA_TYPE)
    @PreAuthorize(AuthorizationMatrix.FORMATION_READ)
    public ResponseEntity<byte[]> exportParticipant(@PathVariable String email) {
        return icsResponse(exportService.generateIcsForParticipantEmail(email), "mon-calendrier.ics");
    }

    // ==================== INVITATIONS ====================

    @Operation(summary = "Envoyer les invitations (.ics) aux participants d'une formation")
    @PostMapping("/send-invitations/{formationId}")
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_IMPORT)
    public ResponseEntity<SendInvitationsResultDTO> sendInvitations(@PathVariable Long formationId) {
        return ResponseEntity.accepted().body(invitationService.sendForFormation(formationId));
    }

    @Operation(summary = "Envoyer les invitations (.ics) pour toutes les formations planifiées")
    @PostMapping("/send-invitations/all")
    @PreAuthorize(AuthorizationMatrix.REFERENTIEL_IMPORT)
    public ResponseEntity<SendInvitationsResultDTO> sendAllInvitations() {
        return ResponseEntity.accepted().body(invitationService.sendForAll());
    }

    // ==================== HELPERS ====================

    private ResponseEntity<byte[]> icsResponse(String ics, String filename) {
        byte[] body = ics.getBytes(StandardCharsets.UTF_8);
        return ResponseEntity.status(HttpStatus.OK)
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=\"" + filename + "\"")
                .contentType(MediaType.parseMediaType(CALENDAR_MEDIA_TYPE + "; charset=UTF-8"))
                .body(body);
    }
}
