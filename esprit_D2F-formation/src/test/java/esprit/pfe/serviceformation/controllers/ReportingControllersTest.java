package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.services.FormationReportService;
import esprit.pfe.serviceformation.services.KPIService;
import esprit.pfe.serviceformation.services.ParticipantKpiService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class ReportingControllersTest {

    private MockMvc mockMvcReport;
    private MockMvc mockMvcKpi;

    @Mock private FormationReportService reportService;
    @Mock private KPIService kpiService;
    @Mock private ParticipantKpiService participantKpiService;

    @BeforeEach
    void setup() {
        mockMvcReport = MockMvcBuilders.standaloneSetup(new FormationReportController(reportService)).build();
        mockMvcKpi = MockMvcBuilders.standaloneSetup(new KPIController(kpiService)).build();
    }

    @Test
    void testGetReport() throws Exception {
        when(reportService.getFormationsParRoleEtPeriode(anyString(), anyString(), any(), any())).thenReturn(Collections.emptyList());
        mockMvcReport.perform(get("/api/v1/formation-report")
                .param("role", "animateur")
                .param("enseignantId", "E1")
                .param("start", "2026-01-01")
                .param("end", "2026-12-31"))
                .andExpect(status().isOk());
    }

    @Test
    void testKPIFormations() throws Exception {
        when(kpiService.countTotalFormations(any(), any())).thenReturn(5);
        mockMvcKpi.perform(get("/api/v1/kpi/formations")
                .param("start", "2026-01-01")
                .param("end", "2026-12-31"))
                .andExpect(status().isOk());
    }
}
