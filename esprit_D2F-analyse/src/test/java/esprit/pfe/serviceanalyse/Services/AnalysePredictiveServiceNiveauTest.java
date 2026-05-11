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
class AnalysePredictiveServiceNiveauTest {

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
    @MethodSource("provideNiveauTestCases")
    void testParseNiveau(Object niveauObj, int expectedNiveau) {
        // Test with different niveau values
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", niveauObj);

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");

        if (expectedNiveau > 0 && expectedNiveau < 4) {
            assertFalse(gaps.isEmpty(), "Les gaps doivent être détectés");
            assertEquals(expectedNiveau, gaps.get(0).get("niveauActuel"), "Le niveau actuel doit être " + expectedNiveau);
        } else {
            assertTrue(gaps.isEmpty(), "Aucun gap ne doit être détecté pour un niveau >= 4");
        }
    }

    private static Stream<Arguments> provideNiveauTestCases() {
        return Stream.of(
            Arguments.of(null, 0),                    // null
            Arguments.of(1, 1),                       // Number 1
            Arguments.of(2, 2),                       // Number 2
            Arguments.of(3, 3),                       // Number 3
            Arguments.of(4, 4),                       // Number 4
            Arguments.of("DEBUTANT", 1),              // String "DEBUTANT"
            Arguments.of("debutant", 1),              // String "debutant" (case insensitive)
            Arguments.of("1", 1),                     // String "1"
            Arguments.of("NIVEAU_1", 1),              // String "NIVEAU_1"
            Arguments.of("INITIE", 2),                // String "INITIE"
            Arguments.of("initie", 2),                 // String "initie" (case insensitive)
            Arguments.of("2", 2),                     // String "2"
            Arguments.of("NIVEAU_2", 2),              // String "NIVEAU_2"
            Arguments.of("CONFIRME", 3),               // String "CONFIRME"
            Arguments.of("confirme", 3),               // String "confirme" (case insensitive)
            Arguments.of("3", 3),                     // String "3"
            Arguments.of("NIVEAU_3", 3),               // String "NIVEAU_3"
            Arguments.of("AVANCE", 4),                 // String "AVANCE"
            Arguments.of("avance", 4),                 // String "avance" (case insensitive)
            Arguments.of("4", 4),                     // String "4"
            Arguments.of("NIVEAU_4", 4),               // String "NIVEAU_4"
            Arguments.of("EXPERT", 5),                 // String "EXPERT"
            Arguments.of("expert", 5),                 // String "expert" (case insensitive)
            Arguments.of("5", 5),                     // String "5"
            Arguments.of("NIVEAU_5", 5),               // String "NIVEAU_5"
            Arguments.of("UNKNOWN", 0),                // String "UNKNOWN"
            Arguments.of("unknown", 0),                // String "unknown" (case insensitive)
            Arguments.of("0", 0),                     // String "0"
            Arguments.of(0, 0)                       // Number 0
        );
    }

    @ParameterizedTest
    @MethodSource("providePrioriteOrderTestCases")
    void testGetPrioriteOrder(String priorite, int expectedOrder) {
        // Test with different priority values
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
        for (int i = 0; i < 5; i++) {
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
        assertEquals(priorite, besoins.get(0).get("priorite"), "La priorité doit être " + priorite);
    }

    private static Stream<Arguments> providePrioriteOrderTestCases() {
        return Stream.of(
            Arguments.of("haute", 3),    // PRIORITE_HAUTE
            Arguments.of("moyenne", 2),   // MOYENNE
            Arguments.of("faible", 1),     // GRAVITE_FAIBLE
            Arguments.of("unknown", 1),     // Unknown priority
            Arguments.of(null, 1)          // Null priority
        );
    }
}
