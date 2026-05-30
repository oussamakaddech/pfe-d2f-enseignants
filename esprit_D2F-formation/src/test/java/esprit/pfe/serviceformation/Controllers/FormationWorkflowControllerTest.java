package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.services.ExportExcelService;
import esprit.pfe.serviceformation.services.FormationMapper;
import esprit.pfe.serviceformation.services.FormationService;
import esprit.pfe.serviceformation.services.FormationWorkflowService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.MediaType;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyLong;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.anyBoolean;
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@ExtendWith(MockitoExtension.class)
class FormationWorkflowControllerTest {

    private MockMvc mockMvc;

    @Mock private ExportExcelService exportExcelService;
    @Mock private FormationWorkflowService formationWorkflowService;
    @Mock private FormationService formationService;
    @Mock private FormationMapper formationMapper;
    @InjectMocks private FormationWorkflowController controller;

    @BeforeEach
    void setup() {
        lenient().when(formationMapper.toResponseDTO(any())).thenReturn(new FormationResponseDTO());
        mockMvc = MockMvcBuilders.standaloneSetup(controller).setCustomArgumentResolvers(new org.springframework.data.web.PageableHandlerMethodArgumentResolver()).build();
    }

    @Test
    void testCreateFormation_Success() throws Exception {
        Formation formation = new Formation();
        formation.setIdFormation(1L);
        formation.setTitreFormation("Formation Test");
        when(formationWorkflowService.createFormationWorkflow(any())).thenReturn(formation);
        mockMvc.perform(post("/api/v1/formations-workflow")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"titreFormation\":\"Formation Test\",\"dateDebut\":\"2023-01-01T00:00:00.000+00:00\",\"dateFin\":\"2023-01-02T00:00:00.000+00:00\",\"typeFormation\":\"INTERNE\"}"))
                .andExpect(status().isCreated());
    }

    @Test
    void testCreateFormation_BadRequest() throws Exception {
        mockMvc.perform(post("/api/v1/formations-workflow")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}")).andExpect(status().isBadRequest());
    }

    @Test
    void testUpdateFormation_Success() throws Exception {
        Formation formation = new Formation();
        formation.setIdFormation(1L);
        formation.setTitreFormation("Formation Test");
        when(formationWorkflowService.updateFormationWorkflow(anyLong(), any())).thenReturn(formation);
        mockMvc.perform(put("/api/v1/formations-workflow/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{\"titreFormation\":\"Formation Test\",\"dateDebut\":\"2023-01-01T00:00:00.000+00:00\",\"dateFin\":\"2023-01-02T00:00:00.000+00:00\",\"typeFormation\":\"INTERNE\"}"))
                .andExpect(status().isOk());
    }

    @Test
    void testDeleteFormation_Success() throws Exception {
        mockMvc.perform(delete("/api/v1/formations-workflow/1")).andExpect(status().isOk());
    }

    @Test
    void testGetFormationById_Success() throws Exception {
        when(formationService.getFormationById(anyLong())).thenReturn(new FormationResponseDTO());
        mockMvc.perform(get("/api/v1/formations-workflow/1")).andExpect(status().isOk());
    }

    @Test
    void testGetFormationById_NotFound() throws Exception {
        lenient().when(formationService.getFormationById(anyLong())).thenThrow(new IllegalArgumentException("Not found"));
        mockMvc.perform(get("/api/v1/formations-workflow/1")).andExpect(status().isNotFound());
    }

    @Test
    void testGetAllFormations() throws Exception {
        when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(Collections.emptyList());
        mockMvc.perform(get("/api/v1/formations-workflow")).andExpect(status().isOk());
    }

    @Test
    void testUpdatePresence() throws Exception {
        mockMvc.perform(put("/api/v1/formations-workflow/presence/1")
                .param("present", "true")
                .param("commentaire", "OK")).andExpect(status().isOk());
    }

    @Test
    void testGetFormationsAchevees() throws Exception {
        when(formationWorkflowService.getFormationsAchevees()).thenReturn(Collections.emptyList());
        mockMvc.perform(get("/api/v1/formations-workflow/achevees")).andExpect(status().isOk());
    }

    @Test
    void testGetAllFormationsWithDocuments() throws Exception {
        when(formationWorkflowService.getAllFormationsWithDocuments()).thenReturn(Collections.emptyList());
        mockMvc.perform(get("/api/v1/formations-workflow/with-documents")).andExpect(status().isOk());
    }

    @Test
    void testGetCalendarFormations() throws Exception {
        when(formationWorkflowService.getFormationsForCalendar(anyString())).thenReturn(new FormationsByRoleDTO());
        mockMvc.perform(get("/api/v1/formations-workflow/enseignants/E1/calendar")).andExpect(status().isOk());
    }

    @Test
    void testUpdateInscriptionsOuvertes() throws Exception {
        when(formationWorkflowService.setInscriptionsOuvertes(anyLong(), anyBoolean())).thenReturn(new FormationResponseDTO());
        mockMvc.perform(put("/api/v1/formations-workflow/1/inscriptionsOuvertes")
                .param("ouvert", "true")).andExpect(status().isOk());
    }

    @Test
    void testGetFormationsVisibles() throws Exception {
        when(formationWorkflowService.getFormationsVisibles()).thenReturn(Collections.emptyList());
        mockMvc.perform(get("/api/v1/formations-workflow/visibles")).andExpect(status().isOk());
    }

    @Test
    void testGetFormationsParUp() throws Exception {
        when(formationWorkflowService.getFormationsParUp(anyString())).thenReturn(Collections.emptyList());
        mockMvc.perform(get("/api/v1/formations-workflow/par-up").param("upId", "UP1")).andExpect(status().isOk());
    }

    @Test
    void testGetFormationsParDepartement() throws Exception {
        when(formationWorkflowService.getFormationsParDepartement(anyString())).thenReturn(Collections.emptyList());
        mockMvc.perform(get("/api/v1/formations-workflow/par-departement").param("deptId", "D1")).andExpect(status().isOk());
    }

    @Test
    void testExportExcel_Success() throws Exception {
        when(exportExcelService.exportFormationsAvance(any(), any())).thenReturn(new java.io.ByteArrayOutputStream());
        mockMvc.perform(get("/api/v1/formations-workflow/export/excel")
                .param("start", "2023-01-01")
                .param("end", "2023-12-31")).andExpect(status().isOk());
    }
}

