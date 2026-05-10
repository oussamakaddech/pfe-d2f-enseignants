package esprit.pfe.serviceanalyse.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalysePredictiveServiceExtendedTest {

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private AnalysePredictiveService analysePredictiveService;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(analysePredictiveService, "evaluationServiceUrl", "http://eval");
        ReflectionTestUtils.setField(analysePredictiveService, "formationServiceUrl", "http://form");
        ReflectionTestUtils.setField(analysePredictiveService, "competenceServiceUrl", "http://comp");
        ReflectionTestUtils.setField(analysePredictiveService, "besoinFormationServiceUrl", "http://besoin");
    }

    @Test
    void testAnalyserEnseignant_PriorityCalculations() {
        // Mock competence data (Low note -> High priority)
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 1); // Very low
        when(restTemplate.getForObject(anyString(), eq(List.class))).thenReturn(List.of(aff));

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);

        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty());
        assertEquals("elevee", gaps.get(0).get("gravite")); // gap = 4 - 1 = 3 -> elevee
    }

    @Test
    void testAnalyserEnseignant_NullDataHandling() {
        // Mock services returning null or empty
        when(restTemplate.getForObject(anyString(), eq(List.class))).thenReturn(null);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);

        assertNotNull(result);
        assertTrue(((List)result.get("gaps")).isEmpty());
    }

    @Test
    void testDashboardMetrics() {
        Map<String, Object> evalLow = new HashMap<>();
        evalLow.put("note", 1.5);
        evalLow.put("evaluateurId", "ens_at_risk");

        Map<String, Object> evalHigh = new HashMap<>();
        evalHigh.put("note", 4.0);
        evalHigh.put("evaluateurId", "ens_safe");

        when(restTemplate.getForObject(anyString(), eq(List.class))).thenReturn(List.of(evalLow, evalHigh));

        Map<String, Object> result = analysePredictiveService.analyserTendancesGlobales();
        Map<String, Object> dashboard = (Map<String, Object>) result.get("dashboard");

        List<String> atRisk = (List<String>) dashboard.get("enseignantsARisque");
        assertTrue(atRisk.contains("ens_at_risk"));
    }

    @Test
    void testParseNiveau_AllCases() {
        String[] levels = {"DEBUTANT", "INITIE", "CONFIRME", "AVANCE", "EXPERT", "NIVEAU_1", "NIVEAU_5", "UNKNOWN"};
        for (String level : levels) {
            Map<String, Object> comp = new HashMap<>();
            comp.put("id", 1);
            Map<String, Object> aff = new HashMap<>();
            aff.put("competence", comp);
            aff.put("niveauMaitrise", level);
            when(restTemplate.getForObject(anyString(), eq(List.class))).thenReturn(List.of(aff));
            
            Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
            assertNotNull(result, "Le résultat ne doit pas être null pour le niveau: " + level);
            assertEquals("ens1", result.get("enseignantId"), "L'ID enseignant doit être correct");
        }
    }

    @Test
    void testPartialFailureFallbacks() {
        // identifierGaps fails -> calls identifierGapsViaEvaluations
        // We mock the first call to fail and the second to succeed
        
        // compUrl contains "/api/v1/enseignant-competences"
        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenThrow(new RuntimeException("Comp service down"));
            
        // evalUrl contains "/evaluation/evaluations-globales"
        Map<String, Object> eval = new HashMap<>();
        eval.put("note", 2.0);
        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), eq(List.class)))
            .thenReturn(List.of(eval));
            
        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty());
        assertEquals("EVAL-001", gaps.get(0).get("competenceCode"));
    }

    @Test
    void testCalculateProbabiliteBranches() {
        // Test when cibleUnGap is false and etat is different
        // RecommanderFormations will call formations and then checkFormationCibleGaps
        Map<String, Object> formation = new HashMap<>();
        formation.put("idFormation", 101);
        formation.put("etatFormation", "PLANIFIEE");
        
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(List.of(formation));
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(Collections.emptyList());
            
        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", 999L); // non-existent gap
        assertNotNull(result, "Le résultat ne doit pas être null");
        assertEquals("Analyse ciblée compétence 999", result.get("competenceAnalysee"));
    }
}
