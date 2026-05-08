package esprit.pfe.serviceanalyse.Services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.Map;

import static org.junit.jupiter.api.Assertions.*;

@ExtendWith(MockitoExtension.class)
class AnalysePredictiveServiceExtendedTest {

    @InjectMocks
    private AnalysePredictiveService service;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(service, "evaluationServiceUrl", "http://localhost:8083");
        ReflectionTestUtils.setField(service, "formationServiceUrl", "http://localhost:8084");
        ReflectionTestUtils.setField(service, "competenceServiceUrl", "http://localhost:8085");
        ReflectionTestUtils.setField(service, "besoinFormationServiceUrl", "http://localhost:8082");
    }

    @Test
    void analyserTendancesGlobales_shouldReturnStructuredResult() {
        Map<String, Object> result = service.analyserTendancesGlobales();

        assertNotNull(result);
        assertTrue(result.containsKey("statistiques"));
        assertTrue(result.containsKey("dashboard"));

        @SuppressWarnings("unchecked")
        Map<String, Object> stats = (Map<String, Object>) result.get("statistiques");
        assertNotNull(stats);
        // With services unavailable, fallback values apply
        assertEquals(0, stats.get("totalEvaluations"));
        assertEquals(0.0, stats.get("noteMoyenne"));
    }

    @Test
    void analyserTendancesGlobales_dashboardShouldContainDefaults() {
        Map<String, Object> result = service.analyserTendancesGlobales();

        @SuppressWarnings("unchecked")
        Map<String, Object> dashboard = (Map<String, Object>) result.get("dashboard");
        assertNotNull(dashboard);
        assertTrue(dashboard.containsKey("competencesEnDeclin"));
        assertTrue(dashboard.containsKey("competencesEnForteDemande"));
        assertTrue(dashboard.containsKey("enseignantsARisque"));
        assertTrue(dashboard.containsKey("tauxCouverture"));
    }

    @Test
    void analyserEnseignant_dashboardShouldContainScoreGlobal() {
        Map<String, Object> result = service.analyserEnseignant("ens-test", null);

        @SuppressWarnings("unchecked")
        Map<String, Object> dashboard = (Map<String, Object>) result.get("dashboard");
        assertNotNull(dashboard);
        assertTrue(dashboard.containsKey("scoreGlobal"));
        assertTrue(dashboard.containsKey("statut"));
        assertTrue(dashboard.containsKey("nombreGaps"));
    }

    @Test
    void analyserEnseignant_withCibleCompetence_shouldFilterRecommandations() {
        Map<String, Object> result = service.analyserEnseignant("ens-test", 42L);

        assertNotNull(result);
        assertEquals("Analyse ciblée compétence 42", result.get("competenceAnalysee"));
    }
}
