package esprit.pfe.serviceformation.controllers;



import esprit.d2f.common.security.AuthorizationMatrix;
import esprit.pfe.serviceformation.dto.ParticipantKpiDTO;
import esprit.pfe.serviceformation.services.ParticipantKpiService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableDefault;
import org.springframework.http.ResponseEntity;

import java.util.Date;


@RestController
@RequestMapping("/api/v1/kpi/participants")
@RequiredArgsConstructor
@PreAuthorize(AuthorizationMatrix.DASHBOARD_ADMIN_LIMITED)
public class ParticipantKpiController {

    private final ParticipantKpiService participantKpiService;

    // KPI par formation achevée dans une période donnée
    @GetMapping("/formations")
    public ResponseEntity<Page<ParticipantKpiDTO>> getFormationsParticipantKpis(
            @RequestParam("startDate") @DateTimeFormat(pattern = "yyyy-MM-dd") Date startDate,
            @RequestParam("endDate") @DateTimeFormat(pattern = "yyyy-MM-dd") Date endDate,
            @PageableDefault(size = 20, sort = "formationId") Pageable pageable) {
        return ResponseEntity.ok(participantKpiService.getParticipantKpis(startDate, endDate, pageable));
    }

    // KPI global sur toutes les formations achevées dans une période donnée
    @GetMapping("/global")
    public ParticipantKpiDTO getGlobalParticipantKpi(
            @RequestParam("startDate") @DateTimeFormat(pattern = "yyyy-MM-dd") Date startDate,
            @RequestParam("endDate") @DateTimeFormat(pattern = "yyyy-MM-dd") Date endDate) {
        return participantKpiService.getGlobalParticipantKpi(startDate, endDate);
    }
}

