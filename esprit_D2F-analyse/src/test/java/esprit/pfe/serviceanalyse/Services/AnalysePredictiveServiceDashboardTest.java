package esprit.pfe.serviceanalyse.services;

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

    @Test
    void testGenererDashboardEnseignant_WithEmptyGaps() {
        // Test with empty gaps (scoreGlobal = 5.0, statut = "suivi")
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 4); // No gap

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

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
        // Test with high gravite gaps (statut = "a_risque")
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 1); // High gap

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        Map<String, Object> dashboard = (Map<String, Object>) result.get("dashboard");
        assertNotNull(dashboard, "Le dashboard ne doit pas être null");
        assertEquals("a_risque", dashboard.get("statut"), "Le statut doit être 'a_risque' avec des gaps élevés");
    }

    @Test
    void testAnalyserTendancesGlobales_WithNullEvals() {
        // Test with null evaluations
        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), eq(List.class)))
            .thenReturn(null);

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
    void testAnalyserTendancesGlobales_WithServiceFailure() {
        // Test with service failure
        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), eq(List.class)))
            .thenThrow(new RuntimeException("Service down"));

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
        // Test with valid evaluations
        Map<String, Object> eval1 = new HashMap<>();
        eval1.put("note", 3.5);
        eval1.put("evaluateurId", "ens1");

        Map<String, Object> eval2 = new HashMap<>();
        eval2.put("note", 2.5);
        eval2.put("evaluateurId", "ens2");

        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), eq(List.class)))
            .thenReturn(List.of(eval1, eval2));

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
        // Test with null evaluations
        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), eq(List.class)))
            .thenReturn(null);

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
    void testGenererDashboard_WithServiceFailure() {
        // Test with service failure
        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), eq(List.class)))
            .thenThrow(new RuntimeException("Service down"));

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
        // Test with enseignants à risque
        Map<String, Object> eval1 = new HashMap<>();
        eval1.put("note", 1.5);
        eval1.put("evaluateurId", "ens1");

        Map<String, Object> eval2 = new HashMap<>();
        eval2.put("note", 2.5);
        eval2.put("evaluateurId", "ens2");

        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), eq(List.class)))
            .thenReturn(List.of(eval1, eval2));

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
        // Test with null notes
        Map<String, Object> eval1 = new HashMap<>();
        eval1.put("note", null);
        eval1.put("evaluateurId", "ens1");

        Map<String, Object> eval2 = new HashMap<>();
        eval2.put("note", null);
        eval2.put("evaluateurId", "ens2");

        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), eq(List.class)))
            .thenReturn(List.of(eval1, eval2));

        Map<String, Object> result = analysePredictiveService.analyserTendancesGlobales();
        assertNotNull(result, "Le résultat ne doit pas être null");
        Map<String, Object> dashboard = (Map<String, Object>) result.get("dashboard");
        assertNotNull(dashboard, "Le dashboard ne doit pas être null");
        List<String> aRisque = (List<String>) dashboard.get("enseignantsARisque");
        assertTrue(aRisque.isEmpty(), "Aucun enseignant ne doit être à risque avec des notes null");
    }
}
