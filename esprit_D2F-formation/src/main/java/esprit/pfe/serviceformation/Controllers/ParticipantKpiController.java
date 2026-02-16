package esprit.pfe.serviceformation.Controllers;



import esprit.pfe.serviceformation.DTO.ParticipantKpiDTO;
import esprit.pfe.serviceformation.Services.ParticipantKpiService;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;
import java.util.Date;
import java.util.List;

@RestController
@RequestMapping("/kpi/participants")
@RequiredArgsConstructor
public class ParticipantKpiController {

    private final ParticipantKpiService participantKpiService;

    // KPI par formation achevée dans une période donnée
    @GetMapping("/formations")
    public List<ParticipantKpiDTO> getFormationsParticipantKpis(
            @RequestParam("startDate") @DateTimeFormat(pattern = "yyyy-MM-dd") Date startDate,
            @RequestParam("endDate") @DateTimeFormat(pattern = "yyyy-MM-dd") Date endDate) {
        return participantKpiService.getParticipantKpis(startDate, endDate);
    }

    // KPI global sur toutes les formations achevées dans une période donnée
    @GetMapping("/global")
    public ParticipantKpiDTO getGlobalParticipantKpi(
            @RequestParam("startDate") @DateTimeFormat(pattern = "yyyy-MM-dd") Date startDate,
            @RequestParam("endDate") @DateTimeFormat(pattern = "yyyy-MM-dd") Date endDate) {
        return participantKpiService.getGlobalParticipantKpi(startDate, endDate);
    }
}
