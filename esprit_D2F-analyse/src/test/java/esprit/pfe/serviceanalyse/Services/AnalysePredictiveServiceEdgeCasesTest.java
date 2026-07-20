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
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AnalysePredictiveServiceEdgeCasesTest {

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

    private void envAutour() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);
    }

    private void eval(String nom, Double note) {
        Map<String, Object> e = new HashMap<>();
        e.put("noteGlobale", note);
        e.put("enseignantId", nom);
        RestTemplateMockHelper.mockEndpoint(restTemplate, EVALUATIONS, e);
    }

    @Test
    void testIdentifierGapsViaEvaluations_WithNullNotes() {
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, COMPETENCES_ENSEIGNANT, new RuntimeException("Comp service down"));
        eval("ens1", null);
        envAutour();

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertTrue(gaps.isEmpty(), "Aucun gap ne doit être détecté si toutes les notes sont null");
    }

    @Test
    void testIdentifierGapsViaEvaluations_WithMixedNotes() {
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, COMPETENCES_ENSEIGNANT, new RuntimeException("Comp service down"));
        Map<String, Object> e1 = new HashMap<>(); e1.put("noteGlobale", 2.5); e1.put("enseignantId", "ens1");
        Map<String, Object> e2 = new HashMap<>(); e2.put("noteGlobale", null); e2.put("enseignantId", "ens2");
        Map<String, Object> e3 = new HashMap<>(); e3.put("noteGlobale", 3.5); e3.put("enseignantId", "ens3");
        RestTemplateMockHelper.mockEndpoint(restTemplate, EVALUATIONS, e1, e2, e3);
        envAutour();

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertTrue(gaps.isEmpty(), "Aucun gap ne doit être détecté lorsque la moyenne atteint la cible");
    }

    @Test
    void testIdentifierGapsViaEvaluations_WithHighGap() {
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, COMPETENCES_ENSEIGNANT, new RuntimeException("Comp service down"));
        eval("ens1", 1.0);
        envAutour();

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Les gaps doivent être détectés");
        assertEquals("elevee", gaps.get(0).get("gravite"), "La gravité doit être élevée pour un gap >= 2");
    }

    @Test
    void testIdentifierGapsViaEvaluations_WithMediumGap() {
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, COMPETENCES_ENSEIGNANT, new RuntimeException("Comp service down"));
        eval("ens1", 2.5);
        envAutour();

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Les gaps doivent être détectés");
        assertEquals("moyenne", gaps.get(0).get("gravite"), "La gravité doit être moyenne pour un gap < 2");
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
        assertEquals(0.50, recommandations.get(0).get("probabiliteReussite"), "La probabilité de réussite doit être 0.50 pour une formation sans ID");
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
        assertEquals(0.50, recommandations.get(0).get("probabiliteReussite"), "La probabilité de réussite doit être 0.50 pour une formation sans liens de compétence");
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
        assertEquals(0.50, recommandations.get(0).get("probabiliteReussite"), "La probabilité de réussite doit être 0.50 pour une formation sans ID de compétence");
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
        assertEquals(0.90, recommandations.get(0).get("probabiliteReussite"), "La probabilité de réussite doit être 0.90 pour une formation ciblant un gap");
        assertTrue(((List<?>) recommandations.get(0).get("competencesCiblees")).isEmpty(), "La liste des compétences ciblées doit être vide");
    }

    @Test
    void testDetecterBesoins_WithEmptyGaps() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "AVANCE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, BESOINS, new RuntimeException("Service down"));

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertTrue(besoins.isEmpty(), "Aucun besoin ne doit être détecté s'il n'y a pas de gaps");
    }

    @Test
    void testDetecterBesoins_WithMultipleGaps() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "DEBUTANT"),
                RestTemplateMockHelper.affectation(2L, "Python", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, BESOINS, new RuntimeException("Service down"));

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertEquals(2, besoins.size(), "Deux besoins doivent être détectés pour deux gaps");
        assertEquals("elevee", besoins.get(0).get("priorite"), "Le premier besoin doit avoir une priorité élevée");
        assertEquals("moyenne", besoins.get(1).get("priorite"), "Le deuxième besoin doit avoir une priorité moyenne");
    }
}
