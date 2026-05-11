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
    @MethodSource("provideProbabiliteTestCases")
    void testCalculateProbabilite(String etat, boolean cibleUnGap, double expectedProbabilite) {
        // Test with different etat and cibleUnGap values
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        Map<String, Object> formation = new HashMap<>();
        formation.put("idFormation", 101);
        formation.put("titreFormation", "Java Advanced");
        formation.put("etatFormation", etat);
        formation.put("chargeHoraireGlobal", 20);

        List<Map<String, Object>> fcList = new ArrayList<>();
        if (cibleUnGap) {
            Map<String, Object> fc = new HashMap<>();
            fc.put("competenceId", 1L);
            fc.put("competenceNom", "Java");
            fcList.add(fc);
        }

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), List.class))
            .thenReturn(List.of(formation));
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
            .thenReturn(fcList);
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Les recommandations doivent être détectées");
        assertEquals(expectedProbabilite, recommandations.get(0).get("probabiliteReussite"), 
            "La probabilité de réussite doit être " + expectedProbabilite);
    }

    private static Stream<Arguments> provideProbabiliteTestCases() {
        return Stream.of(
            Arguments.of("PLANIFIEE", true, 0.90),   // cibleUnGap = true
            Arguments.of("EN_COURS", false, 0.70),   // etat = "EN_COURS"
            Arguments.of("PLANIFIEE", false, 0.50),  // other etat
            Arguments.of(null, false, 0.50),        // null etat
            Arguments.of("", false, 0.50)           // empty etat
        );
    }
}
