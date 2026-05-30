package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.services.ExportExcelService;
import esprit.pfe.serviceformation.services.FormationMapper;
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

import java.util.List;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests améliorés pour FormationWorkflowController
 * Couvre les cas d'erreur internes et scénarios complexes
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("FormationWorkflowController - Tests améliorés")
class FormationWorkflowControllerEnhancedTest {

    private MockMvc mockMvc;

    @Mock private ExportExcelService exportExcelService;
    @Mock private FormationWorkflowService formationWorkflowService;
    @Mock private FormationMapper formationMapper;
    @InjectMocks private FormationWorkflowController controller;

    @BeforeEach
    void setup() {
        lenient().when(formationMapper.toResponseDTO(any())).thenReturn(new FormationResponseDTO());
        mockMvc = MockMvcBuilders.standaloneSetup(controller).setCustomArgumentResolvers(new org.springframework.data.web.PageableHandlerMethodArgumentResolver()).build();
    }

    @Test
    @DisplayName("createFormation - Devrait créer une formation valide")
    void testCreateFormation_Success() throws Exception {
        Formation formation = createFormation(1L, "Formation Test");

        when(formationWorkflowService.createFormationWorkflow(any())).thenReturn(formation);

        String formationJson = "{" +
                "\"titreFormation\":\"Formation Test\"," +
                "\"dateDebut\":\"2023-01-01T00:00:00.000+00:00\"," +
                "\"dateFin\":\"2023-01-02T00:00:00.000+00:00\"," +
                "\"typeFormation\":\"INTERNE\"}";

        mockMvc.perform(post("/api/v1/formations-workflow")
                .contentType(MediaType.APPLICATION_JSON)
                .content(formationJson))
                .andExpect(status().isCreated())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));

        verify(formationWorkflowService).createFormationWorkflow(any());
    }

    @Test
    @DisplayName("createFormation - Devrait échouer avec des données invalides")
    void testCreateFormation_InvalidData() throws Exception {
        mockMvc.perform(post("/api/v1/formations-workflow")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isBadRequest());

        verify(formationWorkflowService, never()).createFormationWorkflow(any());
    }

    @Test
    @DisplayName("updateFormation - Devrait mettre à jour une formation existante")
    void testUpdateFormation_Success() throws Exception {
        Formation formation = createFormation(1L, "Formation Mis à jour");

        when(formationWorkflowService.updateFormationWorkflow(eq(1L), any())).thenReturn(formation);

        String formationJson = "{" +
                "\"titreFormation\":\"Formation Mis à jour\"," +
                "\"dateDebut\":\"2023-01-01T00:00:00.000+00:00\"," +
                "\"dateFin\":\"2023-01-02T00:00:00.000+00:00\"," +
                "\"typeFormation\":\"INTERNE\"}";

        mockMvc.perform(put("/api/v1/formations-workflow/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content(formationJson))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));

        verify(formationWorkflowService).updateFormationWorkflow(eq(1L), any());
    }

    @Test
    @DisplayName("updateFormation - Devrait échouer avec des données invalides")
    void testUpdateFormation_InvalidData() throws Exception {
        mockMvc.perform(put("/api/v1/formations-workflow/1")
                .contentType(MediaType.APPLICATION_JSON)
                .content("{}"))
                .andExpect(status().isBadRequest());

        verify(formationWorkflowService, never()).updateFormationWorkflow(anyLong(), any());
    }

    @Test
    @DisplayName("deleteFormation - Devrait supprimer une formation")
    void testDeleteFormation_Success() throws Exception {
        doNothing().when(formationWorkflowService).deleteFormationWorkflow(1L);

        mockMvc.perform(delete("/api/v1/formations-workflow/1"))
                .andExpect(status().isOk())
                .andExpect(content().string("Formation supprimee avec succes !"));

        verify(formationWorkflowService).deleteFormationWorkflow(1L);
    }

    @Test
    @DisplayName("deleteFormation - Devrait gérer l'erreur d'argument illégal")
    void testDeleteFormation_IllegalArgument() throws Exception {
        doThrow(new IllegalArgumentException("Formation introuvable"))
                .when(formationWorkflowService).deleteFormationWorkflow(999L);

        mockMvc.perform(delete("/api/v1/formations-workflow/999"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @DisplayName("deleteFormation - Devrait gérer l'erreur interne")
    void testDeleteFormation_InternalError() throws Exception {
        doThrow(new RuntimeException("Erreur interne"))
                .when(formationWorkflowService).deleteFormationWorkflow(1L);

        mockMvc.perform(delete("/api/v1/formations-workflow/1"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Erreur interne"))
                .andExpect(jsonPath("$.message").value("Erreur interne"));
    }

    @Test
    @DisplayName("getFormationById - Devrait retourner une formation")
    void testGetFormationById_Success() throws Exception {
        FormationResponseDTO dto = createFormationResponseDTO(1L, "Formation Test");
        when(formationWorkflowService.getFormationWorkflowById(1L)).thenReturn(dto);

        mockMvc.perform(get("/api/v1/formations-workflow/1"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));

        verify(formationWorkflowService).getFormationWorkflowById(1L);
    }

    @Test
    @DisplayName("getFormationById - Devrait gérer la formation introuvable")
    void testGetFormationById_NotFound() throws Exception {
        lenient().when(formationWorkflowService.getFormationWorkflowById(999L))
                .thenThrow(new IllegalArgumentException("Formation introuvable"));

        mockMvc.perform(get("/api/v1/formations-workflow/999"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @DisplayName("getFormationById - Devrait gérer l'erreur interne")
    void testGetFormationById_InternalError() throws Exception {
        when(formationWorkflowService.getFormationWorkflowById(1L))
                .thenThrow(new RuntimeException("Erreur interne"));

        mockMvc.perform(get("/api/v1/formations-workflow/1"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Erreur interne"))
                .andExpect(jsonPath("$.message").value("Erreur interne"));
    }

    @Test
    @DisplayName("getAllFormations - Devrait retourner toutes les formations")
    void testGetAllFormations_Success() throws Exception {
        List<FormationResponseDTO> formations = List.of(
                createFormationResponseDTO(1L, "Formation 1"),
                createFormationResponseDTO(2L, "Formation 2")
        );
        when(formationWorkflowService.getAllFormationWorkflows()).thenReturn(formations);

        mockMvc.perform(get("/api/v1/formations-workflow"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content.length()").value(2));

        verify(formationWorkflowService).getAllFormationWorkflows();
    }

    @Test
    @DisplayName("getAllFormations - Devrait gérer l'erreur interne")
    void testGetAllFormations_InternalError() throws Exception {
        when(formationWorkflowService.getAllFormationWorkflows())
                .thenThrow(new RuntimeException("Erreur interne"));

        mockMvc.perform(get("/api/v1/formations-workflow"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Erreur interne"))
                .andExpect(jsonPath("$.message").value("Erreur interne"));
    }

    @Test
    @DisplayName("updatePresence - Devrait mettre à jour une présence")
    void testUpdatePresence_Success() throws Exception {
        doNothing().when(formationWorkflowService).updatePresence(1L, true, "OK");

        mockMvc.perform(put("/api/v1/formations-workflow/presence/1")
                .param("present", "true")
                .param("commentaire", "OK"))
                .andExpect(status().isOk())
                .andExpect(content().string("Presence mise a jour avec succes !"));

        verify(formationWorkflowService).updatePresence(1L, true, "OK");
    }

    @Test
    @DisplayName("updatePresence - Devrait gérer l'erreur")
    void testUpdatePresence_Error() throws Exception {
        doThrow(new RuntimeException("Erreur de mise à jour"))
                .when(formationWorkflowService).updatePresence(1L, true, "OK");

        mockMvc.perform(put("/api/v1/formations-workflow/presence/1")
                .param("present", "true")
                .param("commentaire", "OK"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @DisplayName("getPresencesBySeance - Devrait retourner les présences")
    void testGetPresencesBySeance_Success() throws Exception {
        List<PresenceDTO> presences = List.of(
                createPresenceDTO(1L, "E001", "Dupont", "Jean", true),
                createPresenceDTO(2L, "E002", "Martin", "Marie", false)
        );
        when(formationWorkflowService.getPresencesBySeance(1L)).thenReturn(presences);

        mockMvc.perform(get("/api/v1/formations-workflow/seances/1/presences"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content.length()").value(2));

        verify(formationWorkflowService).getPresencesBySeance(1L);
    }

    @Test
    @DisplayName("getFormationsAchevees - Devrait retourner les formations achevées")
    void testGetFormationsAchevees_Success() throws Exception {
        List<FormationResponseDTO> formations = List.of(createFormationResponseDTO(1L, "Formation Achevée"));
        when(formationWorkflowService.getFormationsAchevees()).thenReturn(formations);

        mockMvc.perform(get("/api/v1/formations-workflow/achevees"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content.length()").value(1));

        verify(formationWorkflowService).getFormationsAchevees();
    }

    @Test
    @DisplayName("getFormationsAchevees - Devrait gérer l'erreur interne")
    void testGetFormationsAchevees_InternalError() throws Exception {
        when(formationWorkflowService.getFormationsAchevees())
                .thenThrow(new RuntimeException("Erreur interne"));

        mockMvc.perform(get("/api/v1/formations-workflow/achevees"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Erreur interne"))
                .andExpect(jsonPath("$.message").value("Erreur interne"));
    }

    @Test
    @DisplayName("exportExcel - Devrait exporter en Excel")
    void testExportExcel_Success() throws Exception {
        when(exportExcelService.exportFormationsAvance(any(), any()))
                .thenReturn(new java.io.ByteArrayOutputStream());

        mockMvc.perform(get("/api/v1/formations-workflow/export/excel")
                .param("start", "2023-01-01")
                .param("end", "2023-12-31"))
                .andExpect(status().isOk())
                .andExpect(header().exists("Content-Disposition"));

        verify(exportExcelService).exportFormationsAvance(any(), any());
    }

    @Test
    @DisplayName("exportExcel - Devrait gérer l'erreur d'export")
    void testExportExcel_Error() throws Exception {
        when(exportExcelService.exportFormationsAvance(any(), any()))
                .thenThrow(new RuntimeException("Erreur d'export"));

        mockMvc.perform(get("/api/v1/formations-workflow/export/excel")
                .param("start", "2023-01-01")
                .param("end", "2023-12-31"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Erreur interne"));
    }

    @Test
    @DisplayName("setInscriptionsOuvertes - Devrait mettre à jour les inscriptions")
    void testSetInscriptionsOuvertes_Success() throws Exception {
        FormationResponseDTO dto = createFormationResponseDTO(1L, "Formation Test");
        when(formationWorkflowService.setInscriptionsOuvertes(1L, true)).thenReturn(dto);

        mockMvc.perform(put("/api/v1/formations-workflow/1/inscriptionsOuvertes")
                .param("ouvert", "true"))
                .andExpect(status().isOk())
                .andExpect(content().contentType(MediaType.APPLICATION_JSON));

        verify(formationWorkflowService).setInscriptionsOuvertes(1L, true);
    }

    @Test
    @DisplayName("getFormationsVisibles - Devrait retourner les formations visibles")
    void testGetFormationsVisibles_Success() throws Exception {
        List<FormationResponseDTO> formations = List.of(createFormationResponseDTO(1L, "Formation Visible"));
        when(formationWorkflowService.getFormationsVisibles()).thenReturn(formations);

        mockMvc.perform(get("/api/v1/formations-workflow/visibles"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content.length()").value(1));

        verify(formationWorkflowService).getFormationsVisibles();
    }

    @Test
    @DisplayName("getFormationsParUp - Devrait retourner les formations par UP")
    void testGetFormationsParUp_Success() throws Exception {
        List<FormationResponseDTO> formations = List.of(createFormationResponseDTO(1L, "Formation UP1"));
        when(formationWorkflowService.getFormationsParUp("UP1")).thenReturn(formations);

        mockMvc.perform(get("/api/v1/formations-workflow/par-up")
                .param("upId", "UP1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content.length()").value(1));

        verify(formationWorkflowService).getFormationsParUp("UP1");
    }

    @Test
    @DisplayName("getFormationsParDepartement - Devrait retourner les formations par département")
    void testGetFormationsParDepartement_Success() throws Exception {
        List<FormationResponseDTO> formations = List.of(createFormationResponseDTO(1L, "Formation Dept1"));
        when(formationWorkflowService.getFormationsParDepartement("D1")).thenReturn(formations);

        mockMvc.perform(get("/api/v1/formations-workflow/par-departement")
                .param("deptId", "D1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.content.length()").value(1));

        verify(formationWorkflowService).getFormationsParDepartement("D1");
    }

    // Méthodes utilitaires pour créer des objets de test
    private Formation createFormation(Long id, String titre) {
        Formation f = new Formation();
        f.setIdFormation(id);
        f.setTitreFormation(titre);
        f.setSeances(new java.util.ArrayList<>());
        return f;
    }

    private FormationResponseDTO createFormationResponseDTO(Long id, String titre) {
        FormationResponseDTO dto = new FormationResponseDTO();
        dto.setIdFormation(id);
        dto.setTitreFormation(titre);
        return dto;
    }

    private PresenceDTO createPresenceDTO(Long id, String enseignantId, String nom, String prenom, boolean present) {
        PresenceDTO dto = new PresenceDTO();
        dto.setIdParticipation(id);
        dto.setEnseignantId(enseignantId);
        dto.setNom(nom);
        dto.setPrenom(prenom);
        dto.setPresent(present);
        return dto;
    }
}

