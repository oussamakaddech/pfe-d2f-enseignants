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

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
class AnalysePredictiveServiceDashboardTest {

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

    private Map<String, Object> eval(Double note, String id) {
        Map<String, Object> m = new HashMap<>();
        m.put("noteGlobale", note);
        m.put("enseignantId", id);
        return m;
    }

    @Test
    void testGenererDashboardEnseignant_WithEmptyGaps() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "AVANCE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        Map<String, Object> dashboard = (Map<String, Object>) result.get("dashboard");
        assertNotNull(dashboard, "Le dashboard ne doit pas être null");
        assertEquals(0, dashboard.get("nombreGaps"), "Le nombre de gaps doit être 0");
        assertEquals(5.0, dashboard.get("scoreGlobal"), "Le score global doit être 5.0 sans gaps");
        assertEquals("suivi", dashboard.get("statut"), "Le statut doit être 'suivi' sans gaps élevés");
    }

    @Test
    void testGenererDashboardEnseignant_WithHighGraviteGaps() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "DEBUTANT"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        Map<String, Object> dashboard = (Map<String, Object>) result.get("dashboard");
        assertNotNull(dashboard, "Le dashboard ne doit pas être null");
        assertEquals("a_risque", dashboard.get("statut"), "Le statut doit être 'a_risque' avec des gaps élevés");
    }

    @Test
    void testAnalyserTendancesGlobales_WithNullEvals() {
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, EVALUATIONS, new RuntimeException("Service down"));

        Map<String, Object> result = analysePredictiveService.analyserTendancesGlobales();
        assertNotNull(result, "Le résultat ne doit pas être null");
        Map<String, Object> stats = (Map<String, Object>) result.get("statistiques");
        assertNotNull(stats, "Les statistiques ne doivent pas être null");
        assertEquals(0, stats.get("totalEvaluations"), "Le total des évaluations doit être 0");
        assertEquals(0.0, stats.get("noteMoyenne"), "La note moyenne doit être 0.0");
        Map<String, Object> dashboard = (Map<String, Object>) result.get("dashboard");
        assertNotNull(dashboard, "Le dashboard ne doit pas être null");
    }

    @Test
    void testAnalyserTendancesGlobales_WithValidEvals() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, EVALUATIONS, eval(3.5, "ens1"), eval(2.5, "ens2"));

        Map<String, Object> result = analysePredictiveService.analyserTendancesGlobales();
        assertNotNull(result, "Le résultat ne doit pas être null");
        Map<String, Object> stats = (Map<String, Object>) result.get("statistiques");
        assertNotNull(stats, "Les statistiques ne doivent pas être null");
        assertEquals(2, stats.get("totalEvaluations"), "Le total des évaluations doit être 2");
        assertEquals(3.0, stats.get("noteMoyenne"), "La note moyenne doit être 3.0");
        Map<String, Object> dashboard = (Map<String, Object>) result.get("dashboard");
        assertNotNull(dashboard, "Le dashboard ne doit pas être null");
    }

    @Test
    void testGenererDashboard_WithNullEvals() {
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, EVALUATIONS, new RuntimeException("Service down"));

        Map<String, Object> result = analysePredictiveService.analyserTendancesGlobales();
        assertNotNull(result, "Le résultat ne doit pas être null");
        Map<String, Object> dashboard = (Map<String, Object>) result.get("dashboard");
        assertNotNull(dashboard, "Le dashboard ne doit pas être null");
        assertTrue(((List<?>) dashboard.get("enseignantsARisque")).isEmpty(), "La liste des enseignants à risque doit être vide");
        assertTrue(((List<?>) dashboard.get("competencesEnDeclin")).isEmpty(), "La liste des compétences en déclin doit être vide");
        assertTrue(((List<?>) dashboard.get("competencesEnForteDemande")).isEmpty(), "La liste des compétences en forte demande doit être vide");
        assertEquals(0.0, dashboard.get("tauxCouverture"), "Le taux de couverture doit être 0.0");
    }

    @Test
    void testGenererDashboard_WithEnseignantsARisque() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, EVALUATIONS, eval(1.5, "ens1"), eval(2.5, "ens2"));

        Map<String, Object> result = analysePredictiveService.analyserTendancesGlobales();
        assertNotNull(result, "Le résultat ne doit pas être null");
        Map<String, Object> dashboard = (Map<String, Object>) result.get("dashboard");
        assertNotNull(dashboard, "Le dashboard ne doit pas être null");
        List<String> aRisque = (List<String>) dashboard.get("enseignantsARisque");
        assertEquals(1, aRisque.size(), "Un enseignant doit être à risque");
        assertEquals("ens1", aRisque.get(0), "L'enseignant ens1 doit être à risque");
    }

    @Test
    void testGenererDashboard_WithNullNotes() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, EVALUATIONS, eval(null, "ens1"), eval(null, "ens2"));

        Map<String, Object> result = analysePredictiveService.analyserTendancesGlobales();
        assertNotNull(result, "Le résultat ne doit pas être null");
        Map<String, Object> dashboard = (Map<String, Object>) result.get("dashboard");
        assertNotNull(dashboard, "Le dashboard ne doit pas être null");
        List<String> aRisque = (List<String>) dashboard.get("enseignantsARisque");
        assertTrue(aRisque.isEmpty(), "Aucun enseignant ne doit être à risque avec des notes null");
    }
}
