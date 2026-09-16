package esprit.pfe.serviceformation.controllers;

import esprit.pfe.serviceformation.dto.*;
import esprit.pfe.serviceformation.services.KPIService;
import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.Collections;
import java.util.List;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("KPIController - Tests additionnels (méthodes non couvertes)")
class KPIControllerAdditionalTest {

    private MockMvc mockMvc;

    @Mock private KPIService kpiService;
    @InjectMocks private KPIController controller;

    @BeforeEach
    void setup() {
        ObjectMapper mapper = new ObjectMapper();
        mapper.registerModule(new org.springframework.data.web.config.SpringDataJacksonConfiguration.PageModule(new org.springframework.data.web.config.SpringDataWebSettings(org.springframework.data.web.config.EnableSpringDataWebSupport.PageSerializationMode.DIRECT)));
        MappingJackson2HttpMessageConverter converter = new MappingJackson2HttpMessageConverter(mapper);
        mockMvc = MockMvcBuilders.standaloneSetup(controller)
                .setCustomArgumentResolvers(new PageableHandlerMethodArgumentResolver())
                .setMessageConverters(converter)
                .build();
    }

    // ── calculateTotalHeures ──────────────────────────────────────────

    @Test
    @DisplayName("calculateTotalHeures: retourne la somme des heures")
    void calculateTotalHeures_returnsValue() throws Exception {
        when(kpiService.calculateTotalHeures(any(), any())).thenReturn(240);

        mockMvc.perform(get("/api/v1/kpi/heures")
                        .param("start", "2023-01-01")
                        .param("end", "2023-12-31"))
                .andExpect(status().isOk())
                .andExpect(content().string("240"));
    }

    // ── countUniqueParticipants ───────────────────────────────────────

    @Test
    @DisplayName("countUniqueParticipants: retourne le nombre de participants uniques")
    void countUniqueParticipants_returnsValue() throws Exception {
        when(kpiService.countUniqueParticipants(any(), any())).thenReturn(57);

        mockMvc.perform(get("/api/v1/kpi/participants")
                        .param("start", "2023-01-01")
                        .param("end", "2023-12-31"))
                .andExpect(status().isOk())
                .andExpect(content().string("57"));
    }

    // ── getFormationsByEtat ───────────────────────────────────────────

    @Test
    @DisplayName("getFormationsByEtat: retourne les compteurs par état")
    void getFormationsByEtat_returnsBreakdown() throws Exception {
        FormationsByEtatDTO dto = new FormationsByEtatDTO();
        dto.setTotal(25);
        dto.setPlanifie(10);
        dto.setEnCours(5);
        dto.setAcheve(8);
        dto.setAnnule(2);
        when(kpiService.getFormationsByEtat(any(), any())).thenReturn(dto);

        mockMvc.perform(get("/api/v1/kpi/formations-by-etat")
                        .param("start", "2023-01-01")
                        .param("end", "2023-12-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(25))
                .andExpect(jsonPath("$.planifie").value(10))
                .andExpect(jsonPath("$.enCours").value(5))
                .andExpect(jsonPath("$.acheve").value(8))
                .andExpect(jsonPath("$.annule").value(2));
    }

    // ── getEnseignantsNonAffectes ─────────────────────────────────────

    @Test
    @DisplayName("getEnseignantsNonAffectes: retourne la page paginée")
    void getEnseignantsNonAffectes_returnsPage() throws Exception {
        EnseignantDTO e = new EnseignantDTO();
        e.setId("1");
        e.setNom("Test");
        e.setPrenom("User");
        when(kpiService.getEnseignantsNonAffectes(any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(List.of(e)));

        mockMvc.perform(get("/api/v1/kpi/enseignants-non-affectes")
                        .param("start", "2023-01-01")
                        .param("end", "2023-12-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content[0].nom").value("Test"));
    }

    @Test
    @DisplayName("getEnseignantsNonAffectes: retourne une page vide")
    void getEnseignantsNonAffectes_returnsEmpty() throws Exception {
        when(kpiService.getEnseignantsNonAffectes(any(), any(), any(Pageable.class)))
                .thenReturn(new PageImpl<>(Collections.emptyList()));

        mockMvc.perform(get("/api/v1/kpi/enseignants-non-affectes")
                        .param("start", "2023-01-01")
                        .param("end", "2023-12-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isEmpty());
    }

    // ── topAbsentees: chemins d'erreur non couverts ───────────────────

    @Test
    @DisplayName("topAbsentees: retourne 400 si argument invalide")
    void topAbsentees_badRequest() throws Exception {
        when(kpiService.getTopAbsentees(any(), any(), any(), any()))
                .thenThrow(new IllegalArgumentException("Dates invalides"));

        mockMvc.perform(get("/api/v1/kpi/top-absentees")
                        .param("start", "2023-12-31")
                        .param("end", "2023-01-01"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Dates invalides"));
    }

    @Test
    @DisplayName("topAbsentees: retourne 404 si entité introuvable")
    void topAbsentees_notFound() throws Exception {
        when(kpiService.getTopAbsentees(any(), any(), any(), any()))
                .thenThrow(new EntityNotFoundException("UP inexistante"));

        mockMvc.perform(get("/api/v1/kpi/top-absentees")
                        .param("start", "2023-01-01")
                        .param("end", "2023-12-31"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("UP inexistante"));
    }

    @Test
    @DisplayName("topAbsentees: retourne 500 si erreur serveur")
    void topAbsentees_serverError() throws Exception {
        when(kpiService.getTopAbsentees(any(), any(), any(), any()))
                .thenThrow(new RuntimeException("DB down"));

        mockMvc.perform(get("/api/v1/kpi/top-absentees")
                        .param("start", "2023-01-01")
                        .param("end", "2023-12-31"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Erreur serveur interne"));
    }

    // ── getFormationsByTypeFiltered: chemins d'erreur ─────────────────

    @Test
    @DisplayName("getFormationsByTypeFiltered: retourne 400 si argument invalide")
    void getFormationsByTypeFiltered_badRequest() throws Exception {
        when(kpiService.getFormationsByTypeWithFilters(any(), any()))
                .thenThrow(new IllegalArgumentException("Parametre invalide"));

        mockMvc.perform(get("/api/v1/kpi/formations-by-type-filtered"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Parametre invalide"));
    }

    @Test
    @DisplayName("getFormationsByTypeFiltered: retourne 500 si erreur serveur")
    void getFormationsByTypeFiltered_serverError() throws Exception {
        when(kpiService.getFormationsByTypeWithFilters(any(), any()))
                .thenThrow(new RuntimeException("Unexpected"));

        mockMvc.perform(get("/api/v1/kpi/formations-by-type-filtered"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Erreur serveur interne"));
    }

    // ── countByTrainerTypeWithIds: chemins d'erreur ───────────────────

    @Test
    @DisplayName("countByTrainerTypeWithIds: retourne 400 si argument invalide")
    void countByTrainerTypeWithIds_badRequest() throws Exception {
        when(kpiService.getCountByTrainerTypeWithIds(any(), any()))
                .thenThrow(new IllegalArgumentException("Mauvais filtre"));

        mockMvc.perform(get("/api/v1/kpi/count-by-trainer-type-with-ids"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").value("Mauvais filtre"));
    }

    @Test
    @DisplayName("countByTrainerTypeWithIds: retourne 404 si entité introuvable")
    void countByTrainerTypeWithIds_notFound() throws Exception {
        when(kpiService.getCountByTrainerTypeWithIds(any(), any()))
                .thenThrow(new EntityNotFoundException("Dept inconnu"));

        mockMvc.perform(get("/api/v1/kpi/count-by-trainer-type-with-ids"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").value("Dept inconnu"));
    }

    @Test
    @DisplayName("countByTrainerTypeWithIds: retourne 500 si erreur serveur")
    void countByTrainerTypeWithIds_serverError() throws Exception {
        when(kpiService.getCountByTrainerTypeWithIds(any(), any()))
                .thenThrow(new RuntimeException("Crash"));

        mockMvc.perform(get("/api/v1/kpi/count-by-trainer-type-with-ids"))
                .andExpect(status().isInternalServerError())
                .andExpect(jsonPath("$.error").value("Erreur serveur interne"));
    }
}
