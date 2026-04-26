package esprit.pfe.serviceformation.Controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import esprit.pfe.serviceformation.Entities.EtatFormation;
import esprit.pfe.serviceformation.Entities.Formation;
import esprit.pfe.serviceformation.Entities.TypeFormation;
import esprit.pfe.serviceformation.Services.FormationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.Arrays;
import java.util.Date;
import java.util.List;

import static org.hamcrest.Matchers.hasSize;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@WebMvcTest(FormationController.class)
class FormationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private FormationService formationService;

    private Formation testFormation;
    private Formation updatedFormation;

    @BeforeEach
    void setUp() {
        Date startDate = new Date();
        Date endDate = new Date(startDate.getTime() + 86400000); // +1 day

        testFormation = new Formation();
        testFormation.setIdFormation(1L);
        testFormation.setTitreFormation("Formation Test");
        testFormation.setTypeFormation(TypeFormation.INTERNE);
        testFormation.setDateDebut(startDate);
        testFormation.setDateFin(endDate);
        testFormation.setEtatFormation(EtatFormation.PLANIFIEE);
        testFormation.setCoutFormation(1000.0f);
        testFormation.setChargeHoraireGlobal(20);

        updatedFormation = new Formation();
        updatedFormation.setIdFormation(1L);
        updatedFormation.setTitreFormation("Formation Test Updated");
        updatedFormation.setTypeFormation(TypeFormation.EXTERNE);
        updatedFormation.setDateDebut(startDate);
        updatedFormation.setDateFin(endDate);
        updatedFormation.setEtatFormation(EtatFormation.EN_COURS);
        updatedFormation.setCoutFormation(1500.0f);
        updatedFormation.setChargeHoraireGlobal(25);
    }

    @Test
    @WithMockUser(roles = {"ADMIN"})
    void testCreateFormation() throws Exception {
        when(formationService.createFormation(any(Formation.class))).thenReturn(testFormation);

        mockMvc.perform(post("/formations")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(testFormation)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idFormation").value(1L))
                .andExpect(jsonPath("$.titreFormation").value("Formation Test"))
                .andExpect(jsonPath("$.typeFormation").value("INTERNE"));

        verify(formationService, times(1)).createFormation(any(Formation.class));
    }

    @Test
    void testCreateFormation_Unauthorized() throws Exception {
        mockMvc.perform(post("/formations")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(testFormation)))
                .andExpect(status().isUnauthorized());

        verify(formationService, never()).createFormation(any(Formation.class));
    }

    @Test
    @WithMockUser(roles = {"ENSEIGNANT"})
    void testGetAllFormations() throws Exception {
        List<Formation> formations = Arrays.asList(testFormation, updatedFormation);
        when(formationService.getAllFormations()).thenReturn(formations);

        mockMvc.perform(get("/formations"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$", hasSize(2)))
                .andExpect(jsonPath("$[0].titreFormation").value("Formation Test"))
                .andExpect(jsonPath("$[1].titreFormation").value("Formation Test Updated"));

        verify(formationService, times(1)).getAllFormations();
    }

    @Test
    void testGetAllFormations_Unauthorized() throws Exception {
        mockMvc.perform(get("/formations"))
                .andExpect(status().isUnauthorized());

        verify(formationService, never()).getAllFormations();
    }

    @Test
    @WithMockUser(roles = {"ENSEIGNANT"})
    void testGetFormationById() throws Exception {
        when(formationService.getFormationById(1L)).thenReturn(testFormation);

        mockMvc.perform(get("/formations/1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.idFormation").value(1L))
                .andExpect(jsonPath("$.titreFormation").value("Formation Test"));

        verify(formationService, times(1)).getFormationById(1L);
    }

    @Test
    void testGetFormationById_Unauthorized() throws Exception {
        mockMvc.perform(get("/formations/1"))
                .andExpect(status().isUnauthorized());

        verify(formationService, never()).getFormationById(any(Long.class));
    }

    @Test
    @WithMockUser(roles = {"ADMIN"})
    void testUpdateFormation() throws Exception {
        when(formationService.updateFormation(eq(1L), any(Formation.class))).thenReturn(updatedFormation);

        mockMvc.perform(put("/formations/1")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updatedFormation)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.titreFormation").value("Formation Test Updated"))
                .andExpect(jsonPath("$.typeFormation").value("EXTERNE"));

        verify(formationService, times(1)).updateFormation(eq(1L), any(Formation.class));
    }

    @Test
    void testUpdateFormation_Unauthorized() throws Exception {
        mockMvc.perform(put("/formations/1")
                .with(csrf())
                .contentType(MediaType.APPLICATION_JSON)
                .content(objectMapper.writeValueAsString(updatedFormation)))
                .andExpect(status().isUnauthorized());

        verify(formationService, never()).updateFormation(any(Long.class), any(Formation.class));
    }

    @Test
    @WithMockUser(roles = {"ADMIN"})
    void testDeleteFormation() throws Exception {
        doNothing().when(formationService).deleteFormation(1L);

        mockMvc.perform(delete("/formations/1")
                .with(csrf()))
                .andExpect(status().isNoContent());

        verify(formationService, times(1)).deleteFormation(1L);
    }

    @Test
    void testDeleteFormation_Unauthorized() throws Exception {
        mockMvc.perform(delete("/formations/1")
                .with(csrf()))
                .andExpect(status().isUnauthorized());

        verify(formationService, never()).deleteFormation(any(Long.class));
    }
}
