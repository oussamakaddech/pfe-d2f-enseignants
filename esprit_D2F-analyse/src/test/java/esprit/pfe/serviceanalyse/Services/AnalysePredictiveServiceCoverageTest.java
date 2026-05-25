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
class AnalysePredictiveServiceCoverageTest {

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
    void testAnalyserEnseignant_WithFormationAnnulee() {
        // Test with cancelled formation
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        Map<String, Object> formation = new HashMap<>();
        formation.put("idFormation", 101);
        formation.put("etatFormation", "ANNULEE"); // Should be skipped

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(List.of(formation));
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertTrue(recommandations.isEmpty(), "Les formations annulées ne doivent pas être recommandées");
    }

    @Test
    void testAnalyserEnseignant_WithFormationEnCours() {
        // Test with in-progress formation
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        Map<String, Object> formation = new HashMap<>();
        formation.put("idFormation", 101);
        formation.put("titreFormation", "Java Advanced");
        formation.put("etatFormation", "EN_COURS");
        formation.put("chargeHoraireGlobal", 20);

        Map<String, Object> fc = new HashMap<>();
        fc.put("competenceId", 1L);
        fc.put("competenceNom", "Java");

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(List.of(formation));
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(List.of(fc));
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Les formations en cours doivent être recommandées");
        assertEquals(0.70, recommandations.get(0).get("probabiliteReussite"), "La probabilité de réussite doit être 0.70 pour les formations en cours");
    }

    @Test
    void testAnalyserEnseignant_WithBesoinFormationServiceSuccess() {
        // Test with successful besoin formation service
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        Map<String, Object> besoin = new HashMap<>();
        besoin.put("competence", "Java");
        besoin.put("titre", "Formation Java");

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(List.of(besoin));

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertFalse(besoins.isEmpty(), "Les besoins doivent être détectés");
    }

    @Test
    void testAnalyserEnseignant_WithMultipleBesoins() {
        // Test with multiple besoins
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        Map<String, Object> besoin1 = new HashMap<>();
        besoin1.put("competence", "Java");
        besoin1.put("titre", "Formation Java");

        Map<String, Object> besoin2 = new HashMap<>();
        besoin2.put("competence", "Python");
        besoin2.put("titre", "Formation Python");

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(List.of(besoin1, besoin1, besoin1, besoin1, besoin1, besoin2, besoin2)); // 5 besoins Java

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertEquals(2, besoins.size(), "Deux types de besoins doivent être détectés");
        assertEquals("haute", besoins.get(0).get("priorite"), "Java doit avoir une priorité haute");
    }

    @Test
    void testAnalyserEnseignant_WithDashboardMetrics() {
        // Test dashboard metrics
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

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
        assertEquals(1, dashboard.get("nombreGaps"), "Le nombre de gaps doit être 1");
        assertTrue(dashboard.containsKey("scoreGlobal"), "Le score global doit être présent");
        assertTrue(dashboard.containsKey("statut"), "Le statut doit être présent");
    }

    @Test
    void testAnalyserEnseignant_WithHighGapDashboard() {
        // Test dashboard with high gap
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
        assertEquals("a_risque", dashboard.get("statut"), "Le statut doit être 'a_risque' pour un gap élevé");
    }

    @Test
    void testAnalyserEnseignant_WithNullCompetenceId() {
        // Test with null competence ID
        Map<String, Object> comp = new HashMap<>();
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

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
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Les gaps doivent être détectés même avec un ID de compétence null");
    }

    @Test
    void testAnalyserEnseignant_WithNullCompetenceObject() {
        // Test with null competence object
        Map<String, Object> aff = new HashMap<>();
        aff.put("niveauMaitrise", 2);

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
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Les gaps doivent être détectés même avec un objet de compétence null");
    }

    @Test
    void testAnalyserEnseignant_WithNullNiveauMaitrise() {
        // Test with null niveau maitrise
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", null);

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
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Les gaps doivent être détectés même avec un niveau de maîtrise null");
    }

    @Test
    void testAnalyserEnseignant_WithStringNiveauMaitrise() {
        // Test with string niveau maitrise
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", "DEBUTANT");

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
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Les gaps doivent être détectés avec un niveau de maîtrise de type chaîne");
    }

    @Test
    void testAnalyserEnseignant_WithFormationWithoutId() {
        // Test with formation without ID
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        Map<String, Object> formation = new HashMap<>();
        formation.put("titreFormation", "Java Advanced");
        formation.put("etatFormation", "PLANIFIEE");

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(List.of(formation));
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Les formations sans ID doivent être recommandées");
    }

    @Test
    void testAnalyserEnseignant_WithNullFormationCompetenceId() {
        // Test with formation competence without ID
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        Map<String, Object> formation = new HashMap<>();
        formation.put("idFormation", 101);
        formation.put("titreFormation", "Java Advanced");
        formation.put("etatFormation", "PLANIFIEE");

        Map<String, Object> fc = new HashMap<>();
        fc.put("competenceNom", "Java");

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(List.of(formation));
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(List.of(fc));
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Les formations avec des compétences sans ID doivent être recommandées");
    }

    @Test
    void testAnalyserEnseignant_WithNullFormationCompetenceNom() {
        // Test with formation competence without name
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        Map<String, Object> formation = new HashMap<>();
        formation.put("idFormation", 101);
        formation.put("titreFormation", "Java Advanced");
        formation.put("etatFormation", "PLANIFIEE");

        Map<String, Object> fc = new HashMap<>();
        fc.put("competenceId", 1L);

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(List.of(formation));
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(List.of(fc));
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Les formations avec des compétences sans nom doivent être recommandées");
    }

    @Test
    void testAnalyserEnseignant_WithEmptyBesoinFormationService() {
        // Test with empty besoin formation service
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

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
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertTrue(besoins.isEmpty(), "Les besoins doivent être vides si le service ne renvoie rien");
    }

    @Test
    void testAnalyserEnseignant_WithNullBesoinFormationService() {
        // Test with null besoin formation service
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(null);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertTrue(besoins.isEmpty(), "Les besoins doivent être vides si le service renvoie null");
    }

    @Test
    void testAnalyserEnseignant_WithEmptyEvaluationService() {
        // Test with empty evaluation service
        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenThrow(new RuntimeException("Comp service down"));
        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertTrue(gaps.isEmpty(), "Les gaps doivent être vides si le service d'évaluation ne renvoie rien");
    }

    @Test
    void testAnalyserEnseignant_WithNullEvaluationService() {
        // Test with null evaluation service
        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenThrow(new RuntimeException("Comp service down"));
        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), eq(List.class)))
            .thenReturn(null);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertTrue(gaps.isEmpty(), "Les gaps doivent être vides si le service d'évaluation renvoie null");
    }

    @Test
    void testAnalyserTendancesGlobales_WithEmptyEvaluationService() {
        // Test with empty evaluation service
        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserTendancesGlobales();
        assertNotNull(result);
        Map<String, Object> stats = (Map<String, Object>) result.get("statistiques");
        assertEquals(0, stats.get("totalEvaluations"), "Le total des évaluations doit être 0 si le service ne renvoie rien");
        assertEquals(0.0, stats.get("noteMoyenne"), "La note moyenne doit être 0.0 si le service ne renvoie rien");
    }

    @Test
    void testAnalyserTendancesGlobales_WithNullEvaluationService() {
        // Test with null evaluation service
        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), eq(List.class)))
            .thenReturn(null);

        Map<String, Object> result = analysePredictiveService.analyserTendancesGlobales();
        assertNotNull(result);
        Map<String, Object> stats = (Map<String, Object>) result.get("statistiques");
        assertEquals(0, stats.get("totalEvaluations"), "Le total des évaluations doit être 0 si le service renvoie null");
        assertEquals(0.0, stats.get("noteMoyenne"), "La note moyenne doit être 0.0 si le service renvoie null");
    }

    @Test
    void testAnalyserTendancesGlobales_WithNullNotes() {
        // Test with null notes
        Map<String, Object> eval1 = new HashMap<>();
        eval1.put("evaluateurId", "ens1");

        Map<String, Object> eval2 = new HashMap<>();
        eval2.put("evaluateurId", "ens2");

        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), eq(List.class)))
            .thenReturn(List.of(eval1, eval2));

        Map<String, Object> result = analysePredictiveService.analyserTendancesGlobales();
        assertNotNull(result);
        Map<String, Object> stats = (Map<String, Object>) result.get("statistiques");
        assertEquals(2, stats.get("totalEvaluations"), "Le total des évaluations doit être 2");
        assertEquals(0.0, stats.get("noteMoyenne"), "La note moyenne doit être 0.0 si toutes les notes sont null");
    }

    @Test
    void testAnalyserTendancesGlobales_WithMixedNotes() {
        // Test with mixed notes (some null, some not)
        Map<String, Object> eval1 = new HashMap<>();
        eval1.put("note", 3.5);
        eval1.put("evaluateurId", "ens1");

        Map<String, Object> eval2 = new HashMap<>();
        eval2.put("evaluateurId", "ens2");

        Map<String, Object> eval3 = new HashMap<>();
        eval3.put("note", 4.5);
        eval3.put("evaluateurId", "ens3");

        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), eq(List.class)))
            .thenReturn(List.of(eval1, eval2, eval3));

        Map<String, Object> result = analysePredictiveService.analyserTendancesGlobales();
        assertNotNull(result);
        Map<String, Object> stats = (Map<String, Object>) result.get("statistiques");
        assertEquals(3, stats.get("totalEvaluations"), "Le total des évaluations doit être 3");
        assertEquals(4.0, stats.get("noteMoyenne"), "La note moyenne doit être 4.0");
    }
}
