package esprit.pfe.serviceformation.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.TypeFormation;
import esprit.pfe.serviceformation.services.FormationService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;

import java.util.ArrayList;
import java.util.Date;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@DisplayName("FormationController - Tests d'intégration")
class FormationControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private FormationService formationService;

    private Formation testFormation;

    @BeforeEach
    void setUp() {
        testFormation = new Formation();
        testFormation.setIdFormation(1L);
        testFormation.setTitreFormation("Formation Java 17");
        testFormation.setTypeFormation(TypeFormation.INTERNE);
        testFormation.setDateDebut(new Date());
        testFormation.setDateFin(new Date(System.currentTimeMillis() + 86400000));
        testFormation.setEtatFormation(EtatFormation.PLANIFIE);
        testFormation.setCoutFormation(1000.0f);
        testFormation.setChargeHoraireGlobal(40);
        testFormation.setSeances(new ArrayList<>());
        testFormation.setFormationCompetences(new ArrayList<>());
        testFormation.setInscriptions(new ArrayList<>());
    }

    @Nested
    @DisplayName("GET /api/v1/formations")
    class GetAll {

        @Test
        @DisplayName("200 - Retourne toutes les formations")
        @WithMockUser(roles = "ADMIN")
        void shouldReturnAll() throws Exception {
            Page<esprit.pfe.serviceformation.entities.Formation> page = new PageImpl<>(List.of(testFormation));
            when(formationService.getAllFormations(any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/formations"))
                    .andExpect(status().isOk());
        }

        @Test
        @DisplayName("401 - Non authentifié")
        void shouldRejectUnauthenticated() throws Exception {
            mockMvc.perform(get("/api/v1/formations"))
                    .andExpect(status().isUnauthorized());
        }
    }

    @Nested
    @DisplayName("GET /api/v1/formations/{id}")
    class GetById {

        @Test
        @DisplayName("200 - Retourne la formation")
        @WithMockUser(roles = "ADMIN")
        void shouldReturnById() throws Exception {
            when(formationService.getFormationById(1L)).thenReturn(testFormation);

            mockMvc.perform(get("/api/v1/formations/1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.idFormation").value(1))
                    .andExpect(jsonPath("$.titreFormation").value("Formation Java 17"));
        }
    }

    @Nested
    @DisplayName("POST /api/v1/formations")
    class Create {

        @Test
        @DisplayName("200 - Création réussie")
        @WithMockUser(roles = "ADMIN")
        void shouldCreate() throws Exception {
            when(formationService.createFormation(any())).thenReturn(testFormation);

            mockMvc.perform(post("/api/v1/formations")
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(testFormation)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.titreFormation").value("Formation Java 17"));
        }
    }

    @Nested
    @DisplayName("PUT /api/v1/formations/{id}")
    class Update {

        @Test
        @DisplayName("200 - Mise à jour réussie")
        @WithMockUser(roles = "ADMIN")
        void shouldUpdate() throws Exception {
            testFormation.setTitreFormation("Formation Java 17 - V2");
            when(formationService.updateFormation(eq(1L), any())).thenReturn(testFormation);

            mockMvc.perform(put("/api/v1/formations/1")
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(objectMapper.writeValueAsString(testFormation)))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.titreFormation").value("Formation Java 17 - V2"));
        }
    }

    @Nested
    @DisplayName("DELETE /api/v1/formations/{id}")
    class Delete {

        @Test
        @DisplayName("204 - Suppression réussie")
        @WithMockUser(roles = "ADMIN")
        void shouldDelete() throws Exception {
            doNothing().when(formationService).deleteFormation(1L);

            mockMvc.perform(delete("/api/v1/formations/1").with(csrf()))
                    .andExpect(status().isNoContent());
            verify(formationService).deleteFormation(1L);
        }
    }
}
