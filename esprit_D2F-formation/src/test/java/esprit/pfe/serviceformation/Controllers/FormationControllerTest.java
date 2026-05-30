package esprit.pfe.serviceformation.controllers;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import esprit.pfe.serviceformation.dto.FormationResponseDTO;
import esprit.pfe.serviceformation.entities.EtatFormation;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.entities.TypeFormation;
import esprit.pfe.serviceformation.services.FormationSearchService;
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
import static org.mockito.ArgumentMatchers.anyString;
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

    @MockitoBean
    private FormationSearchService formationSearchService;

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
            FormationResponseDTO dtoFormation = new FormationResponseDTO();
            dtoFormation.setIdFormation(1L);
            dtoFormation.setTitreFormation("Formation Java 17");
            Page<FormationResponseDTO> page = new PageImpl<>(List.of(dtoFormation));
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
            FormationResponseDTO dtoFormation = new FormationResponseDTO();
            dtoFormation.setIdFormation(1L);
            dtoFormation.setTitreFormation("Formation Java 17");
            when(formationService.getFormationById(1L)).thenReturn(dtoFormation);

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
            FormationResponseDTO dtoFormation = new FormationResponseDTO();
            dtoFormation.setIdFormation(1L);
            dtoFormation.setTitreFormation("Formation Java 17");
            when(formationService.createFormation(any())).thenReturn(dtoFormation);

            String requestJson = "{\"titreFormation\":\"Formation Java 17\"," +
                    "\"dateDebut\":\"2027-01-10\",\"dateFin\":\"2027-01-15\"," +
                    "\"typeFormation\":\"INTERNE\",\"etatFormation\":\"PLANIFIE\"," +
                    "\"chargeHoraireGlobal\":40}";

            mockMvc.perform(post("/api/v1/formations")
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(requestJson))
                .andExpect(status().isCreated())
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
            FormationResponseDTO dtoFormation = new FormationResponseDTO();
            dtoFormation.setIdFormation(1L);
            dtoFormation.setTitreFormation("Formation Java 17 - V2");
            when(formationService.updateFormation(eq(1L), any())).thenReturn(dtoFormation);

            String requestJson = "{\"titreFormation\":\"Formation Java 17 - V2\"," +
                    "\"dateDebut\":\"2027-01-10\",\"dateFin\":\"2027-01-15\"}";

            mockMvc.perform(put("/api/v1/formations/1")
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content(requestJson))
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

    @Nested
    @DisplayName("PATCH /api/v1/formations/{id}")
    class PartialUpdate {

        @Test
        @DisplayName("200 - Mise à jour partielle réussie")
        @WithMockUser(roles = "ADMIN")
        void shouldPartialUpdate() throws Exception {
            FormationResponseDTO dtoFormation = new FormationResponseDTO();
            dtoFormation.setIdFormation(1L);
            dtoFormation.setTitreFormation("Partially Updated");
            when(formationService.updateFormation(eq(1L), any())).thenReturn(dtoFormation);

            mockMvc.perform(patch("/api/v1/formations/1")
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{\"titreFormation\":\"Partially Updated\"}"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.titreFormation").value("Partially Updated"));
        }
    }

    @Nested
    @DisplayName("POST /api/v1/formations/{id}/recover")
    class Recover {

        @Test
        @DisplayName("200 - Récupération réussie")
        @WithMockUser(roles = "ADMIN")
        void shouldRecover() throws Exception {
            FormationResponseDTO dtoFormation = new FormationResponseDTO();
            dtoFormation.setIdFormation(1L);
            dtoFormation.setTitreFormation("Recovered");
            when(formationService.recoverDeletedFormation(1L)).thenReturn(dtoFormation);

            mockMvc.perform(post("/api/v1/formations/1/recover").with(csrf()))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.titreFormation").value("Recovered"));
        }
    }

    @Nested
    @DisplayName("POST /api/v1/formations/{id}/clone")
    class Clone {

        @Test
        @DisplayName("201 - Duplication réussie")
        @WithMockUser(roles = "ADMIN")
        void shouldClone() throws Exception {
            FormationResponseDTO dtoFormation = new FormationResponseDTO();
            dtoFormation.setIdFormation(2L);
            dtoFormation.setTitreFormation("Clone of Formation Java 17");
            when(formationService.cloneFormation(eq(1L), anyString())).thenReturn(dtoFormation);

            mockMvc.perform(post("/api/v1/formations/1/clone?newTitle=Clone+of+Formation+Java+17")
                    .with(csrf()))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.titreFormation").value("Clone of Formation Java 17"));
        }
    }

    @Nested
    @DisplayName("GET /api/v1/formations/search/by-title")
    class SearchByTitle {

        @Test
        @DisplayName("200 - Recherche par titre réussie")
        @WithMockUser(roles = "ADMIN")
        void shouldSearchByTitle() throws Exception {
            Page<FormationResponseDTO> page = new PageImpl<>(List.of());
            when(formationSearchService.searchByTitle(anyString(), any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/formations/search/by-title")
                    .param("title", "Java"))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("GET /api/v1/formations/search/by-state")
    class SearchByState {

        @Test
        @DisplayName("200 - Recherche par état réussie")
        @WithMockUser(roles = "ADMIN")
        void shouldSearchByState() throws Exception {
            Page<FormationResponseDTO> page = new PageImpl<>(List.of());
            when(formationSearchService.searchByState(anyString(), any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/formations/search/by-state")
                    .param("state", "PLANIFIEE"))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("GET /api/v1/formations/search/by-domain")
    class SearchByDomain {

        @Test
        @DisplayName("200 - Recherche par domaine réussie")
        @WithMockUser(roles = "ADMIN")
        void shouldSearchByDomain() throws Exception {
            Page<FormationResponseDTO> page = new PageImpl<>(List.of());
            when(formationSearchService.searchByDomain(anyString(), any(Pageable.class))).thenReturn(page);

            mockMvc.perform(get("/api/v1/formations/search/by-domain")
                    .param("domain", "IT"))
                    .andExpect(status().isOk());
        }
    }

    @Nested
    @DisplayName("POST /api/v1/formations/search/advanced")
    class AdvancedSearch {

        @Test
        @DisplayName("200 - Recherche avancée réussie")
        @WithMockUser(roles = "ADMIN")
        void shouldAdvancedSearch() throws Exception {
            Page<FormationResponseDTO> page = new PageImpl<>(List.of());
            when(formationSearchService.searchFormations(any(), any(Pageable.class))).thenReturn(page);

            mockMvc.perform(post("/api/v1/formations/search/advanced")
                    .with(csrf())
                    .contentType(MediaType.APPLICATION_JSON)
                    .content("{}"))
                    .andExpect(status().isOk());
        }
    }
}
