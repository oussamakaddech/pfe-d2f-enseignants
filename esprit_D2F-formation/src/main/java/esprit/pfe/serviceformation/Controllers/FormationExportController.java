package esprit.pfe.serviceformation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceformation.dto.FormationResponseDTO;
import esprit.pfe.serviceformation.services.CalendarExportService;
import esprit.pfe.serviceformation.services.FormationWorkflowService;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;

import java.util.List;

/**
 * Contrôleur d'export : .ics (iCalendar) et Excel des besoins par séance.
 */
@RestController
@RequestMapping("/api/v1/exports")
@RequiredArgsConstructor
@PreAuthorize(AuthorizationMatrix.FORMATION_READ)
public class FormationExportController {
    private final CalendarExportService calendarExportService;
    private final FormationWorkflowService formationWorkflowService;

    /** Export .ics pour une formation */
    @GetMapping(value = "/formation/{formationId}/ics", produces = "text/calendar")
    public ResponseEntity<String> exportIcsForFormation(@PathVariable Long formationId) {
        String icsContent = calendarExportService.generateIcsForFormation(formationId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=formation-" + formationId + ".ics")
                .contentType(MediaType.parseMediaType("text/calendar"))
                .body(icsContent);
    }

    /** Export .ics pour un enseignant (toutes ses séances) */
    @GetMapping(value = "/enseignant/{enseignantId}/ics", produces = "text/calendar")
    public ResponseEntity<String> exportIcsForEnseignant(@PathVariable String enseignantId) {
        String icsContent = calendarExportService.generateIcsForEnseignant(enseignantId);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=enseignant-" + enseignantId + ".ics")
                .contentType(MediaType.parseMediaType("text/calendar"))
                .body(icsContent);
    }

    /** Export Excel des formations filtrées par période / département / UP */
    @GetMapping(value = "/formations/excel", produces = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet")
    public ResponseEntity<byte[]> exportFormationsExcel(
            @RequestParam(required = false) String start,
            @RequestParam(required = false) String end,
            @RequestParam(required = false) String deptId,
            @RequestParam(required = false) String upId
    ) {
        List<FormationResponseDTO> formations = filterFormations(start, end, deptId, upId);

        // Generate CSV-like content (simple Excel export)
        StringBuilder sb = new StringBuilder();
        sb.append("ID;Titre;Type;État;Date Début;Date Fin;Coût;Charge Horaire;Département;UP\n");
        for (FormationResponseDTO f : formations) {
            sb.append(f.getIdFormation()).append(";")
              .append(f.getTitreFormation()).append(";")
              .append(f.getTypeFormation()).append(";")
              .append(f.getEtatFormation()).append(";")
              .append(f.getDateDebut()).append(";")
              .append(f.getDateFin()).append(";")
              .append(f.getCoutFormation()).append(";")
              .append(f.getChargeHoraireGlobal()).append(";")
              .append(f.getDepartement() != null ? f.getDepartement().getLibelle() : "").append(";")
              .append(f.getUp() != null ? f.getUp().getLibelle() : "").append("\n");
        }

        byte[] bytes = sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=formations-export.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(bytes);
    }

    private List<FormationResponseDTO> filterFormations(String start, String end, String deptId, String upId) {
        List<FormationResponseDTO> formations = formationWorkflowService.getAllFormationWorkflows();

        if (start != null && end != null) {
            formations = formations.stream()
                    .filter(f -> f.getDateDebut() != null && f.getDateFin() != null)
                    .toList();
        }
        if (deptId != null && !deptId.isBlank()) {
            formations = formations.stream()
                    .filter(f -> f.getDepartement() != null && deptId.equals(f.getDepartement().getId()))
                    .toList();
        }
        if (upId != null && !upId.isBlank()) {
            formations = formations.stream()
                    .filter(f -> f.getUp() != null && upId.equals(f.getUp().getId()))
                    .toList();
        }
        return formations;
    }
}
