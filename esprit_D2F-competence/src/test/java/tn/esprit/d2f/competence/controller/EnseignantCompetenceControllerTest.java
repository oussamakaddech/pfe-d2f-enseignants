package tn.esprit.d2f.competence.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.persistence.EntityManagerFactory;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.test.context.TestPropertySource;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.AuditorAware;
import org.springframework.data.jpa.mapping.JpaMetamodelMappingContext;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import tn.esprit.d2f.competence.dto.EnseignantCompetenceDTO;
import tn.esprit.d2f.competence.dto.EnseignantCompetenceRequest;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.repository.CompetencePrerequisiteRepository;
import tn.esprit.d2f.competence.repository.CompetenceRepository;
import tn.esprit.d2f.competence.repository.DomaineRepository;
import tn.esprit.d2f.competence.repository.EnseignantCompetenceRepository;
import tn.esprit.d2f.competence.repository.NiveauSavoirRequisRepository;
import tn.esprit.d2f.competence.repository.RiceImportLogRepository;
import tn.esprit.d2f.competence.repository.SavoirRepository;
import tn.esprit.d2f.competence.repository.SousCompetenceRepository;
import tn.esprit.d2f.competence.service.IEnseignantCompetenceService;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests d'intégration (MockMvc) pour {@link EnseignantCompetenceController}.
 *
 * <p>Stratégie :
 * <ul>
 *   <li>@WebMvcTest – charge uniquement la couche Web (pas de contexte JPA)</li>
 *   <li>@MockitoBean – isole le service de l'implémentation réelle</li>
 *   <li>@WithMockUser – contourne le filtre JWT sans avoir un token réel</li>
 * </ul>
 */
@TestPropertySource(properties = {"jwt.secret=d2f-dev-secret-minimum-64-chars-do-not-use-in-production-1234567890", "spring.flyway.enabled=false"})
@WebMvcTest(EnseignantCompetenceController.class)
@DisplayName("EnseignantCompetenceController – Tests MockMvc")
class EnseignantCompetenceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockitoBean
    private IEnseignantCompetenceService service;

    @MockitoBean
    private JwtDecoder jwtDecoder;

    @MockitoBean(name = "entityManagerFactory")
    private EntityManagerFactory entityManagerFactory;

    @MockitoBean(name = "jpaMappingContext")
    private JpaMetamodelMappingContext jpaMappingContext;

    @MockitoBean(name = "auditorProvider")
    private AuditorAware<String> auditorProvider;

    @MockitoBean
    private CompetencePrerequisiteRepository competencePrerequisiteRepository;

    @MockitoBean
    private CompetenceRepository competenceRepository;

    @MockitoBean
    private DomaineRepository domaineRepository;

    @MockitoBean
    private EnseignantCompetenceRepository enseignantCompetenceRepository;

    @MockitoBean
    private NiveauSavoirRequisRepository niveauSavoirRequisRepository;

    @MockitoBean
    private RiceImportLogRepository riceImportLogRepository;

    @MockitoBean
    private SavoirRepository savoirRepository;

    @MockitoBean
    private SousCompetenceRepository sousCompetenceRepository;

    static final String BASE_URL = "/api/v1/enseignant-competences";

    private EnseignantCompetenceDTO sampleDTO() {
        return EnseignantCompetenceDTO.builder()
                .id(1L)
                .enseignantId("ens-001")
                .savoirId(10L)
                .savoirNom("Essai Proctor")
                .competenceNom("Mécanique des sols")
                .domaineNom("Génie Civil")
                .niveau(NiveauMaitrise.N2_ELEMENTAIRE)
                .dateAcquisition(LocalDate.of(2025, 3, 1))
                .build();
    }

    // ─── GET / (paginé) ──────────────────────────────────────────────────────
    @Nested
    @DisplayName("GET /api/v1/enseignant-competences")
    class GetAll {

        @Test
        @WithMockUser(roles = "admin")
        @DisplayName("200 – renvoie une page d'affectations")
        void shouldReturn200WithPage() throws Exception {
            var page = new PageImpl<>(List.of(sampleDTO()), PageRequest.of(0, 20), 1);
            when(service.getAll(any())).thenReturn(page);

            mockMvc.perform(get(BASE_URL).param("page", "0").param("size", "20"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.totalElements").value(1))
                    .andExpect(jsonPath("$.content[0].enseignantId").value("ens-001"))
                    .andExpect(jsonPath("$.content[0].niveau").value("N2_ELEMENTAIRE"));
        }

        @Test
        @DisplayName("401 – sans authentification")
        void shouldReturn401WithoutAuth() throws Exception {
            mockMvc.perform(get(BASE_URL))
                    .andExpect(status().isUnauthorized());
        }
    }

    // ─── GET /enseignant/{id}/count ───────────────────────────────────────────
    @Nested
    @DisplayName("GET /enseignant/{id}/count")
    class CountByEnseignant {

        @Test
        @WithMockUser(roles = "admin")
        @DisplayName("200 – renvoie le compteur correct")
        void shouldReturnCount() throws Exception {
            when(service.countCompetences("ens-001")).thenReturn(5L);

            mockMvc.perform(get(BASE_URL + "/enseignant/ens-001/count"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.count").value(5))
                    .andExpect(jsonPath("$.enseignantId").value("ens-001"));
        }
    }

    // ─── POST / ──────────────────────────────────────────────────────────────
    @Nested
    @DisplayName("POST /api/v1/enseignant-competences")
    class AssignCompetence {

        @Test
        @WithMockUser(roles = "admin")
        @DisplayName("201 – assigne un savoir à un enseignant")
        void shouldReturn201OnCreate() throws Exception {
            var request = EnseignantCompetenceRequest.builder()
                    .enseignantId("ens-001")
                    .savoirId(10L)
                    .niveau(NiveauMaitrise.N2_ELEMENTAIRE)
                    .build();
            when(service.assignCompetence(any())).thenReturn(sampleDTO());

            mockMvc.perform(post(BASE_URL)
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated())
                    .andExpect(jsonPath("$.id").value(1))
                    .andExpect(jsonPath("$.savoirNom").value("Essai Proctor"));
        }

        @Test
        @WithMockUser(roles = "manager")
        @DisplayName("201 – requête authentifiée de création")
        void shouldReturn201ForAuthenticatedRole() throws Exception {
            var request = EnseignantCompetenceRequest.builder()
                    .enseignantId("ens-001").savoirId(10L).niveau(NiveauMaitrise.N2_ELEMENTAIRE).build();

            mockMvc.perform(post(BASE_URL)
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isCreated());
        }
    }

    // ─── DELETE /{id} ─────────────────────────────────────────────────────────
    @Nested
    @DisplayName("DELETE /api/v1/enseignant-competences/{id}")
    class RemoveCompetence {

        @Test
        @WithMockUser(roles = "admin")
        @DisplayName("204 – suppression réussie")
        void shouldReturn204OnDelete() throws Exception {
            doNothing().when(service).removeCompetence(1L);

            mockMvc.perform(delete(BASE_URL + "/1").with(csrf()))
                    .andExpect(status().isNoContent());

            verify(service).removeCompetence(1L);
        }

        @Test
        @WithMockUser(roles = "manager")
        @DisplayName("204 – suppression pour requête authentifiée")
        void shouldReturn204ForAuthenticatedRole() throws Exception {
            mockMvc.perform(delete(BASE_URL + "/1").with(csrf()))
                .andExpect(status().isNoContent());
        }
    }

    // ─── GET /enseignant/{enseignantId} ───────────────────────────────────────
    @Nested
    @DisplayName("GET /enseignant/{enseignantId}")
    class GetByEnseignant {

        @Test
        @WithMockUser(roles = "admin")
        @DisplayName("200 – renvoie la liste des affectations d'un enseignant")
        void shouldReturn200() throws Exception {
            when(service.getCompetencesByEnseignant("ens-001")).thenReturn(List.of(sampleDTO()));

            mockMvc.perform(get(BASE_URL + "/enseignant/ens-001"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].enseignantId").value("ens-001"));
        }
    }

    // ─── GET /enseignant/{enseignantId}/domaine/{domaineId} ───────────────────
    @Nested
    @DisplayName("GET /enseignant/{enseignantId}/domaine/{domaineId}")
    class GetByEnseignantAndDomaine {

        @Test
        @WithMockUser(roles = "admin")
        @DisplayName("200 – renvoie la liste filtrée")
        void shouldReturn200() throws Exception {
            when(service.getCompetencesByEnseignantAndDomaine("ens-001", 1L)).thenReturn(List.of(sampleDTO()));

            mockMvc.perform(get(BASE_URL + "/enseignant/ens-001/domaine/1"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].enseignantId").value("ens-001"));
        }
    }

    // ─── GET /enseignant/{enseignantId}/competence/{competenceId} ─────────────
    @Nested
    @DisplayName("GET /enseignant/{enseignantId}/competence/{competenceId}")
    class GetByEnseignantAndCompetence {

        @Test
        @WithMockUser(roles = "admin")
        @DisplayName("200 – renvoie la liste filtrée")
        void shouldReturn200() throws Exception {
            when(service.getCompetencesByEnseignantAndCompetence("ens-001", 2L)).thenReturn(List.of(sampleDTO()));

            mockMvc.perform(get(BASE_URL + "/enseignant/ens-001/competence/2"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].enseignantId").value("ens-001"));
        }
    }

    // ─── GET /enseignant/{enseignantId}/niveau/{niveau} ───────────────────────
    @Nested
    @DisplayName("GET /enseignant/{enseignantId}/niveau/{niveau}")
    class GetByEnseignantAndNiveau {

        @Test
        @WithMockUser(roles = "admin")
        @DisplayName("200 – renvoie la liste filtrée")
        void shouldReturn200() throws Exception {
            when(service.getCompetencesByEnseignantAndNiveau("ens-001", NiveauMaitrise.N2_ELEMENTAIRE)).thenReturn(List.of(sampleDTO()));

            mockMvc.perform(get(BASE_URL + "/enseignant/ens-001/niveau/N2_ELEMENTAIRE"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$[0].enseignantId").value("ens-001"));
        }
    }

    // ─── PATCH /{id}/niveau ───────────────────────────────────────────────────
    @Nested
    @DisplayName("PATCH /{id}/niveau")
    class UpdateNiveau {

        @Test
        @WithMockUser(roles = "admin")
        @DisplayName("200 – met à jour le niveau")
        void shouldReturn200() throws Exception {
            when(service.updateNiveau(1L, NiveauMaitrise.N3_INTERMEDIAIRE)).thenReturn(sampleDTO());

            mockMvc.perform(patch(BASE_URL + "/1/niveau")
                            .with(csrf())
                            .param("niveau", "N3_INTERMEDIAIRE"))
                    .andExpect(status().isOk())
                    .andExpect(jsonPath("$.enseignantId").value("ens-001"));
        }
    }
}
