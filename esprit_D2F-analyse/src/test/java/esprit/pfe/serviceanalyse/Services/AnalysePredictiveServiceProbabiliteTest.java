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
class AnalysePredictiveServiceProbabiliteTest {

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
        @MethodSource("provideProbabiliteScenarios")
        void testCalculateProbabilite(String etat, boolean expectHighProb, String description) {
                // Arrange: create a competence with a gap
                Map<String, Object> comp = new HashMap<>();
                comp.put("id", 1);
                comp.put("nom", "Java");
                Map<String, Object> aff = new HashMap<>();
                aff.put("competence", comp);
                aff.put("niveauMaitrise", 2);

                // Formation with the given state
                Map<String, Object> formation = new HashMap<>();
                formation.put("formationId", 100L);
                formation.put("titreFormation", "Formation Test");
                formation.put("etatFormation", etat);
                formation.put("chargeHoraireGlobal", 20);

                // Formation-competence link targeting the gap
                Map<String, Object> fcLink = new HashMap<>();
                fcLink.put("competenceId", 1L);
                fcLink.put("competenceNom", "Java");

                when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
                                .thenReturn(List.of(aff));
                when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
                                .thenReturn(List.of(formation));
                when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
                                .thenReturn(List.of(fcLink));
                when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
                                .thenReturn(Collections.emptyList());

                Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
                assertNotNull(result, description);

                @SuppressWarnings("unchecked")
                List<Map<String, Object>> recos = (List<Map<String, Object>>) result.get("recommandationsFormations");
                assertNotNull(recos, "Recommandations should not be null");
                assertFalse(recos.isEmpty(), "There should be at least one recommendation");

                double prob = ((Number) recos.get(0).get("probabiliteReussite")).doubleValue();
                if (expectHighProb) {
                        assertEquals(0.90, prob, 0.01, "Gap-targeted formation should have 0.90 probability");
                } else {
                        assertTrue(prob < 0.90, "Non-targeted formation should have probability < 0.90");
                }
        }

        private static Stream<Arguments> provideProbabiliteScenarios() {
                return Stream.of(
                                Arguments.of("PLANIFIEE", true, "Formation targeting a gap should have high probability"),
                                Arguments.of("EN_COURS", true, "EN_COURS formation targeting gap should also have high probability"));
        }

        @Test
        void testProbabiliteWithNoGapMatch() {
                // Formation that does NOT target any competence gap
                Map<String, Object> comp = new HashMap<>();
                comp.put("id", 1);
                comp.put("nom", "Java");
                Map<String, Object> aff = new HashMap<>();
                aff.put("competence", comp);
                aff.put("niveauMaitrise", 2);

                Map<String, Object> formation = new HashMap<>();
                formation.put("formationId", 200L);
                formation.put("titreFormation", "Formation Python");
                formation.put("etatFormation", "EN_COURS");
                formation.put("chargeHoraireGlobal", 30);

                // fc link with a different competence (no match)
                Map<String, Object> fcLink = new HashMap<>();
                fcLink.put("competenceId", 999L);
                fcLink.put("competenceNom", "Python");

                when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
                                .thenReturn(List.of(aff));
                when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
                                .thenReturn(List.of(formation));
                when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
                                .thenReturn(List.of(fcLink));
                when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
                                .thenReturn(Collections.emptyList());

                Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
                assertNotNull(result);

                @SuppressWarnings("unchecked")
                List<Map<String, Object>> recos = (List<Map<String, Object>>) result.get("recommandationsFormations");
                assertFalse(recos.isEmpty());

                double prob = ((Number) recos.get(0).get("probabiliteReussite")).doubleValue();
                assertEquals(0.70, prob, 0.01, "EN_COURS formation not targeting gap should have 0.70 probability");
        }

        @Test
        void testProbabiliteWithCancelledFormation() {
                // Cancelled formations should be skipped entirely
                Map<String, Object> comp = new HashMap<>();
                comp.put("id", 1);
                comp.put("nom", "Java");
                Map<String, Object> aff = new HashMap<>();
                aff.put("competence", comp);
                aff.put("niveauMaitrise", 2);

                Map<String, Object> formation = new HashMap<>();
                formation.put("formationId", 300L);
                formation.put("titreFormation", "Formation Annulée");
                formation.put("etatFormation", "ANNULEE");
                formation.put("chargeHoraireGlobal", 10);

                when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
                                .thenReturn(List.of(aff));
                when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
                                .thenReturn(List.of(formation));
                when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
                                .thenReturn(Collections.emptyList());

                Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
                assertNotNull(result);

                @SuppressWarnings("unchecked")
                List<Map<String, Object>> recos = (List<Map<String, Object>>) result.get("recommandationsFormations");
                assertTrue(recos.isEmpty(), "Cancelled formations should not appear in recommendations");
        }
}