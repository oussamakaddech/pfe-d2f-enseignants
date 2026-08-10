package esprit.pfe.serviceanalyse.services;
import static esprit.pfe.serviceanalyse.services.RestTemplateMockHelper.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
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
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "DEBUTANT"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);

        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty());
        assertEquals("elevee", gaps.get(0).get("gravite")); // gap = 4 - 1 = 3 -> elevee
    }

    @Test
    void testAnalyserEnseignant_NullDataHandling() {
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, COMPETENCES_ENSEIGNANT, new RuntimeException("down"));
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, EVALUATIONS, new RuntimeException("down"));
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, COMPETENCES_DOMAINE, new RuntimeException("down"));
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, FORMATIONS, new RuntimeException("down"));
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, FORMATION_COMPETENCES, new RuntimeException("down"));
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, BESOINS, new RuntimeException("down"));

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);

        assertNotNull(result);
        assertTrue(((List) result.get("gaps")).isEmpty());
    }

    @Test
    void testDashboardMetrics() {
        Map<String, Object> evalLow = new HashMap<>();
        evalLow.put("noteGlobale", 1.5);
        evalLow.put("enseignantId", "ens_at_risk");

        Map<String, Object> evalHigh = new HashMap<>();
        evalHigh.put("noteGlobale", 4.0);
        evalHigh.put("enseignantId", "ens_safe");

        RestTemplateMockHelper.mockEndpoint(restTemplate, EVALUATIONS, evalLow, evalHigh);

        Map<String, Object> result = analysePredictiveService.analyserTendancesGlobales();
        Map<String, Object> dashboard = (Map<String, Object>) result.get("dashboard");

        List<String> atRisk = (List<String>) dashboard.get("enseignantsARisque");
        assertTrue(atRisk.contains("ens_at_risk"));
    }

    @Test
    void testParseNiveau_AllCases() {
        String[] levels = {"DEBUTANT", "INITIE", "CONFIRME", "AVANCE", "EXPERT", "NIVEAU_1", "NIVEAU_5", "UNKNOWN"};

        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        for (String level : levels) {
            Map<String, Object> aff = new HashMap<>();
            aff.put("competenceId", 1L);
            aff.put("competenceNom", "Java");
            aff.put("niveau", level);
            RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT, aff);

            Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
            assertNotNull(result, "Le résultat ne doit pas être null pour le niveau: " + level);
            assertEquals("ens1", result.get("enseignantId"), "L'ID enseignant doit être correct");
        }
    }

    @Test
    void testPartialFailureFallbacks() {
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, COMPETENCES_ENSEIGNANT, new RuntimeException("Comp service down"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, EVALUATIONS, RestTemplateMockHelper.evaluation(2.0));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);

        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty());
        assertEquals("EVAL-001", gaps.get(0).get("competenceCode"));
    }

    @Test
    void testCalculateProbabiliteBranches() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT);
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        Map<String, Object> formation = RestTemplateMockHelper.formation(101L, "Java Advanced", "PLANIFIEE");
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS, formation);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", 999L); // non-existent gap
        assertNotNull(result, "Le résultat ne doit pas être null");
        assertEquals("Analyse ciblée compétence 999", result.get("competenceAnalysee"));
    }
}
