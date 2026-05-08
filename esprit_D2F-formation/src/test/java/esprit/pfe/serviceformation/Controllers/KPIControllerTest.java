package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.services.KPIService;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;


import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(KPIController.class)
@DisplayName("KPIController - Tests unitaires")
class KPIControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private KPIService kpiService;

    @Test
    @DisplayName("GET /api/v1/kpi/formations - Succès")
    @WithMockUser(roles = "ADMIN")
    void shouldCountTotalFormations() throws Exception {
        when(kpiService.countTotalFormations(any(), any())).thenReturn(10);

        mockMvc.perform(get("/api/v1/kpi/formations")
                        .param("start", "2024-01-01")
                        .param("end", "2024-12-31"))
                .andExpect(status().isOk())
                .andExpect(content().string("10"));
    }

    @Test
    @DisplayName("GET /api/v1/kpi/top-participants - Succès")
    @WithMockUser(roles = "ADMIN")
    void shouldGetTopParticipants() throws Exception {
        EnseignantStatsDTO stats = new EnseignantStatsDTO("E1", "Nom", "Prenom", 5L);
        when(kpiService.getTopParticipants(any(), any(), any(), any())).thenReturn(List.of(stats));

        mockMvc.perform(get("/api/v1/kpi/top-participants")
                        .param("start", "2024-01-01")
                        .param("end", "2024-12-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].enseignantId").value("E1"))
                .andExpect(jsonPath("$[0].totalPresences").value(5));
    }

    @Test
    @DisplayName("GET /api/v1/kpi/count-heures - Succès")
    @WithMockUser(roles = "ADMIN")
    void shouldCountAndHeuresWithFilters() throws Exception {
        CountHeuresDTO dto = new CountHeuresDTO(5L, 100L);
        when(kpiService.getCountAndSumHeures(any(), any(), any(), any(), any(), any(), any(), any()))
                .thenReturn(dto);

        mockMvc.perform(get("/api/v1/kpi/count-heures")
                        .param("start", "2024-01-01")
                        .param("end", "2024-12-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(5))
                .andExpect(jsonPath("$.totalHeures").value(100));
    }
}
