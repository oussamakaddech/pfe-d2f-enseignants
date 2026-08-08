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
class AnalysePredictiveServiceFormationsTest {

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
    void testRecommanderFormations_WithNullFormations() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        stubNullBody(FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertTrue(recommandations.isEmpty(), "Aucune recommandation ne doit être faite si les formations sont null");
    }

    @Test
    void testRecommanderFormations_WithServiceFailure() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, FORMATIONS, new RuntimeException("Service de formation indisponible"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Une recommandation de fallback doit être faite en cas d'erreur");
        assertEquals("Service formation indisponible", recommandations.get(0).get("titre"),
            "Le titre de la recommandation de fallback doit être correct");
    }

    @Test
    void testRecommanderFormations_WithAnnuleeFormation() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        Map<String, Object> formation = RestTemplateMockHelper.formation(101L, "Java Advanced", "ANNULEE");
        formation.put("chargeHoraireGlobal", 20);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS, formation);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertTrue(recommandations.isEmpty(), "Aucune recommandation ne doit être faite pour une formation annulée");
    }

    @Test
    void testRecommanderFormations_WithMultipleFormations() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);

        Map<String, Object> formation1 = RestTemplateMockHelper.formation(101L, "Java Advanced", "PLANIFIEE");
        formation1.put("chargeHoraireGlobal", 20);
        Map<String, Object> formation2 = RestTemplateMockHelper.formation(102L, "Python Basics", "PLANIFIEE");
        formation2.put("chargeHoraireGlobal", 15);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS, formation1, formation2);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES,
                RestTemplateMockHelper.formationCompetence(1L, "Java"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertEquals(2, recommandations.size(), "Deux recommandations doivent être faites");
        assertEquals(1, recommandations.get(0).get("ordre"), "La première recommandation doit avoir l'ordre 1");
        assertEquals(2, recommandations.get(1).get("ordre"), "La deuxième recommandation doit avoir l'ordre 2");
    }

    @Test
    void testRecommanderFormations_WithCompetenceCible() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        Map<String, Object> formation = RestTemplateMockHelper.formation(101L, "Java Advanced", "PLANIFIEE");
        formation.put("chargeHoraireGlobal", 20);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS, formation);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES,
                RestTemplateMockHelper.formationCompetence(1L, "Java"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", 1L);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Les recommandations doivent être détectées");
        assertEquals(0.90, recommandations.get(0).get("probabiliteReussite"),
            "La probabilité de réussite doit être 0.90 pour une formation ciblant la compétence cible");
    }

    @Test
    void testRecommanderFormations_WithNullChargeHoraire() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        Map<String, Object> formation = RestTemplateMockHelper.formation(101L, "Java Advanced", "PLANIFIEE");
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS, formation);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES,
                RestTemplateMockHelper.formationCompetence(1L, "Java"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Les recommandations doivent être détectées");
        assertEquals("0h", recommandations.get(0).get("dureeEstimee"),
            "La durée estimée doit être '0h' si chargeHoraireGlobal est null");
    }

    @Test
    void testRecommanderFormations_WithNullTitre() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        Map<String, Object> formation = new HashMap<>();
        formation.put("formationId", 101L);
        formation.put("etatFormation", "PLANIFIEE");
        formation.put("chargeHoraireGlobal", 20);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS, formation);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES,
                RestTemplateMockHelper.formationCompetence(1L, "Java"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Les recommandations doivent être détectées");
        assertEquals("Sans titre", recommandations.get(0).get("titre"),
            "Le titre doit être 'Sans titre' si titreFormation est null");
    }
}
