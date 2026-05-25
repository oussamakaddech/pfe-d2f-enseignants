package esprit.pfe.serviceanalyse.services;

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

    @Test
    void testIdentifierGapsViaEvaluations_WithNullNotes() {
        // Test with null notes in evaluations
        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenThrow(new RuntimeException("Comp service down"));

        Map<String, Object> eval = new HashMap<>();
        eval.put("note", null);
        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), eq(List.class)))
            .thenReturn(List.of(eval));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertTrue(gaps.isEmpty(), "Aucun gap ne doit être détecté si toutes les notes sont null");
    }

    @Test
    void testIdentifierGapsViaEvaluations_WithMixedNotes() {
        // Test with mixed null and valid notes in evaluations
        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenThrow(new RuntimeException("Comp service down"));

        Map<String, Object> eval1 = new HashMap<>();
        eval1.put("note", 2.5);

        Map<String, Object> eval2 = new HashMap<>();
        eval2.put("note", null);

        Map<String, Object> eval3 = new HashMap<>();
        eval3.put("note", 3.5);

        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), eq(List.class)))
            .thenReturn(List.of(eval1, eval2, eval3));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertTrue(gaps.isEmpty(), "Aucun gap ne doit être détecté lorsque la moyenne atteint la cible");
    }

    @Test
    void testIdentifierGapsViaEvaluations_WithHighGap() {
        // Test with high gap (gapVal >= 2)
        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenThrow(new RuntimeException("Comp service down"));

        Map<String, Object> eval = new HashMap<>();
        eval.put("note", 1.0); // gapVal = 3.0 - 1.0 = 2.0 -> GRAVITE_ELEVEE
        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), eq(List.class)))
            .thenReturn(List.of(eval));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Les gaps doivent être détectés");
        assertEquals("elevee", gaps.get(0).get("gravite"), "La gravité doit être élevée pour un gap >= 2");
        assertEquals(2.0, gaps.get(0).get("gap"), "Le gap doit être 2.0");
    }

    @Test
    void testIdentifierGapsViaEvaluations_WithMediumGap() {
        // Test with medium gap (0 < gapVal < 2)
        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenThrow(new RuntimeException("Comp service down"));

        Map<String, Object> eval = new HashMap<>();
        eval.put("note", 2.5); // gapVal = 3.0 - 2.5 = 0.5 -> GRAVITE_MOYENNE
        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), eq(List.class)))
            .thenReturn(List.of(eval));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Les gaps doivent être détectés");
        assertEquals("moyenne", gaps.get(0).get("gravite"), "La gravité doit être moyenne pour un gap < 2");
        assertEquals(0.5, gaps.get(0).get("gap"), "Le gap doit être 0.5");
    }

    @Test
    void testIdentifierGapsViaEvaluations_WithNoGap() {
        // Test with no gap (gapVal <= 0)
        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenThrow(new RuntimeException("Comp service down"));

        Map<String, Object> eval = new HashMap<>();
        eval.put("note", 4.0); // gapVal = 3.0 - 4.0 = -1.0 -> Math.max(0, -1.0) = 0.0
        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), eq(List.class)))
            .thenReturn(List.of(eval));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertTrue(gaps.isEmpty(), "Aucun gap ne doit être détecté si la note moyenne est >= 3.0");
    }

    @Test
    void testIdentifierGapsViaEvaluations_WithEmptyEvals() {
        // Test with empty evaluations
        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenThrow(new RuntimeException("Comp service down"));

        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertTrue(gaps.isEmpty(), "Aucun gap ne doit être détecté avec des évaluations vides");
    }

    @Test
    void testIdentifierGapsViaEvaluations_WithServiceFailure() {
        // Test with service failure
        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenThrow(new RuntimeException("Comp service down"));

        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), eq(List.class)))
            .thenThrow(new RuntimeException("Eval service down"));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertTrue(gaps.isEmpty(), "Aucun gap ne doit être détecté en cas d'échec du service d'évaluation");
    }

    @Test
    void testIdentifierGapsViaEvaluations_WithAllNullNotes() {
        // Test with all null notes
        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenThrow(new RuntimeException("Comp service down"));

        Map<String, Object> eval1 = new HashMap<>();
        eval1.put("note", null);

        Map<String, Object> eval2 = new HashMap<>();
        eval2.put("note", null);

        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), eq(List.class)))
            .thenReturn(List.of(eval1, eval2));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertTrue(gaps.isEmpty(), "Aucun gap ne doit être détecté si toutes les notes sont null");
    }
}
