package esprit.pfe.serviceformation.Controllers;

import esprit.pfe.serviceformation.DTO.*;
import esprit.pfe.serviceformation.Services.KPIService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/kpi")
@RequiredArgsConstructor
public class KPIController {
@Autowired
   KPIService kpiService;

    // Endpoint pour obtenir le nombre total de formations
    @GetMapping("/formations")
    public int countTotalFormations(
            @RequestParam("start") @DateTimeFormat(pattern = "yyyy-MM-dd") Date start,
            @RequestParam("end") @DateTimeFormat(pattern = "yyyy-MM-dd") Date end) {
        return kpiService.countTotalFormations(start, end);
    }

    // Endpoint pour obtenir le total des heures de formation
    @GetMapping("/heures")
    public int calculateTotalHeures(
            @RequestParam("start") @DateTimeFormat(pattern = "yyyy-MM-dd") Date start,
            @RequestParam("end") @DateTimeFormat(pattern = "yyyy-MM-dd") Date end) {
        return kpiService.calculateTotalHeures(start, end);
    }

    // Endpoint pour obtenir le nombre de participants uniques
    @GetMapping("/participants")
    public int countUniqueParticipants(
            @RequestParam("start") @DateTimeFormat(pattern = "yyyy-MM-dd") Date start,
            @RequestParam("end") @DateTimeFormat(pattern = "yyyy-MM-dd") Date end) {
        return kpiService.countUniqueParticipants(start, end);
    }

    // Nouvel endpoint pour obtenir le nombre de formations par état
    @GetMapping("/formations-by-etat")
    public FormationsByEtatDTO getFormationsByEtat(
            @RequestParam("start") @DateTimeFormat(pattern = "yyyy-MM-dd") Date start,
            @RequestParam("end") @DateTimeFormat(pattern = "yyyy-MM-dd") Date end) {
        return kpiService.getFormationsByEtat(start, end);
    }
    @GetMapping("/top-participants")
    public ResponseEntity<?> topParticipants(
            @RequestParam(required = false) String upId,
            @RequestParam(required = false) String deptId,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") Date start,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") Date end
    ) {
        try {
            List<EnseignantStatsDTO> stats =
                    kpiService.getTopParticipants(upId, deptId, start, end);

            if (stats.isEmpty()) {
                return ResponseEntity.noContent().build();
            }
            return ResponseEntity.ok(stats);

        } catch (IllegalArgumentException ex) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", ex.getMessage()));

        } catch (EntityNotFoundException ex) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", ex.getMessage()));

        } catch (Exception ex) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur serveur interne"));
        }
    }

    /** Top des enseignants les plus absents sur les formations achevées */
    @GetMapping("/top-absentees")
    public ResponseEntity<?> topAbsentees(
            @RequestParam(required = false) String upId,
            @RequestParam(required = false) String deptId,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") Date start,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") Date end
    ) {
        try {
            List<EnseignantStatsDTO> stats =
                    kpiService.getTopAbsentees(upId, deptId, start, end);

            if (stats.isEmpty()) {
                return ResponseEntity.noContent().build();
            }
            return ResponseEntity.ok(stats);

        } catch (IllegalArgumentException ex) {
            return ResponseEntity
                    .badRequest()
                    .body(Map.of("error", ex.getMessage()));

        } catch (EntityNotFoundException ex) {
            return ResponseEntity
                    .status(HttpStatus.NOT_FOUND)
                    .body(Map.of("error", ex.getMessage()));

        } catch (Exception ex) {
            return ResponseEntity
                    .status(HttpStatus.INTERNAL_SERVER_ERROR)
                    .body(Map.of("error", "Erreur serveur interne"));
        }
    }
    @GetMapping("/enseignants-non-affectes")
    public List<EnseignantDTO> getEnseignantsNonAffectes(
            @RequestParam("start") @DateTimeFormat(pattern = "yyyy-MM-dd") Date start,
            @RequestParam("end")   @DateTimeFormat(pattern = "yyyy-MM-dd") Date end
    ) {
        return kpiService.getEnseignantsNonAffectes(start, end);
    }
    @GetMapping("/count-heures")
    public ResponseEntity<CountHeuresDTO> countAndHeuresWithFilters(
            @RequestParam(required = false) String competence,
            @RequestParam(required = false) String domaine,
            @RequestParam(required = false) Long upId,
            @RequestParam(required = false) Long deptId,
            @RequestParam(required = false) Boolean ouverte,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") Date start,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") Date end,
            @RequestParam(required = false) String etat
    ) {
        CountHeuresDTO dto = kpiService.getCountAndSumHeures(
                competence, domaine, upId, deptId, ouverte, start, end, etat
        );
        return ResponseEntity.ok(dto);
    }

    @GetMapping("/formations-by-type-filtered")
    public ResponseEntity<FormationsByTypeDTO> getFormationsByTypeFiltered(
            @RequestParam(required = false) String competence,
            @RequestParam(required = false) String domaine,
            @RequestParam(required = false) Long upId,
            @RequestParam(required = false) Long deptId,
            @RequestParam(required = false) Boolean ouverte,
            @RequestParam(required = false)
            @DateTimeFormat(pattern = "yyyy-MM-dd") Date start,
            @RequestParam(required = false)
            @DateTimeFormat(pattern = "yyyy-MM-dd") Date end,
            @RequestParam(required = false) String etat
    ) {
        FormationsByTypeDTO dto = kpiService.getFormationsByTypeWithFilters(
                competence, domaine, upId, deptId, ouverte, start, end, etat
        );
        return ResponseEntity.ok(dto);
    }
    @GetMapping("/count-by-trainer-type-with-ids")
    public CountByTrainerTypeWithIdsDTO countByTrainerTypeWithIds(
            @RequestParam(required = false) String competence,
            @RequestParam(required = false) String domaine,
            @RequestParam(required = false) Long upId,
            @RequestParam(required = false) Long deptId,
            @RequestParam(required = false) Boolean ouverte,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) Date start,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) Date end,
            @RequestParam(required = false) String etat
    ) {
        return kpiService.getCountByTrainerTypeWithIds(
                competence, domaine, upId, deptId, ouverte, start, end, etat
        );
    }

}
