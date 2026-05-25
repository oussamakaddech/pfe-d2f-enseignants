package esprit.pfe.serviceanalyse.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.Arguments;
import org.junit.jupiter.params.provider.MethodSource;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.mockito.junit.jupiter.MockitoSettings;
import org.mockito.quality.Strictness;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AnalysePredictiveServiceGraviteTest {

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

    @ParameterizedTest
    @MethodSource("provideGapTestCases")
    void testGetGraviteValue_WithGap(int niveauMaitrise, String expectedGravite, boolean shouldHaveGap) {
        // Test with different gap values
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", niveauMaitrise);

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");

        if (shouldHaveGap) {
            assertFalse(gaps.isEmpty(), "Les gaps doivent être détectés");
            assertEquals(expectedGravite, gaps.get(0).get("gravite"), "La gravité doit être " + expectedGravite);
        } else {
            assertTrue(gaps.isEmpty(), "Aucun gap ne doit être détecté si le niveau actuel est égal au niveau cible");
        }
    }

    private static Stream<Arguments> provideGapTestCases() {
        return Stream.of(
            Arguments.of(1, "elevee", true),    // gap = 4 - 1 = 3
            Arguments.of(2, "moyenne", true),   // gap = 4 - 2 = 2
            Arguments.of(3, "faible", true),    // gap = 4 - 3 = 1
            Arguments.of(4, null, false)        // gap = 4 - 4 = 0
        );
    }

    @Test
    void testGetGraviteOrder_WithHighGravite() {
        // Test with high gravite
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 1); // High gap

        Map<String, Object> comp2 = new HashMap<>();
        comp2.put("id", 2);
        comp2.put("nom", "Python");
        Map<String, Object> aff2 = new HashMap<>();
        aff2.put("competence", comp2);
        aff2.put("niveauMaitrise", 3); // Low gap

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenReturn(List.of(aff, aff2));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertEquals(2, gaps.size(), "Deux gaps doivent être détectés");
        assertEquals("elevee", gaps.get(0).get("gravite"), "Le premier gap doit avoir une gravité élevée");
        assertEquals("faible", gaps.get(1).get("gravite"), "Le deuxième gap doit avoir une gravité faible");
    }

    @Test
    void testGetGraviteOrder_WithMediumGravite() {
        // Test with medium gravite
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2); // Medium gap

        Map<String, Object> comp2 = new HashMap<>();
        comp2.put("id", 2);
        comp2.put("nom", "Python");
        Map<String, Object> aff2 = new HashMap<>();
        aff2.put("competence", comp2);
        aff2.put("niveauMaitrise", 3); // Low gap

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenReturn(List.of(aff, aff2));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertEquals(2, gaps.size(), "Deux gaps doivent être détectés");
        assertEquals("moyenne", gaps.get(0).get("gravite"), "Le premier gap doit avoir une gravité moyenne");
        assertEquals("faible", gaps.get(1).get("gravite"), "Le deuxième gap doit avoir une gravité faible");
    }

    @Test
    void testGetGraviteOrder_WithUnknownGravite() {
        // Test with unknown gravite
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2); // Medium gap

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenReturn(List.of(aff));
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
        // The gravite should be "moyenne" for a gap of 2
        assertEquals("moyenne", gaps.get(0).get("gravite"), "La gravité doit être moyenne pour un gap de 2");
    }
}
