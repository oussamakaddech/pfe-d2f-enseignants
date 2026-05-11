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
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.*;
import java.util.stream.Stream;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalysePredictiveServiceBesoinsTest {

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
    @MethodSource("providePriorityTestCases")
    void testDetecterBesoins_WithPriority(int count, String expectedPriority, String expectedType) {
        // Test with different priorities
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        Map<String, Object> besoin = new HashMap<>();
        besoin.put("competence", "Java");
        besoin.put("titre", "Formation Java");

        List<Map<String, Object>> besoinsList = new ArrayList<>();
        for (int i = 0; i < count; i++) {
            besoinsList.add(besoin);
        }

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(besoinsList);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertFalse(besoins.isEmpty(), "Les besoins doivent être détectés");
        assertEquals(expectedPriority, besoins.get(0).get("priorite"), "La priorité doit être " + expectedPriority);
        assertEquals(expectedType, besoins.get(0).get("type"), "Le type doit être " + expectedType);
    }

    private static Stream<Arguments> providePriorityTestCases() {
        return Stream.of(
            Arguments.of(5, "haute", "collectif"),
            Arguments.of(2, "moyenne", "collectif"),
            Arguments.of(1, "faible", "individuel")
        );
    }

    @Test
    void testDetecterBesoins_WithOnlyTitre() {
        // Test with only titre (no competence)
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        Map<String, Object> besoin = new HashMap<>();
        besoin.put("titre", "Formation Java");

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(List.of(besoin));

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertFalse(besoins.isEmpty(), "Les besoins doivent être détectés même sans compétence");
    }

    @Test
    void testDetecterBesoins_WithOnlyCompetence() {
        // Test with only competence (no titre)
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        Map<String, Object> besoin = new HashMap<>();
        besoin.put("competence", "Java");

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(List.of(besoin));

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertFalse(besoins.isEmpty(), "Les besoins doivent être détectés même sans titre");
    }

    @Test
    void testDetecterBesoins_WithNeitherCompetenceNorTitre() {
        // Test with neither competence nor titre (should use "inconnu")
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        Map<String, Object> besoin = new HashMap<>();
        besoin.put("otherField", "value");

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(List.of(besoin));

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertFalse(besoins.isEmpty(), "Les besoins doivent être détectés même sans compétence ni titre");
    }

    @Test
    void testDetecterBesoins_WithServiceFailure() {
        // Test with service failure (fallback via gaps)
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenThrow(new RuntimeException("Service down"));

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertFalse(besoins.isEmpty(), "Les besoins doivent être détectés via le fallback des gaps");
        assertEquals("individuel", besoins.get(0).get("type"), "Le type doit être individuel pour le fallback");
    }

    @Test
    void testDetecterBesoins_WithMultipleBesoins() {
        // Test with multiple besoins with different priorities
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        Map<String, Object> besoin1 = new HashMap<>();
        besoin1.put("competence", "Java");

        Map<String, Object> besoin2 = new HashMap<>();
        besoin2.put("competence", "Python");

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(List.of(besoin1, besoin1, besoin1, besoin1, besoin1, besoin2)); // 5 Java, 1 Python

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertEquals(2, besoins.size(), "Deux types de besoins doivent être détectés");
        // Besoins should be sorted by priority (high first)
        assertEquals("haute", besoins.get(0).get("priorite"), "Java doit avoir une priorité haute");
        assertEquals("faible", besoins.get(1).get("priorite"), "Python doit avoir une priorité faible");
    }
}
