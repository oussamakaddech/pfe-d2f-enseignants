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
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.Pageable;
import org.springframework.data.web.PageableHandlerMethodArgumentResolver;
import org.springframework.http.converter.json.MappingJackson2HttpMessageConverter;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.setup.MockMvcBuilders;

import java.util.*;

import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

/**
 * Tests améliorés pour KPIController
 * Couvre les méthodes de calcul, filtrage et gestion des erreurs
 */
@ExtendWith(MockitoExtension.class)
@DisplayName("KPIController - Tests améliorés")
class KPIControllerEnhancedTest {

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

    @Test
    @DisplayName("countTotalFormations - Devrait retourner le nombre de formations")
    void testCountTotalFormations() throws Exception {
        when(kpiService.countTotalFormations(any(), any())).thenReturn(10);

        mockMvc.perform(get("/api/v1/kpi/formations")
                .param("start", "2023-01-01")
                .param("end", "2023-12-31"))
                .andExpect(status().isOk());

        verify(kpiService).countTotalFormations(any(), any());
    }

    @Test
    @DisplayName("calculateTotalHeures - Devrait retourner le total des heures")
    void testCalculateTotalHeures() throws Exception {
        when(kpiService.calculateTotalHeures(any(), any())).thenReturn(120);

        mockMvc.perform(get("/api/v1/kpi/heures")
                .param("start", "2023-01-01")
                .param("end", "2023-12-31"))
                .andExpect(status().isOk());

        verify(kpiService).calculateTotalHeures(any(), any());
    }

    @Test
    @DisplayName("countUniqueParticipants - Devrait retourner le nombre de participants uniques")
    void testCountUniqueParticipants() throws Exception {
        when(kpiService.countUniqueParticipants(any(), any())).thenReturn(45);

        mockMvc.perform(get("/api/v1/kpi/participants")
                .param("start", "2023-01-01")
                .param("end", "2023-12-31"))
                .andExpect(status().isOk());

        verify(kpiService).countUniqueParticipants(any(), any());
    }

    @Test
    @DisplayName("getFormationsByEtat - Devrait retourner les formations par état")
    void testGetFormationsByEtat() throws Exception {
        FormationsByEtatDTO dto = new FormationsByEtatDTO();
        dto.setEnregistre(5);
        dto.setPlanifie(3);
        dto.setEnCours(2);
        dto.setAcheve(10);
        dto.setAnnule(1);
        dto.setTotal(21);

        when(kpiService.getFormationsByEtat(any(), any())).thenReturn(dto);

        mockMvc.perform(get("/api/v1/kpi/formations-by-etat")
                .param("start", "2023-01-01")
                .param("end", "2023-12-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.total").value(21));

        verify(kpiService).getFormationsByEtat(any(), any());
    }

    @Test
    @DisplayName("topParticipants - Devrait retourner les top participants")
    void testTopParticipants_Success() throws Exception {
        List<EnseignantStatsDTO> stats = List.of(
                new EnseignantStatsDTO("E001", "Dupont", "Jean", 10L),
                new EnseignantStatsDTO("E002", "Martin", "Marie", 8L)
        );
        when(kpiService.getTopParticipants(any(), any(), any(), any())).thenReturn(stats);

        mockMvc.perform(get("/api/v1/kpi/top-participants")
                .param("start", "2023-01-01")
                .param("end", "2023-12-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(2));

        verify(kpiService).getTopParticipants(any(), any(), any(), any());
    }

    @Test
    @DisplayName("topParticipants - Devrait retourner 204 si vide")
    void testTopParticipants_NoContent() throws Exception {
        when(kpiService.getTopParticipants(any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/kpi/top-participants")
                .param("start", "2023-01-01")
                .param("end", "2023-12-31"))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("topParticipants - Devrait gérer les dates invalides")
    void testTopParticipants_InvalidDates() throws Exception {
        when(kpiService.getTopParticipants(any(), any(), any(), any()))
                .thenThrow(new IllegalArgumentException("Dates invalides"));

        mockMvc.perform(get("/api/v1/kpi/top-participants")
                .param("start", "2023-12-31")
                .param("end", "2023-01-01"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @DisplayName("topParticipants - Devrait gérer UP invalide")
    void testTopParticipants_InvalidUp() throws Exception {
        when(kpiService.getTopParticipants(any(), any(), any(), any()))
                .thenThrow(new EntityNotFoundException("UP non trouvée"));

        mockMvc.perform(get("/api/v1/kpi/top-participants")
                .param("upId", "INVALID")
                .param("start", "2023-01-01")
                .param("end", "2023-12-31"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @DisplayName("topAbsentees - Devrait retourner les top absents")
    void testTopAbsentees_Success() throws Exception {
        List<EnseignantStatsDTO> stats = List.of(
                new EnseignantStatsDTO("E001", "Dupont", "Jean", 5L)
        );
        when(kpiService.getTopAbsentees(any(), any(), any(), any())).thenReturn(stats);

        mockMvc.perform(get("/api/v1/kpi/top-absentees")
                .param("start", "2023-01-01")
                .param("end", "2023-12-31"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$").isArray())
                .andExpect(jsonPath("$.length()").value(1));

        verify(kpiService).getTopAbsentees(any(), any(), any(), any());
    }

    @Test
    @DisplayName("topAbsentees - Devrait retourner 204 si vide")
    void testTopAbsentees_NoContent() throws Exception {
        when(kpiService.getTopAbsentees(any(), any(), any(), any()))
                .thenReturn(Collections.emptyList());

        mockMvc.perform(get("/api/v1/kpi/top-absentees")
                .param("start", "2023-01-01")
                .param("end", "2023-12-31"))
                .andExpect(status().isNoContent());
    }

    @Test
    @DisplayName("topAbsentees - Devrait gérer département invalide")
    void testTopAbsentees_InvalidDept() throws Exception {
        when(kpiService.getTopAbsentees(any(), any(), any(), any()))
                .thenThrow(new EntityNotFoundException("Département non trouvé"));

        mockMvc.perform(get("/api/v1/kpi/top-absentees")
                .param("deptId", "INVALID")
                .param("start", "2023-01-01")
                .param("end", "2023-12-31"))
                .andExpect(status().isNotFound())
                .andExpect(jsonPath("$.error").exists());
    }

    @Test
    @DisplayName("getEnseignantsNonAffectes - Devrait retourner les enseignants non affectés")
    void testGetEnseignantsNonAffectes() throws Exception {
        List<EnseignantDTO> enseignants = List.of(
                createEnseignantDTO("E001", "Dupont", "Jean", "jean.dupont@esprit.tn")
        );
        when(kpiService.getEnseignantsNonAffectes(any(), any(), any(Pageable.class))).thenReturn(new PageImpl<>(enseignants));

        mockMvc.perform(get("/api/v1/kpi/enseignants-non-affectes")
                .param("start", "2023-01-01")
                .param("end", "2023-12-31"))
                .andExpect(status().isOk());

        verify(kpiService).getEnseignantsNonAffectes(any(), any(), any(Pageable.class));
    }

    @Test
    @DisplayName("countAndHeuresWithFilters - Devrait retourner le compte et les heures")
    void testCountAndHeuresWithFilters() throws Exception {
        CountHeuresDTO dto = new CountHeuresDTO(10L, 100L);
        when(kpiService.getCountAndSumHeures(any(), any())).thenReturn(dto);

        mockMvc.perform(get("/api/v1/kpi/count-heures")
                .param("competence", "Java")
                .param("etat", "ACHEVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.count").value(10))
                .andExpect(jsonPath("$.totalHeures").value(100));

        verify(kpiService).getCountAndSumHeures(any(), any());
    }

    @Test
    @DisplayName("getFormationsByTypeFiltered - Devrait retourner les formations par type")
    void testGetFormationsByTypeFiltered() throws Exception {
        FormationsByTypeDTO dto = new FormationsByTypeDTO(5L, 3L, 2L);
        when(kpiService.getFormationsByTypeWithFilters(any(), any())).thenReturn(dto);

        mockMvc.perform(get("/api/v1/kpi/formations-by-type-filtered")
                .param("domaine", "Informatique")
                .param("etat", "PLANIFIE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.interne").value(5))
                .andExpect(jsonPath("$.externe").value(3))
                .andExpect(jsonPath("$.enLigne").value(2));

        verify(kpiService).getFormationsByTypeWithFilters(any(), any());
    }

    @Test
    @DisplayName("countByTrainerTypeWithIds - Devrait retourner le compte par type de formateur")
    void testCountByTrainerTypeWithIds() throws Exception {
        CountByTrainerTypeWithIdsDTO dto = new CountByTrainerTypeWithIdsDTO(
                5L, 3L, 2L,
                List.of(1L, 2L),
                List.of(3L),
                List.of(4L)
        );
        when(kpiService.getCountByTrainerTypeWithIds(any(), any())).thenReturn(dto);

        mockMvc.perform(get("/api/v1/kpi/count-by-trainer-type-with-ids")
                .param("etat", "ACHEVE"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.externeOnlyCount").value(5))
                .andExpect(jsonPath("$.interneOnlyCount").value(3))
                .andExpect(jsonPath("$.mixteCount").value(2));

        verify(kpiService).getCountByTrainerTypeWithIds(any(), any());
    }

    // Méthodes utilitaires pour créer des objets de test
    private EnseignantDTO createEnseignantDTO(String id, String nom, String prenom, String mail) {
        EnseignantDTO dto = new EnseignantDTO();
        dto.setId(id);
        dto.setNom(nom);
        dto.setPrenom(prenom);
        dto.setMail(mail);
        return dto;
    }
}

