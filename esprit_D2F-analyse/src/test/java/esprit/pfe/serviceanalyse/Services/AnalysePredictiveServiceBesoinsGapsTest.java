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
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AnalysePredictiveServiceBesoinsGapsTest {

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

    private void stubNullBody(String fragment) {
        when(restTemplate.exchange(contains(fragment), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(null));
    }

    @Test
    void testCheckFormationCibleGaps_WithNullFormationId() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        Map<String, Object> formation = RestTemplateMockHelper.formation(0L, "Java Advanced", "PLANIFIEE");
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS, formation);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Les recommandations doivent être détectées");
        assertEquals(0.50, recommandations.get(0).get("probabiliteReussite"),
            "La probabilité de réussite doit être 0.50 pour une formation sans ID");
    }

    @Test
    void testCheckFormationCibleGaps_WithNullFcLinks() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        Map<String, Object> formation = RestTemplateMockHelper.formation(101L, "Java Advanced", "PLANIFIEE");
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS, formation);
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, FORMATION_COMPETENCES, new RuntimeException("Service down"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Les recommandations doivent être détectées");
        assertEquals(0.50, recommandations.get(0).get("probabiliteReussite"),
            "La probabilité de réussite doit être 0.50 pour une formation sans liens de compétence");
    }

    @Test
    void testCheckFormationCibleGaps_WithNullCompId() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        Map<String, Object> formation = RestTemplateMockHelper.formation(101L, "Java Advanced", "PLANIFIEE");
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS, formation);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES,
                new HashMap<String, Object>() {{ put("competenceNom", "Java"); }});
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Les recommandations doivent être détectées");
        assertEquals(0.50, recommandations.get(0).get("probabiliteReussite"),
            "La probabilité de réussite doit être 0.50 pour une formation sans ID de compétence");
    }

    @Test
    void testCheckFormationCibleGaps_WithNullCompNom() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        Map<String, Object> formation = RestTemplateMockHelper.formation(101L, "Java Advanced", "PLANIFIEE");
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS, formation);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES,
                RestTemplateMockHelper.formationCompetence(1L, null));
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Les recommandations doivent être détectées");
        assertEquals(0.90, recommandations.get(0).get("probabiliteReussite"),
            "La probabilité de réussite doit être 0.90 pour une formation ciblant un gap");
        assertTrue(((List<?>) recommandations.get(0).get("competencesCiblees")).isEmpty(),
            "La liste des compétences ciblées doit être vide");
    }

    @Test
    void testCheckFormationCibleGaps_WithServiceFailure() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        Map<String, Object> formation = RestTemplateMockHelper.formation(101L, "Java Advanced", "PLANIFIEE");
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS, formation);
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, FORMATION_COMPETENCES, new RuntimeException("Service down"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Les recommandations doivent être détectées");
        assertEquals(0.50, recommandations.get(0).get("probabiliteReussite"),
            "La probabilité de réussite doit être 0.50 en cas d'échec du service");
    }

    @Test
    void testDetecterBesoins_WithNullBesoinsApprouves() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        stubNullBody(BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertTrue(besoins.isEmpty(), "Aucun besoin ne doit être détecté si les besoins approuvés sont null");
    }

    @Test
    void testDetecterBesoins_WithServiceFailure() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, BESOINS, new RuntimeException("Service down"));

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertFalse(besoins.isEmpty(), "Les besoins doivent être détectés via le fallback des gaps");
        assertEquals("individuel", besoins.get(0).get("type"), "Le type doit être individuel pour le fallback");
    }

    @Test
    void testDetecterBesoins_WithEmptyBesoinsApprouves() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertTrue(besoins.isEmpty(), "Aucun besoin ne doit être détecté si les besoins approuvés sont vides");
    }

    @Test
    void testDetecterBesoins_WithOnlyTitre() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);

        Map<String, Object> besoin = new HashMap<>();
        besoin.put("titre", "Formation Java");
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS, besoin);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertFalse(besoins.isEmpty(), "Les besoins doivent être détectés même sans compétence");
        assertEquals("Formation Java", besoins.get(0).get("competenceCode"),
            "Le code de compétence doit être le titre");
    }

    @Test
    void testDetecterBesoins_WithOnlyCompetence() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);

        Map<String, Object> besoin = new HashMap<>();
        besoin.put("competenceNom", "Java");
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS, besoin);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertFalse(besoins.isEmpty(), "Les besoins doivent être détectés même sans titre");
        assertEquals("Java", besoins.get(0).get("competenceCode"),
            "Le code de compétence doit être le nom de la compétence");
    }

    @Test
    void testDetecterBesoins_WithNeitherCompetenceNorTitre() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);

        Map<String, Object> besoin = new HashMap<>();
        besoin.put("otherField", "value");
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS, besoin);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertTrue(besoins.isEmpty(), "Les besoins approuvés sans compétence ni titre doivent être ignorés");
    }
}
