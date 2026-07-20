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
import static org.mockito.Mockito.lenient;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
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
        @MethodSource("provideBesoinsTestCases")
        void testDetecterBesoins(int count, String expectedPriority, String expectedType, String testName) {
                RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                        RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
                RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
                RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
                RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);

                Map<String, Object> besoin = new HashMap<>();
                besoin.put("competenceNom", "Java");
                besoin.put("titre", "Formation Java");

                List<Map<String, Object>> besoinsList = new ArrayList<>();
                for (int i = 0; i < count; i++) {
                        besoinsList.add(besoin);
                }
                RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS, besoinsList.toArray());

                Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
                assertNotNull(result);
                List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
                assertFalse(besoins.isEmpty(), "Les besoins doivent être détectés");
        }

        private static Stream<Arguments> provideBesoinsTestCases() {
                return Stream.of(
                                Arguments.of(5, "haute", "collectif", "testWithHighPriority"),
                                Arguments.of(2, "moyenne", "collectif", "testWithMediumPriority"),
                                Arguments.of(1, "faible", "individuel", "testWithLowPriority"));
        }

        @ParameterizedTest
        @MethodSource("provideBesoinFieldVariants")
        void testDetecterBesoins_WithVariousFields(String fieldKey, String fieldValue, boolean expectEmpty, String description) {
                RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                        RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
                RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
                RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
                RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);

                Map<String, Object> besoin = new HashMap<>();
                if (fieldKey != null) {
                        besoin.put(fieldKey, fieldValue);
                } else {
                        besoin.put("otherField", "value");
                }
                RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS, besoin);

                Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
                assertNotNull(result);
                List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
                if (expectEmpty) {
                        assertTrue(besoins.isEmpty(), description);
                } else {
                        assertFalse(besoins.isEmpty(), description);
                }
        }

        private static Stream<Arguments> provideBesoinFieldVariants() {
                return Stream.of(
                                Arguments.of("titre", "Formation Java", false, "Les besoins doivent être détectés avec titre"),
                                Arguments.of("competenceNom", "Java", false, "Les besoins doivent être détectés avec competenceNom"),
                                Arguments.of(null, null, true, "Les besoins sans compétence ni titre sont ignorés"));
        }


        @Test
        void testDetecterBesoins_WithServiceFailure() {
                RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                        RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
                RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
                RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
                RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
                RestTemplateMockHelper.mockEndpointFailure(restTemplate, BESOINS, new RuntimeException("Service down"));

                Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
                assertNotNull(result);
                List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
                assertFalse(besoins.isEmpty(), "Les besoins doivent être détectés via le fallback des gaps");
                assertEquals("individuel", besoins.get(0).get("type"), "Le type doit être individuel pour le fallback");
        }

        @Test
        void testDetecterBesoins_WithMultipleBesoins() {
                RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                        RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
                RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
                RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
                RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);

                Map<String, Object> besoin1 = new HashMap<>();
                besoin1.put("competenceNom", "Java");

                Map<String, Object> besoin2 = new HashMap<>();
                besoin2.put("competenceNom", "Python");

                List<Map<String, Object>> liste = new ArrayList<>();
                for (int i = 0; i < 5; i++) liste.add(besoin1);
                liste.add(besoin2);

                RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS, liste.toArray());

                Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
                assertNotNull(result);
                List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
                assertEquals(2, besoins.size(), "Deux types de besoins doivent être détectés");
                assertEquals("haute", besoins.get(0).get("priorite"), "Java doit avoir une priorité haute");
                assertEquals("faible", besoins.get(1).get("priorite"), "Python doit avoir une priorité faible");
        }
}
