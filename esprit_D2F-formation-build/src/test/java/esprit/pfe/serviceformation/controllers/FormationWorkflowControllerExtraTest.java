package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.services.ExportExcelService;
import esprit.pfe.serviceformation.services.FormationWorkflowService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
@DisplayName("FormationWorkflowController - Tests supplementaires")
class FormationWorkflowControllerExtraTest {

    private MockMvc mockMvc;

    private static final String FORMATION_JSON = "{\"titreFormation\":\"Test Formation\",\"dateDebut\":\"2023-01-01T00:00:00.000+00:00\",\"dateFin\":\"2023-01-02T00:00:00.000+00:00\",\"typeFormation\":\"INTERNE\"}";

    @Mock private ExportExcelService exportExcelService;
    @Mock private FormationWorkflowService formationWorkflowService;
    @InjectMocks private FormationWorkflowController controller;

    @BeforeEach
    void setup() {
        mockMvc = MockMvcBuilders.standaloneSetup(controller).setCustomArgumentResolvers(new org.springframework.data.web.PageableHandlerMethodArgumentResolver()).build();
    }

    @Test
    @DisplayName("createFormation - IllegalStateException retourne 400")
    void createFormation_IllegalState() throws Exception {
        when(formationWorkflowService.createFormationWorkflow(any())).thenThrow(new IllegalStateException("Business error"));
        mockMvc.perform(post("/api/v1/formations-workflow")
                .contentType(MediaType.APPLICATION_JSON)
                .content(FORMATION_JSON))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("createFormation - IllegalArgumentException retourne 400")
    void createFormation_IllegalArgument() throws Exception {
        when(formationWorkflowService.createFormationWorkflow(any())).thenThrow(new IllegalArgumentException("Invalid arg"));
        mockMvc.perform(post("/api/v1/formations-workflow")
                .contentType(MediaType.APPLICATION_JSON)
                .content(FORMATION_JSON))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("createFormation - Exception generique retourne 500")
    void createFormation_InternalError() throws Exception {
        when(formationWorkflowService.createFormationWorkflow(any())).thenThrow(new RuntimeException("Unexpected"));
        mockMvc.perform(post("/api/v1/formations-workflow")
                .contentType(MediaType.APPLICATION_JSON)
                .content(FORMATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    @Test
    @DisplayName("updateFormation - retourne 404 quand formation non trouvee")
    void updateFormation_NotFound() throws Exception {
        when(formationWorkflowService.updateFormationWorkflow(anyLong(), any())).thenReturn(null);
        mockMvc.perform(put("/api/v1/formations-workflow/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(FORMATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("updateFormation - IllegalStateException retourne 400")
    void updateFormation_IllegalState() throws Exception {
        when(formationWorkflowService.updateFormationWorkflow(anyLong(), any())).thenThrow(new IllegalStateException("Error"));
        mockMvc.perform(put("/api/v1/formations-workflow/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(FORMATION_JSON))
                .andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("updateFormation - IllegalArgumentException retourne 404")
    void updateFormation_IllegalArgument() throws Exception {
        when(formationWorkflowService.updateFormationWorkflow(anyLong(), any())).thenThrow(new IllegalArgumentException("Not found"));
        mockMvc.perform(put("/api/v1/formations-workflow/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(FORMATION_JSON))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("updateFormation - Exception generique retourne 500")
    void updateFormation_InternalError() throws Exception {
        when(formationWorkflowService.updateFormationWorkflow(anyLong(), any())).thenThrow(new RuntimeException("Unexpected"));
        mockMvc.perform(put("/api/v1/formations-workflow/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(FORMATION_JSON))
                .andExpect(status().isInternalServerError());
    }

    @Test
    @DisplayName("deleteFormation - IllegalArgumentException retourne 400")
    void deleteFormation_IllegalArgument() throws Exception {
        org.mockito.Mockito.doThrow(new IllegalArgumentException("Not found"))
                .when(formationWorkflowService).deleteFormationWorkflow(anyLong());
        mockMvc.perform(delete("/api/v1/formations-workflow/1")).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("deleteFormation - Exception generique retourne 500")
    void deleteFormation_InternalError() throws Exception {
        org.mockito.Mockito.doThrow(new RuntimeException("Unexpected"))
                .when(formationWorkflowService).deleteFormationWorkflow(anyLong());
        mockMvc.perform(delete("/api/v1/formations-workflow/1")).andExpect(status().isInternalServerError());
    }

    @Test
    @DisplayName("getAllFormations - Exception generique retourne 500")
    void getAllFormations_InternalError() throws Exception {
        when(formationWorkflowService.getAllFormationWorkflows()).thenThrow(new RuntimeException("DB error"));
        mockMvc.perform(get("/api/v1/formations-workflow")).andExpect(status().isInternalServerError());
    }

    @Test
    @DisplayName("updatePresence - RuntimeException retourne 400")
    void updatePresence_RuntimeException() throws Exception {
        org.mockito.Mockito.doThrow(new RuntimeException("Error"))
                .when(formationWorkflowService).updatePresence(anyLong(), anyBoolean(), anyString());
        mockMvc.perform(put("/api/v1/formations-workflow/presence/1")
                .param("present", "true")
                .param("commentaire", "OK")).andExpect(status().isBadRequest());
    }

    @Test
    @DisplayName("getPresencesBySeance - succes")
    void getPresencesBySeance_Success() throws Exception {
        when(formationWorkflowService.getPresencesBySeance(anyLong())).thenReturn(Collections.emptyList());
        mockMvc.perform(get("/api/v1/formations-workflow/seances/1/presences")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("batchUpdatePresences - succes")
    void batchUpdatePresences_Success() throws Exception {
        when(formationWorkflowService.batchUpdatePresences(anyLong(), any())).thenReturn(Collections.emptyList());
        mockMvc.perform(put("/api/v1/formations-workflow/seances/1/presences/batch")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"updates\":[]}"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("batchUpdatePresences - IllegalArgumentException retourne 404")
    void batchUpdatePresences_NotFound() throws Exception {
        when(formationWorkflowService.batchUpdatePresences(anyLong(), any())).thenThrow(new IllegalArgumentException("Not found"));
        mockMvc.perform(put("/api/v1/formations-workflow/seances/1/presences/batch")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"updates\":[]}"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("batchUpdatePresences - Exception generique retourne 500")
    void batchUpdatePresences_InternalError() throws Exception {
        when(formationWorkflowService.batchUpdatePresences(anyLong(), any())).thenThrow(new RuntimeException("Error"));
        mockMvc.perform(put("/api/v1/formations-workflow/seances/1/presences/batch")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"updates\":[]}"))
                .andExpect(status().isInternalServerError());
    }

    @Test
    @DisplayName("markAllPresences - succes")
    void markAllPresences_Success() throws Exception {
        when(formationWorkflowService.markAllPresences(anyLong(), anyBoolean())).thenReturn(Collections.emptyList());
        mockMvc.perform(put("/api/v1/formations-workflow/seances/1/presences/mark-all")
                .param("present", "true"))
                .andExpect(status().isOk());
    }

    @Test
    @DisplayName("markAllPresences - IllegalArgumentException retourne 404")
    void markAllPresences_NotFound() throws Exception {
        when(formationWorkflowService.markAllPresences(anyLong(), anyBoolean())).thenThrow(new IllegalArgumentException("Not found"));
        mockMvc.perform(put("/api/v1/formations-workflow/seances/1/presences/mark-all")
                .param("present", "true"))
                .andExpect(status().isNotFound());
    }

    @Test
    @DisplayName("markAllPresences - Exception generique retourne 500")
    void markAllPresences_InternalError() throws Exception {
        when(formationWorkflowService.markAllPresences(anyLong(), anyBoolean())).thenThrow(new RuntimeException("Error"));
        mockMvc.perform(put("/api/v1/formations-workflow/seances/1/presences/mark-all")
                .param("present", "true"))
                .andExpect(status().isInternalServerError());
    }

    @Test
    @DisplayName("getSeancePresenceStats - succes")
    void getSeancePresenceStats_Success() throws Exception {
        when(formationWorkflowService.getSeancePresenceStats(anyLong())).thenReturn(new SeancePresenceStatsDTO());
        mockMvc.perform(get("/api/v1/formations-workflow/seances/1/presences/stats")).andExpect(status().isOk());
    }

    @Test
    @DisplayName("getFormationsAchevees - Exception retourne 500")
    void getFormationsAchevees_InternalError() throws Exception {
        when(formationWorkflowService.getFormationsAchevees()).thenThrow(new RuntimeException("DB error"));
        mockMvc.perform(get("/api/v1/formations-workflow/achevees")).andExpect(status().isInternalServerError());
    }

    @Test
    @DisplayName("exportExcel - Exception retourne 500")
    void exportExcel_InternalError() throws Exception {
        when(exportExcelService.exportFormationsAvance(any(), any())).thenThrow(new RuntimeException("Excel error"));
        mockMvc.perform(get("/api/v1/formations-workflow/export/excel")
                .param("start", "2023-01-01")
                .param("end", "2023-12-31")).andExpect(status().isInternalServerError());
    }
}

