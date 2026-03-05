package tn.esprit.d2f.competence.controller;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Nested;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.MediaType;
import org.springframework.security.test.context.support.WithMockUser;
import org.springframework.test.web.servlet.MockMvc;
import tn.esprit.d2f.competence.dto.EnseignantCompetenceDTO;
import tn.esprit.d2f.competence.dto.EnseignantCompetenceRequest;
import tn.esprit.d2f.competence.entity.enumerations.NiveauMaitrise;
import tn.esprit.d2f.competence.service.IEnseignantCompetenceService;

import java.time.LocalDate;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
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
 *   <li>@MockBean – isole le service de l'implémentation réelle</li>
 *   <li>@WithMockUser – contourne le filtre JWT sans avoir un token réel</li>
 * </ul>
 */
@WebMvcTest(EnseignantCompetenceController.class)
@DisplayName("EnseignantCompetenceController – Tests MockMvc")
class EnseignantCompetenceControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private IEnseignantCompetenceService service;

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
        @WithMockUser(roles = "USER")
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
        @WithMockUser(roles = "USER")
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
        @WithMockUser(roles = "MANAGER")
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
        @WithMockUser(roles = "USER")
        @DisplayName("403 – rôle USER ne peut pas créer")
        void shouldReturn403ForUser() throws Exception {
            var request = EnseignantCompetenceRequest.builder()
                    .enseignantId("ens-001").savoirId(10L).niveau(NiveauMaitrise.N2_ELEMENTAIRE).build();

            mockMvc.perform(post(BASE_URL)
                            .with(csrf())
                            .contentType(MediaType.APPLICATION_JSON)
                            .content(objectMapper.writeValueAsString(request)))
                    .andExpect(status().isForbidden());
        }
    }

    // ─── DELETE /{id} ─────────────────────────────────────────────────────────
    @Nested
    @DisplayName("DELETE /api/v1/enseignant-competences/{id}")
    class RemoveCompetence {

        @Test
        @WithMockUser(roles = "ADMIN")
        @DisplayName("204 – suppression réussie")
        void shouldReturn204OnDelete() throws Exception {
            doNothing().when(service).removeCompetence(1L);

            mockMvc.perform(delete(BASE_URL + "/1").with(csrf()))
                    .andExpect(status().isNoContent());

            verify(service).removeCompetence(1L);
        }

        @Test
        @WithMockUser(roles = "MANAGER")
        @DisplayName("403 – MANAGER ne peut pas supprimer")
        void shouldReturn403ForManager() throws Exception {
            mockMvc.perform(delete(BASE_URL + "/1").with(csrf()))
                    .andExpect(status().isForbidden());
        }
    }
}
