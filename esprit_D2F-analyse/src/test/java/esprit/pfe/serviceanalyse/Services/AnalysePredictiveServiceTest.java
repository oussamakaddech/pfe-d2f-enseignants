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
class AnalysePredictiveServiceTest {

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
    void testAnalyserEnseignant_FullSuccess() {
        // Mock competence data
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1L);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);
        
        Map<String, Object> formation = new HashMap<>();
        formation.put("idFormation", 100);
        formation.put("titreFormation", "Java Advanced");

        Map<String, Object> fc = new HashMap<>();
        fc.put("competenceId", 1L);
        fc.put("competenceNom", "Java");

        when(restTemplate.getForObject(anyString(), eq(List.class)))
            .thenReturn(List.of(aff)) // identifierGaps
            .thenReturn(List.of(formation)) // formations
            .thenReturn(List.of(fc)) // checkFormationCibleGaps
            .thenReturn(Collections.emptyList()) // detectBesoins
            .thenReturn(Collections.emptyList()); // genererDashboardEnseignant (identifierGaps again)

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", 1L);

        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertEquals(2.0, gaps.get(0).get("gap"));
    }

    @Test
    void testAnalyserTendancesGlobales_FullSuccess() {
        Map<String, Object> eval = new HashMap<>();
        eval.put("note", 4.5);
        eval.put("evaluateurId", "admin");
        when(restTemplate.getForObject(anyString(), eq(List.class))).thenReturn(List.of(eval));

        Map<String, Object> result = analysePredictiveService.analyserTendancesGlobales();

        assertNotNull(result);
        Map<String, Object> stats = (Map<String, Object>) result.get("statistiques");
        assertEquals(1, stats.get("totalEvaluations"));
        assertEquals(4.5, stats.get("noteMoyenne"));
    }

    @Test
    void testAnalyserEnseignant_ServiceFailureFallbacks() {
        // Simulate failures for all services
        when(restTemplate.getForObject(anyString(), eq(List.class))).thenThrow(new RuntimeException("Service down"));

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);

        assertNotNull(result);
        // Should have empty gaps if all fallbacks fail
        assertTrue(((List)result.get("gaps")).isEmpty());
    }

    @Test
    void testAnalyserEnseignant_WithCompetenceCible() {
        // Mock competence data
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1L);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        Map<String, Object> formation = new HashMap<>();
        formation.put("idFormation", 100);
        formation.put("titreFormation", "Java Advanced");
        formation.put("etatFormation", "PLANIFIEE");

        Map<String, Object> fc = new HashMap<>();
        fc.put("competenceId", 1L);
        fc.put("competenceNom", "Java");

        when(restTemplate.getForObject(anyString(), eq(List.class)))
            .thenReturn(List.of(aff)) // identifierGaps
            .thenReturn(List.of(formation)) // formations
            .thenReturn(List.of(fc)) // checkFormationCibleGaps
            .thenReturn(Collections.emptyList()) // detectBesoins
            .thenReturn(Collections.emptyList()); // genererDashboardEnseignant (identifierGaps again)

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", 1L);

        assertNotNull(result);
        assertEquals("Analyse ciblée compétence 1", result.get("competenceAnalysee"));
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertEquals(2.0, gaps.get(0).get("gap"));
    }

    @Test
    void testAnalyserEnseignant_WithEmptyCompetenceData() {
        // Mock empty competence data
        when(restTemplate.getForObject(anyString(), eq(List.class)))
            .thenReturn(Collections.emptyList()) // identifierGaps
            .thenReturn(Collections.emptyList()) // formations
            .thenReturn(Collections.emptyList()) // checkFormationCibleGaps
            .thenReturn(Collections.emptyList()) // detectBesoins
            .thenReturn(Collections.emptyList()); // genererDashboardEnseignant (identifierGaps again)

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);

        assertNotNull(result);
        assertTrue(((List)result.get("gaps")).isEmpty());
        assertEquals("Analyse globale du profil", result.get("competenceAnalysee"));
    }

    @Test
    void testAnalyserEnseignant_WithHighGap() {
        // Mock competence data with high gap
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1L);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 1); // DEBUTANT - high gap

        when(restTemplate.getForObject(anyString(), eq(List.class)))
            .thenReturn(List.of(aff)) // identifierGaps
            .thenReturn(Collections.emptyList()) // formations
            .thenReturn(Collections.emptyList()) // checkFormationCibleGaps
            .thenReturn(Collections.emptyList()) // detectBesoins
            .thenReturn(Collections.emptyList()); // genererDashboardEnseignant (identifierGaps again)

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);

        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertEquals(3.0, gaps.get(0).get("gap"));
        assertEquals("elevee", gaps.get(0).get("gravite"));
    }

    @Test
    void testAnalyserEnseignant_WithExpertLevel() {
        // Mock competence data with expert level (no gap)
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1L);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 5); // EXPERT - no gap

        when(restTemplate.getForObject(anyString(), eq(List.class)))
            .thenReturn(List.of(aff)) // identifierGaps
            .thenReturn(Collections.emptyList()) // formations
            .thenReturn(Collections.emptyList()) // checkFormationCibleGaps
            .thenReturn(Collections.emptyList()) // detectBesoins
            .thenReturn(Collections.emptyList()); // genererDashboardEnseignant (identifierGaps again)

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);

        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertTrue(gaps.isEmpty());
    }

    @Test
    void testAnalyserEnseignant_WithFormationServiceFailure() {
        // Mock competence data
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1L);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        // Formation service failure
        when(restTemplate.getForObject(anyString(), eq(List.class)))
            .thenReturn(List.of(aff)) // identifierGaps for gaps
            .thenReturn(List.of(aff)) // identifierGaps for recommendations
            .thenThrow(new RuntimeException("Formation service down")) // formations
            .thenReturn(Collections.emptyList()) // detectBesoins
            .thenReturn(Collections.emptyList()); // genererDashboardEnseignant (identifierGaps again)

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);

        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        // Le service de formation est indisponible, donc on s'attend à une recommandation de fallback
        assertFalse(recommandations.isEmpty(), "Devrait avoir au moins une recommandation de fallback");
        assertEquals("Service formation indisponible", recommandations.get(0).get("titre"));
    }

    @Test
    void testAnalyserEnseignant_WithBesoinFormationServiceFailure() {
        // Mock competence data
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1L);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        // Besoin formation service failure
        when(restTemplate.getForObject(anyString(), eq(List.class)))
            .thenReturn(List.of(aff)) // identifierGaps
            .thenReturn(Collections.emptyList()) // formations
            .thenReturn(Collections.emptyList()) // checkFormationCibleGaps
            .thenThrow(new RuntimeException("Besoin formation service down")) // detectBesoins
            .thenReturn(Collections.emptyList()); // genererDashboardEnseignant (identifierGaps again)

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);

        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        // Le service de besoin-formation est indisponible, donc on s'attend à ce que les besoins soient vides
        assertTrue(besoins.isEmpty(), "Les besoins devraient être vides en cas d'échec du service");
    }

    @Test
    void testAnalyserEnseignant_WithMultipleGaps() {
        // Mock multiple competence gaps
        Map<String, Object> comp1 = new HashMap<>();
        comp1.put("id", 1L);
        comp1.put("nom", "Java");
        Map<String, Object> aff1 = new HashMap<>();
        aff1.put("competence", comp1);
        aff1.put("niveauMaitrise", 1); // DEBUTANT - high gap

        Map<String, Object> comp2 = new HashMap<>();
        comp2.put("id", 2L);
        comp2.put("nom", "Python");
        Map<String, Object> aff2 = new HashMap<>();
        aff2.put("competence", comp2);
        aff2.put("niveauMaitrise", 3); // CONFIRME - low gap

        when(restTemplate.getForObject(anyString(), eq(List.class)))
            .thenReturn(List.of(aff1, aff2)) // identifierGaps
            .thenReturn(Collections.emptyList()) // formations
            .thenReturn(Collections.emptyList()) // checkFormationCibleGaps
            .thenReturn(Collections.emptyList()) // detectBesoins
            .thenReturn(Collections.emptyList()); // genererDashboardEnseignant (identifierGaps again)

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);

        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertEquals(2, gaps.size());
        // Gaps should be sorted by gravite (high first)
        assertEquals("elevee", gaps.get(0).get("gravite"));
        assertEquals("faible", gaps.get(1).get("gravite"));
    }

    @Test
    void testAnalyserTendancesGlobales_WithServiceFailure() {
        // Simulate service failure
        when(restTemplate.getForObject(anyString(), eq(List.class)))
            .thenThrow(new RuntimeException("Service down"));

        Map<String, Object> result = analysePredictiveService.analyserTendancesGlobales();

        assertNotNull(result);
        Map<String, Object> stats = (Map<String, Object>) result.get("statistiques");
        assertEquals(0, stats.get("totalEvaluations"));
        assertEquals(0.0, stats.get("noteMoyenne"));
    }

    @Test
    void testAnalyserTendancesGlobales_WithLowScorers() {
        // Mock evaluation data with low scorers
        Map<String, Object> eval1 = new HashMap<>();
        eval1.put("note", 1.5);
        eval1.put("evaluateurId", "ens1");

        Map<String, Object> eval2 = new HashMap<>();
        eval2.put("note", 4.5);
        eval2.put("evaluateurId", "ens2");

        when(restTemplate.getForObject(anyString(), eq(List.class)))
            .thenReturn(List.of(eval1, eval2)) // analyserTendancesGlobales
            .thenReturn(List.of(eval1, eval2)); // genererDashboard

        Map<String, Object> result = analysePredictiveService.analyserTendancesGlobales();

        assertNotNull(result);
        Map<String, Object> stats = (Map<String, Object>) result.get("statistiques");
        assertEquals(2, stats.get("totalEvaluations"));
        assertEquals(3.0, stats.get("noteMoyenne"));

        Map<String, Object> dashboard = (Map<String, Object>) result.get("dashboard");
        List<String> atRisk = (List<String>) dashboard.get("enseignantsARisque");
        assertEquals(1, atRisk.size());
        assertTrue(atRisk.contains("ens1"));
    }
}
