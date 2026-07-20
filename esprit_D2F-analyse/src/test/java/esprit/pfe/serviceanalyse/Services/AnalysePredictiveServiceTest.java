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
import org.springframework.data.domain.PageRequest;
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
        ReflectionTestUtils.setField(analysePredictiveService, "authServiceUrl", "http://auth");
    }

    @Test
    void testAnalyserEnseignant_FullSuccess() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "Informatique", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS,
                RestTemplateMockHelper.formation(100L, "Java Advanced", "PLANIFIEE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES,
                RestTemplateMockHelper.formationCompetence(1L, "Java"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", 1L);

        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertEquals(2.0, gaps.get(0).get("gap"));
    }

    @Test
    void testAnalyserTendancesGlobales_FullSuccess() {
        Map<String, Object> eval = new HashMap<>();
        eval.put("noteGlobale", 4.5);
        eval.put("enseignantId", "admin");
        RestTemplateMockHelper.mockEndpoint(restTemplate, EVALUATIONS, eval);

        Map<String, Object> result = analysePredictiveService.analyserTendancesGlobales();

        assertNotNull(result);
        Map<String, Object> stats = (Map<String, Object>) result.get("statistiques");
        assertEquals(1, stats.get("totalEvaluations"));
        assertEquals(4.5, stats.get("noteMoyenne"));
    }

    @Test
    void testListerEnseignants_WithNumericTotalElements() {
        Map<String, Object> response = new HashMap<>();
        response.put("content", List.of(Map.of("id", "ens1", "nom", "Dupont")));
        response.put("totalElements", 42);

        when(restTemplate.exchange(
                contains(COMPTES), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(response));

        var page = analysePredictiveService.listerEnseignants(PageRequest.of(0, 10));

        assertEquals(1, page.getContent().size());
        assertEquals(42L, page.getTotalElements());
    }

    @Test
    void testListerEnseignants_WithNonNumericTotalElementsUsesFallback() {
        Map<String, Object> response = new HashMap<>();
        response.put("content", List.of(Map.of("id", "ens1", "nom", "Dupont")));
        response.put("totalElements", "unknown");

        when(restTemplate.exchange(
                contains(COMPTES), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(response));

        var page = analysePredictiveService.listerEnseignants(PageRequest.of(0, 10));

        assertEquals(1, page.getContent().size());
        assertEquals(1L, page.getTotalElements());
    }

    @Test
    void testAnalyserEnseignant_ServiceFailureFallbacks() {
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, COMPETENCES_ENSEIGNANT, new RuntimeException("Service down"));
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, EVALUATIONS, new RuntimeException("Service down"));
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, COMPETENCES_DOMAINE, new RuntimeException("Service down"));
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, FORMATIONS, new RuntimeException("Service down"));
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, FORMATION_COMPETENCES, new RuntimeException("Service down"));
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, BESOINS, new RuntimeException("Service down"));

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);

        assertNotNull(result);
        assertTrue(((List) result.get("gaps")).isEmpty());
    }

    @Test
    void testAnalyserEnseignant_WithCompetenceCible() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "Informatique", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS,
                RestTemplateMockHelper.formation(100L, "Java Advanced", "PLANIFIEE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES,
                RestTemplateMockHelper.formationCompetence(1L, "Java"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", 1L);

        assertNotNull(result);
        assertEquals("Analyse ciblée compétence 1", result.get("competenceAnalysee"));
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertEquals(2.0, gaps.get(0).get("gap"));
    }

    @Test
    void testAnalyserEnseignant_WithEmptyCompetenceData() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT);
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);

        assertNotNull(result);
        assertTrue(((List) result.get("gaps")).isEmpty());
        assertEquals("Analyse globale du profil", result.get("competenceAnalysee"));
    }

    @Test
    void testAnalyserEnseignant_WithHighGap() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "Informatique", "DEBUTANT"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);

        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertEquals(3.0, gaps.get(0).get("gap"));
        assertEquals("elevee", gaps.get(0).get("gravite"));
    }

    @Test
    void testAnalyserEnseignant_WithExpertLevel() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "Informatique", "EXPERT"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);

        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertTrue(gaps.isEmpty());
    }

    @Test
    void testAnalyserEnseignant_WithFormationServiceFailure() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "Informatique", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, FORMATIONS, new RuntimeException("Formation service down"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);

        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Devrait avoir au moins une recommandation de fallback");
        assertEquals("Service formation indisponible", recommandations.get(0).get("titre"));
    }

    @Test
    void testAnalyserEnseignant_WithBesoinFormationServiceFailure() {
        // Avec un niveau EXPERT, aucun gap n'est détecté : le fallback des besoins (via gaps) reste vide.
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "Informatique", "EXPERT"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, BESOINS, new RuntimeException("Besoin formation service down"));

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);

        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertTrue(besoins.isEmpty(), "Les besoins doivent être vides (pas de gap, fallback vide)");
    }

    @Test
    void testAnalyserEnseignant_WithMultipleGaps() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "Informatique", "DEBUTANT"),
                RestTemplateMockHelper.affectation(2L, "Python", 1L, "Informatique", "CONFIRME"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);

        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertEquals(2, gaps.size());
        assertEquals("elevee", gaps.get(0).get("gravite"));
        assertEquals("faible", gaps.get(1).get("gravite"));
    }

    @Test
    void testAnalyserTendancesGlobales_WithServiceFailure() {
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, EVALUATIONS, new RuntimeException("Service down"));

        Map<String, Object> result = analysePredictiveService.analyserTendancesGlobales();

        assertNotNull(result);
        Map<String, Object> stats = (Map<String, Object>) result.get("statistiques");
        assertEquals(0, stats.get("totalEvaluations"));
        assertEquals(0.0, stats.get("noteMoyenne"));
    }

    @Test
    void testAnalyserTendancesGlobales_WithLowScorers() {
        Map<String, Object> eval1 = new HashMap<>();
        eval1.put("noteGlobale", 1.5);
        eval1.put("enseignantId", "ens1");

        Map<String, Object> eval2 = new HashMap<>();
        eval2.put("noteGlobale", 4.5);
        eval2.put("enseignantId", "ens2");

        RestTemplateMockHelper.mockEndpoint(restTemplate, EVALUATIONS, eval1, eval2);

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
