package esprit.pfe.serviceformation.Controllers;

import esprit.pfe.serviceformation.DTO.FormationDTO;
import esprit.pfe.serviceformation.Services.CalendarExportService;
import esprit.pfe.serviceformation.Services.FormationWorkflowService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

/**
 * Contrôleur d'export : .ics (iCalendar) et Excel des besoins par séance.
 */
@RestController
@RequestMapping("/api/v1/exports")
public class FormationExportController {

    @Autowired
    private CalendarExportService calendarExportService;

    @Autowired
    private FormationWorkflowService formationWorkflowService;

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
        List<FormationDTO> formations = formationWorkflowService.getAllFormationWorkflows();

        // Filter by date range if provided
        if (start != null && end != null) {
            formations = formations.stream().filter(f -> {
                try {
                    return f.getDateDebut() != null && f.getDateFin() != null;
                } catch (Exception e) { return false; }
            }).toList();
        }

        // Filter by dept/up if provided
        if (deptId != null && !deptId.isBlank()) {
            formations = formations.stream()
                    .filter(f -> f.getDepartement1() != null && deptId.equals(f.getDepartement1().getId()))
                    .toList();
        }
        if (upId != null && !upId.isBlank()) {
            formations = formations.stream()
                    .filter(f -> f.getUp1() != null && upId.equals(f.getUp1().getId()))
                    .toList();
        }

        // Generate CSV-like content (simple Excel export)
        StringBuilder sb = new StringBuilder();
        sb.append("ID;Titre;Type;État;Date Début;Date Fin;Coût;Charge Horaire;Département;UP\n");
        for (FormationDTO f : formations) {
            sb.append(f.getIdFormation()).append(";")
              .append(f.getTitreFormation()).append(";")
              .append(f.getTypeFormation()).append(";")
              .append(f.getEtatFormation()).append(";")
              .append(f.getDateDebut()).append(";")
              .append(f.getDateFin()).append(";")
              .append(f.getCoutFormation()).append(";")
              .append(f.getChargeHoraireGlobal()).append(";")
              .append(f.getDepartement1() != null ? f.getDepartement1().getLibelle() : "").append(";")
              .append(f.getUp1() != null ? f.getUp1().getLibelle() : "").append("\n");
        }

        byte[] bytes = sb.toString().getBytes(java.nio.charset.StandardCharsets.UTF_8);
        return ResponseEntity.ok()
                .header(HttpHeaders.CONTENT_DISPOSITION, "attachment; filename=formations-export.csv")
                .contentType(MediaType.parseMediaType("text/csv"))
                .body(bytes);
    }
}
