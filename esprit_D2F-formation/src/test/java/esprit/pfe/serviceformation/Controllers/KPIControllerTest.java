package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.services.KPIService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class KPIControllerTest {

    private MockMvc mockMvc;

    @Mock private KPIService kpiService;
    @InjectMocks private KPIController controller;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).build();
    }

    @Test
    void testFormationsCount() throws Exception {
        mockMvc.perform(get("/api/v1/kpi/formations")
                .param("start", "2023-01-01")
                .param("end", "2023-12-31")).andExpect(status().isOk());
    }

    @Test
    void testTopParticipants_Success() throws Exception {
        when(kpiService.getTopParticipants(any(), any(), any(), any())).thenReturn(List.of(new EnseignantStatsDTO("E1", "N", "P", 5L)));
        mockMvc.perform(get("/api/v1/kpi/top-participants")
                .param("start", "2023-01-01")
                .param("end", "2023-12-31")).andExpect(status().isOk());
    }

    @Test
    void testTopParticipants_NoContent() throws Exception {
        when(kpiService.getTopParticipants(any(), any(), any(), any())).thenReturn(Collections.emptyList());
        mockMvc.perform(get("/api/v1/kpi/top-participants")
                .param("start", "2023-01-01")
                .param("end", "2023-12-31")).andExpect(status().isNoContent());
    }

    @Test
    void testTopParticipants_BadRequest() throws Exception {
        when(kpiService.getTopParticipants(any(), any(), any(), any())).thenThrow(new IllegalArgumentException("Err"));
        mockMvc.perform(get("/api/v1/kpi/top-participants")
                .param("start", "2023-01-01")
                .param("end", "2023-12-31")).andExpect(status().isBadRequest());
    }

    @Test
    void testTopParticipants_NotFound() throws Exception {
        when(kpiService.getTopParticipants(any(), any(), any(), any())).thenThrow(new EntityNotFoundException("Err"));
        mockMvc.perform(get("/api/v1/kpi/top-participants")
                .param("start", "2023-01-01")
                .param("end", "2023-12-31")).andExpect(status().isNotFound());
    }

    @Test
    void testTopParticipants_ServerError() throws Exception {
        when(kpiService.getTopParticipants(any(), any(), any(), any())).thenThrow(new RuntimeException("Err"));
        mockMvc.perform(get("/api/v1/kpi/top-participants")
                .param("start", "2023-01-01")
                .param("end", "2023-12-31")).andExpect(status().isInternalServerError());
    }

    @Test
    void testTopAbsentees_Success() throws Exception {
        when(kpiService.getTopAbsentees(any(), any(), any(), any())).thenReturn(List.of(new EnseignantStatsDTO("E1", "N", "P", 5L)));
        mockMvc.perform(get("/api/v1/kpi/top-absentees")
                .param("start", "2023-01-01")
                .param("end", "2023-12-31")).andExpect(status().isOk());
    }

    @Test
    void testCountHeures() throws Exception {
        when(kpiService.getCountAndSumHeures(any(), any())).thenReturn(new CountHeuresDTO());
        mockMvc.perform(get("/api/v1/kpi/count-heures")).andExpect(status().isOk());
    }

    @Test
    void testFormationsByTypeFiltered() throws Exception {
        when(kpiService.getFormationsByTypeWithFilters(any(), any())).thenReturn(new FormationsByTypeDTO());
        mockMvc.perform(get("/api/v1/kpi/formations-by-type-filtered")).andExpect(status().isOk());
    }

    @Test
    void testCountByTrainerTypeWithIds() throws Exception {
        when(kpiService.getCountByTrainerTypeWithIds(any(), any())).thenReturn(new CountByTrainerTypeWithIdsDTO());
        mockMvc.perform(get("/api/v1/kpi/count-by-trainer-type-with-ids")).andExpect(status().isOk());
    }
}
