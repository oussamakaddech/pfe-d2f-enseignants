package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.services.CalendarExportService;
import esprit.pfe.serviceformation.services.FormationWorkflowService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class FormationExportControllerTest {

    private MockMvc mockMvc;

    @Mock private CalendarExportService calendarExportService;
    @Mock private FormationWorkflowService formationWorkflowService;
    @InjectMocks private FormationExportController controller;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).setCustomArgumentResolvers(new org.springframework.data.web.PageableHandlerMethodArgumentResolver()).build();
    }

    @Test
    void testExportIcsForFormation() throws Exception {
        when(calendarExportService.generateIcsForFormation(anyLong())).thenReturn("BEGIN:VCALENDAR...");
        mockMvc.perform(get("/api/v1/exports/formation/1/ics")).andExpect(status().isOk());
    }

    @Test
    void testExportIcsForEnseignant() throws Exception {
        when(calendarExportService.generateIcsForEnseignant(anyString())).thenReturn("BEGIN:VCALENDAR...");
        mockMvc.perform(get("/api/v1/exports/enseignant/E1/ics")).andExpect(status().isOk());
    }

    @Test
    void testExportFormationsExcel_Filters() throws Exception {
        FormationDTO f1 = new FormationDTO();
        f1.setIdFormation(1L);
        f1.setTitreFormation("T1");
        f1.setDateDebut(LocalDate.of(2026, 1, 1));
        f1.setDateFin(LocalDate.of(2026, 1, 31));

        DeptDTO d1 = new DeptDTO(); d1.setId("D1"); d1.setLibelle("Dept1");
        f1.setDepartement(d1);

        UpDTO u1 = new UpDTO(); u1.setId("U1"); u1.setLibelle("Up1");
        f1.setUp(u1);

        when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(List.of(f1));

        // Test with all filters
        mockMvc.perform(get("/api/v1/exports/formations/excel")
                .param("start", "2023-01-01")
                .param("end", "2023-12-31")
                .param("deptId", "D1")
                .param("upId", "U1")).andExpect(status().isOk());
        
        // Test with non-matching filters
        mockMvc.perform(get("/api/v1/exports/formations/excel")
                .param("deptId", "D2")).andExpect(status().isOk());
    }
}

