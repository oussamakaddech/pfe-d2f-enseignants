package esprit.pfe.serviceanalyse.controllers;

import esprit.pfe.serviceanalyse.services.AnalysePredictiveService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.autoconfigure.web.servlet.WebMvcTest;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;

import java.util.HashMap;
import java.util.List;
import java.util.Map;


import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

@WebMvcTest(AnalysePredictiveController.class)
@AutoConfigureMockMvc(addFilters = false)
class AnalysePredictiveControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @MockitoBean
    private AnalysePredictiveService analysePredictiveService;

    @Test
    void testAnalyserEnseignant() throws Exception {
        when(analysePredictiveService.analyserEnseignant("ens1", null)).thenReturn(new HashMap<>());

        mockMvc.perform(get("/api/v1/analyse-predictive/enseignant/ens1"))
                .andExpect(status().isOk());
    }

    @Test
    void testAnalyserEnseignant_WithCompetenceCible() throws Exception {
        Map<String, Object> mockResult = new HashMap<>();
        mockResult.put("enseignantId", "ens1");
        mockResult.put("competenceAnalysee", "Analyse ciblée compétence 1");

        when(analysePredictiveService.analyserEnseignant("ens1", 1L)).thenReturn(mockResult);

        mockMvc.perform(get("/api/v1/analyse-predictive/enseignant/ens1")
                .param("competenceCible", "1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enseignantId").value("ens1"))
                .andExpect(jsonPath("$.competenceAnalysee").value("Analyse ciblée compétence 1"));
    }

    @Test
    void testAnalyserEnseignant_WithGaps() throws Exception {
        Map<String, Object> mockResult = new HashMap<>();
        mockResult.put("enseignantId", "ens1");

        Map<String, Object> gap1 = new HashMap<>();
        gap1.put("competenceLabel", "Java");
        gap1.put("gap", 2.0);
        gap1.put("gravite", "moyenne");

        mockResult.put("gaps", List.of(gap1));

        when(analysePredictiveService.analyserEnseignant("ens1", null)).thenReturn(mockResult);

        mockMvc.perform(get("/api/v1/analyse-predictive/enseignant/ens1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enseignantId").value("ens1"))
                .andExpect(jsonPath("$.gaps[0].competenceLabel").value("Java"))
                .andExpect(jsonPath("$.gaps[0].gap").value(2.0))
                .andExpect(jsonPath("$.gaps[0].gravite").value("moyenne"));
    }

    @Test
    void testAnalyserEnseignant_WithRecommendations() throws Exception {
        Map<String, Object> mockResult = new HashMap<>();
        mockResult.put("enseignantId", "ens1");

        Map<String, Object> reco1 = new HashMap<>();
        reco1.put("titre", "Java Advanced");
        reco1.put("priorite", "haute");

        mockResult.put("recommandationsFormations", List.of(reco1));

        when(analysePredictiveService.analyserEnseignant("ens1", null)).thenReturn(mockResult);

        mockMvc.perform(get("/api/v1/analyse-predictive/enseignant/ens1"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.enseignantId").value("ens1"))
                .andExpect(jsonPath("$.recommandationsFormations[0].titre").value("Java Advanced"))
                .andExpect(jsonPath("$.recommandationsFormations[0].priorite").value("haute"));
    }

    @Test
    void testTendancesGlobales() throws Exception {
        when(analysePredictiveService.analyserTendancesGlobales()).thenReturn(new HashMap<>());

        mockMvc.perform(get("/api/v1/analyse-predictive/tendances"))
                .andExpect(status().isOk());
    }

    @Test
    void testTendancesGlobales_WithStatistics() throws Exception {
        Map<String, Object> mockResult = new HashMap<>();

        Map<String, Object> stats = new HashMap<>();
        stats.put("totalEvaluations", 10);
        stats.put("noteMoyenne", 3.5);

        mockResult.put("statistiques", stats);

        when(analysePredictiveService.analyserTendancesGlobales()).thenReturn(mockResult);

        mockMvc.perform(get("/api/v1/analyse-predictive/tendances"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.statistiques.totalEvaluations").value(10))
                .andExpect(jsonPath("$.statistiques.noteMoyenne").value(3.5));
    }

    @Test
    void testTendancesGlobales_WithDashboard() throws Exception {
        Map<String, Object> mockResult = new HashMap<>();

        Map<String, Object> dashboard = new HashMap<>();
        dashboard.put("enseignantsARisque", List.of("ens1", "ens2"));

        mockResult.put("dashboard", dashboard);

        when(analysePredictiveService.analyserTendancesGlobales()).thenReturn(mockResult);

        mockMvc.perform(get("/api/v1/analyse-predictive/tendances"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.dashboard.enseignantsARisque[0]").value("ens1"))
                .andExpect(jsonPath("$.dashboard.enseignantsARisque[1]").value("ens2"));
    }

    @Test
    void testListerEnseignants() throws Exception {
        when(analysePredictiveService.listerEnseignants(PageRequest.of(0, 10))).thenReturn(new PageImpl<>(List.of(), PageRequest.of(0, 10), 0));

        mockMvc.perform(get("/api/v1/analyse-predictive/enseignants")
                .param("page", "0")
                .param("size", "10"))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.content").isArray())
                .andExpect(jsonPath("$.totalElements").value(0));
    }
}
