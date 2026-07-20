package esprit.pfe.serviceanalyse.services;
import static esprit.pfe.serviceanalyse.services.RestTemplateMockHelper.*;

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

    private static String niveauString(int n) {
        return switch (n) {
            case 1 -> "DEBUTANT";
            case 2 -> "INITIE";
            case 3 -> "CONFIRME";
            case 4 -> "AVANCE";
            case 5 -> "EXPERT";
            default -> "DEBUTANT";
        };
    }

    @ParameterizedTest
    @MethodSource("provideGapTestCases")
    void testGetGraviteValue_WithGap(int niveauMaitrise, String expectedGravite, boolean shouldHaveGap) {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", niveauString(niveauMaitrise)));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

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
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "DEBUTANT"),
                RestTemplateMockHelper.affectation(2L, "Python", 1L, "DOM", "CONFIRME"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertEquals(2, gaps.size(), "Deux gaps doivent être détectés");
        assertEquals("elevee", gaps.get(0).get("gravite"), "Le premier gap doit avoir une gravité élevée");
        assertEquals("faible", gaps.get(1).get("gravite"), "Le deuxième gap doit avoir une gravité faible");
    }

    @Test
    void testGetGraviteOrder_WithMediumGravite() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"),
                RestTemplateMockHelper.affectation(2L, "Python", 1L, "DOM", "CONFIRME"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertEquals(2, gaps.size(), "Deux gaps doivent être détectés");
        assertEquals("moyenne", gaps.get(0).get("gravite"), "Le premier gap doit avoir une gravité moyenne");
        assertEquals("faible", gaps.get(1).get("gravite"), "Le deuxième gap doit avoir une gravité faible");
    }

    @Test
    void testGetGraviteOrder_WithUnknownGravite() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Les gaps doivent être détectés");
        assertEquals("moyenne", gaps.get(0).get("gravite"), "La gravité doit être moyenne pour un gap de 2");
    }
}
