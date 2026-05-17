package esprit.pfe.serviceformation.controllers;

import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.services.KPIService;
import jakarta.persistence.EntityNotFoundException;
import lombok.RequiredArgsConstructor;

import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Date;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/v1/kpi")
@RequiredArgsConstructor
@PreAuthorize(AuthorizationMatrix.DASHBOARD_ADMIN_LIMITED)
public class KPIController {

    private final KPIService kpiService;
    private static final String KEY_ERROR = "error";

    @GetMapping("/formations")
    public int countTotalFormations(
            @RequestParam("start") @DateTimeFormat(pattern = "yyyy-MM-dd") Date start,
            @RequestParam("end") @DateTimeFormat(pattern = "yyyy-MM-dd") Date end) {
        return kpiService.countTotalFormations(start, end);
    }

    @GetMapping("/heures")
    public int calculateTotalHeures(
            @RequestParam("start") @DateTimeFormat(pattern = "yyyy-MM-dd") Date start,
            @RequestParam("end") @DateTimeFormat(pattern = "yyyy-MM-dd") Date end) {
        return kpiService.calculateTotalHeures(start, end);
    }

    @GetMapping("/participants")
    public int countUniqueParticipants(
            @RequestParam("start") @DateTimeFormat(pattern = "yyyy-MM-dd") Date start,
            @RequestParam("end") @DateTimeFormat(pattern = "yyyy-MM-dd") Date end) {
        return kpiService.countUniqueParticipants(start, end);
    }

    @GetMapping("/formations-by-etat")
    public FormationsByEtatDTO getFormationsByEtat(
            @RequestParam("start") @DateTimeFormat(pattern = "yyyy-MM-dd") Date start,
            @RequestParam("end") @DateTimeFormat(pattern = "yyyy-MM-dd") Date end) {
        return kpiService.getFormationsByEtat(start, end);
    }

    @GetMapping("/top-participants")
    public ResponseEntity<Object> topParticipants(
            @RequestParam(required = false) String upId,
            @RequestParam(required = false) String deptId,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") Date start,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") Date end
    ) {
        try {
            List<EnseignantStatsDTO> stats = kpiService.getTopParticipants(upId, deptId, start, end);
            return stats.isEmpty() ? ResponseEntity.noContent().build() : ResponseEntity.ok(stats);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of(KEY_ERROR, ex.getMessage()));
        } catch (EntityNotFoundException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(KEY_ERROR, ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(KEY_ERROR, "Erreur serveur interne"));
        }
    }

    @GetMapping("/top-absentees")
    public ResponseEntity<Object> topAbsentees(
            @RequestParam(required = false) String upId,
            @RequestParam(required = false) String deptId,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") Date start,
            @RequestParam @DateTimeFormat(pattern = "yyyy-MM-dd") Date end
    ) {
        try {
            List<EnseignantStatsDTO> stats = kpiService.getTopAbsentees(upId, deptId, start, end);
            return stats.isEmpty() ? ResponseEntity.noContent().build() : ResponseEntity.ok(stats);
        } catch (IllegalArgumentException ex) {
            return ResponseEntity.badRequest().body(Map.of(KEY_ERROR, ex.getMessage()));
        } catch (EntityNotFoundException ex) {
            return ResponseEntity.status(HttpStatus.NOT_FOUND).body(Map.of(KEY_ERROR, ex.getMessage()));
        } catch (Exception ex) {
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(Map.of(KEY_ERROR, "Erreur serveur interne"));
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
        FormationFilter filter = FormationFilter.builder()
                .competence(competence).domaine(domaine).upId(upId).deptId(deptId)
                .ouverte(ouverte).start(start).end(end).build();
        return ResponseEntity.ok(kpiService.getCountAndSumHeures(filter, etat));
    }

    @GetMapping("/formations-by-type-filtered")
    public ResponseEntity<FormationsByTypeDTO> getFormationsByTypeFiltered(
            @RequestParam(required = false) String competence,
            @RequestParam(required = false) String domaine,
            @RequestParam(required = false) Long upId,
            @RequestParam(required = false) Long deptId,
            @RequestParam(required = false) Boolean ouverte,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") Date start,
            @RequestParam(required = false) @DateTimeFormat(pattern = "yyyy-MM-dd") Date end,
            @RequestParam(required = false) String etat
    ) {
        FormationFilter filter = FormationFilter.builder()
                .competence(competence).domaine(domaine).upId(upId).deptId(deptId)
                .ouverte(ouverte).start(start).end(end).build();
        return ResponseEntity.ok(kpiService.getFormationsByTypeWithFilters(filter, etat));
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
        FormationFilter filter = FormationFilter.builder()
                .competence(competence).domaine(domaine).upId(upId).deptId(deptId)
                .ouverte(ouverte).start(start).end(end).build();
        return kpiService.getCountByTrainerTypeWithIds(filter, etat);
    }
}
