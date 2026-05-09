package esprit.pfe.serviceformation.controllers;



import esprit.pfe.serviceformation.services.FormationReportService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import lombok.RequiredArgsConstructor;

import java.util.Date;
import java.util.List;

@RestController
@RequestMapping("/api/v1/formation-report")
@RequiredArgsConstructor
public class FormationReportController {
    private final FormationReportService reportService;

    /**
     * GET  /api/formation-report
     * @param role        "animateur" ou "participant"
     * @param enseignantId  identifiant de l'enseignant (String)
     * @param start       date de début de la période (ISO 8601: yyyy-MM-dd)
     * @param end         date de fin de la période   (ISO 8601: yyyy-MM-dd)
     * @return liste de DTO correspondant
     */
    @GetMapping
    public ResponseEntity<List<?>> getFormationsParRoleEtPeriode(
            @RequestParam String role,
            @RequestParam String enseignantId,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) Date start,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) Date end
    ) {
        List<?> dtoList = reportService.getFormationsParRoleEtPeriode(
                role, enseignantId, start, end
        );
        return ResponseEntity.ok(dtoList);
    }
}

