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
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AnalysePredictiveServiceGapsTest {

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

    private void stubEnvAutour() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);
    }

    @Test
    void testIdentifierGapsViaEvaluations_WithNullNotes() {
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, COMPETENCES_ENSEIGNANT, new RuntimeException("Comp service down"));
        Map<String, Object> eval = new HashMap<>();
        eval.put("noteGlobale", null);
        eval.put("enseignantId", "ens1");
        RestTemplateMockHelper.mockEndpoint(restTemplate, EVALUATIONS, eval);
        stubEnvAutour();

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertTrue(gaps.isEmpty(), "Aucun gap ne doit être détecté si toutes les notes sont null");
    }

    @Test
    void testIdentifierGapsViaEvaluations_WithMixedNotes() {
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, COMPETENCES_ENSEIGNANT, new RuntimeException("Comp service down"));

        Map<String, Object> eval1 = new HashMap<>();
        eval1.put("noteGlobale", 2.5);
        eval1.put("enseignantId", "ens1");

        Map<String, Object> eval2 = new HashMap<>();
        eval2.put("noteGlobale", null);
        eval2.put("enseignantId", "ens2");

        Map<String, Object> eval3 = new HashMap<>();
        eval3.put("noteGlobale", 3.5);
        eval3.put("enseignantId", "ens3");

        RestTemplateMockHelper.mockEndpoint(restTemplate, EVALUATIONS, eval1, eval2, eval3);
        stubEnvAutour();

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertTrue(gaps.isEmpty(), "Aucun gap ne doit être détecté lorsque la moyenne atteint la cible");
    }

    @Test
    void testIdentifierGapsViaEvaluations_WithHighGap() {
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, COMPETENCES_ENSEIGNANT, new RuntimeException("Comp service down"));

        Map<String, Object> eval = new HashMap<>();
        eval.put("noteGlobale", 1.0);
        eval.put("enseignantId", "ens1");
        RestTemplateMockHelper.mockEndpoint(restTemplate, EVALUATIONS, eval);
        stubEnvAutour();

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Les gaps doivent être détectés");
        assertEquals("elevee", gaps.get(0).get("gravite"), "La gravité doit être élevée pour un gap >= 2");
        assertEquals(2.0, gaps.get(0).get("gap"), "Le gap doit être 2.0");
    }

    @Test
    void testIdentifierGapsViaEvaluations_WithMediumGap() {
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, COMPETENCES_ENSEIGNANT, new RuntimeException("Comp service down"));

        Map<String, Object> eval = new HashMap<>();
        eval.put("noteGlobale", 2.5);
        eval.put("enseignantId", "ens1");
        RestTemplateMockHelper.mockEndpoint(restTemplate, EVALUATIONS, eval);
        stubEnvAutour();

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Les gaps doivent être détectés");
        assertEquals("moyenne", gaps.get(0).get("gravite"), "La gravité doit être moyenne pour un gap < 2");
        assertEquals(0.5, gaps.get(0).get("gap"), "Le gap doit être 0.5");
    }

    @Test
    void testIdentifierGapsViaEvaluations_WithNoGap() {
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, COMPETENCES_ENSEIGNANT, new RuntimeException("Comp service down"));

        Map<String, Object> eval = new HashMap<>();
        eval.put("noteGlobale", 4.0);
        eval.put("enseignantId", "ens1");
        RestTemplateMockHelper.mockEndpoint(restTemplate, EVALUATIONS, eval);
        stubEnvAutour();

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertTrue(gaps.isEmpty(), "Aucun gap ne doit être détecté si la note moyenne est >= 3.0");
    }

    @Test
    void testIdentifierGapsViaEvaluations_WithEmptyEvals() {
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, COMPETENCES_ENSEIGNANT, new RuntimeException("Comp service down"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, EVALUATIONS);
        stubEnvAutour();

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertTrue(gaps.isEmpty(), "Aucun gap ne doit être détecté avec des évaluations vides");
    }

    @Test
    void testIdentifierGapsViaEvaluations_WithServiceFailure() {
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, COMPETENCES_ENSEIGNANT, new RuntimeException("Comp service down"));
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, EVALUATIONS, new RuntimeException("Eval service down"));
        stubEnvAutour();

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertTrue(gaps.isEmpty(), "Aucun gap ne doit être détecté en cas d'échec du service d'évaluation");
    }

    @Test
    void testIdentifierGapsViaEvaluations_WithAllNullNotes() {
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, COMPETENCES_ENSEIGNANT, new RuntimeException("Comp service down"));

        Map<String, Object> eval1 = new HashMap<>();
        eval1.put("noteGlobale", null);
        eval1.put("enseignantId", "ens1");

        Map<String, Object> eval2 = new HashMap<>();
        eval2.put("noteGlobale", null);
        eval2.put("enseignantId", "ens2");

        RestTemplateMockHelper.mockEndpoint(restTemplate, EVALUATIONS, eval1, eval2);
        stubEnvAutour();

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertTrue(gaps.isEmpty(), "Aucun gap ne doit être détecté si toutes les notes sont null");
    }
}
