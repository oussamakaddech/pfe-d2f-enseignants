package esprit.pfe.serviceformation.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.TypeFormation;
import esprit.pfe.serviceformation.services.ExportExcelService;
import esprit.pfe.serviceformation.services.FormationWorkflowService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;


import java.util.Date;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;

import static org.mockito.Mockito.when;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FormationWorkflowController.class)
@DisplayName("FormationWorkflowController - Tests unitaires")
class FormationWorkflowControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private FormationWorkflowService formationWorkflowService;

    @MockitoBean
    private ExportExcelService exportExcelService;

    private FormationDTO testDto;

    @BeforeEach
    void setUp() {
        testDto = new FormationDTO();
        testDto.setIdFormation(1L);
        testDto.setTitreFormation("Formation Workflow Test");
    }

    @Test
    @DisplayName("POST /api/v1/formations-workflow - Succès")
    @WithMockUser(roles = "ADMIN")
    void shouldCreateWorkflow() throws Exception {
        FormationWorkflowRequest request = new FormationWorkflowRequest();
        request.setTitreFormation("Valid Formation Title");
        request.setTypeBesoin("PROJET");
        request.setDateDebut(new Date());
        request.setDateFin(new Date());
        request.setTypeFormation(TypeFormation.INTERNE);
        request.setChargeHoraireGlobal(20);
        request.setObjectifs("Learn something new");

        when(formationWorkflowService.createFormationWorkflow(any())).thenReturn(new Formation());
        when(formationWorkflowService.mapFormationToDTO(any())).thenReturn(testDto);

        mockMvc.perform(post("/api/v1/formations-workflow")
                        .with(csrf())
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(request)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.idFormation").value(1));
    }

    @Test
    @DisplayName("GET /api/v1/formations-workflow/{id} - Succès")
    @WithMockUser(roles = "ADMIN")
    void shouldGetById() throws Exception {
        when(formationWorkflowService.getFormationWorkflowById(1L)).thenReturn(testDto);

        mockMvc.perform(get("/api/v1/formations-workflow/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idFormation").value(1));
    }

    @Test
    @DisplayName("GET /api/v1/formations-workflow/{id} - Not Found")
    @WithMockUser(roles = "ADMIN")
    void shouldReturn404WhenNotFound() throws Exception {
        when(formationWorkflowService.getFormationWorkflowById(99L))
                .thenThrow(new IllegalArgumentException("Formation introuvable"));

        mockMvc.perform(get("/api/v1/formations-workflow/99"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Formation introuvable"));
    }

    @Test
    @DisplayName("PUT /api/v1/formations-workflow/presence/{id} - Succès")
    @WithMockUser(roles = "ADMIN")
    void shouldUpdatePresence() throws Exception {
        mockMvc.perform(put("/api/v1/formations-workflow/presence/1")
                        .with(csrf())
                        .param("present", "true")
                        .param("commentaire", "OK"))
                .andExpect(status().isOk())
                .andExpect(content().string("Presence mise a jour avec succes !"));
    }

    @Test
    @DisplayName("GET /api/v1/formations-workflow/visibles - Succès")
    @WithMockUser(roles = "ADMIN")
    void shouldGetVisibles() throws Exception {
        when(formationWorkflowService.getFormationsVisibles()).thenReturn(List.of(testDto));

        mockMvc.perform(get("/api/v1/formations-workflow/visibles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[0].idFormation").value(1));
    }
}
