package esprit.pfe.serviceanalyse.services;
import static esprit.pfe.serviceanalyse.services.RestTemplateMockHelper.*;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
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
class AnalysePredictiveServicePrioriteTest {

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

        private Map<String, Object> besoin(String nom) {
                Map<String, Object> b = new HashMap<>();
                b.put("competenceNom", nom);
                b.put("titre", "Formation " + nom);
                return b;
        }

        private List<Map<String, Object>> repete(Map<String, Object> b, int n) {
                List<Map<String, Object>> l = new ArrayList<>();
                for (int i = 0; i < n; i++) l.add(b);
                return l;
        }

        @ParameterizedTest
        @CsvSource({ "5,haute", "2,moyenne", "1,faible" })
        void testGetPrioriteOrder_ByCount(int count, String prioriteAttendue) {
                RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                        RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
                RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
                RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
                RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
                RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS, repete(besoin("Java"), count).toArray());

                Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
                assertNotNull(result);
                List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
                assertFalse(besoins.isEmpty(), "Les besoins doivent être détectés");
                assertEquals(prioriteAttendue, besoins.get(0).get("priorite"),
                                "La priorité doit être " + prioriteAttendue + " pour count = " + count);
        }

        @Test
        void testGetPrioriteOrder_WithMultiplePriorities() {
                RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                        RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
                RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
                RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
                RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);

                List<Map<String, Object>> liste = new ArrayList<>();
                liste.addAll(repete(besoin("Java"), 5));
                liste.addAll(repete(besoin("Python"), 2));
                liste.add(besoin("JavaScript"));
                RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS, liste.toArray());

                Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
                assertNotNull(result);
                List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
                assertEquals(3, besoins.size(), "Trois types de besoins doivent être détectés");
                assertEquals("haute", besoins.get(0).get("priorite"),
                                "Le premier besoin doit avoir une priorité haute");
                assertEquals("moyenne", besoins.get(1).get("priorite"),
                                "Le deuxième besoin doit avoir une priorité moyenne");
                assertEquals("faible", besoins.get(2).get("priorite"),
                                "Le troisième besoin doit avoir une priorité faible");
        }
}
