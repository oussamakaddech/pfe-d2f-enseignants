package esprit.pfe.serviceanalyse.services;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class AnalysePredictiveServiceBranchCoverageTest {

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
    void testAnalyserEnseignant_WithNullCompetenceObject() {
        // Test with null competence object (line 98 branch)
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", null);
        aff.put("niveauMaitrise", 2);

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Les gaps doivent être détectés même avec un objet de compétence null");
    }

    @Test
    void testAnalyserEnseignant_WithNoGap() {
        // Test with no gap (line 105 branch - gapVal <= 0)
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 4); // Same as target, no gap

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertTrue(gaps.isEmpty(), "Aucun gap ne doit être détecté si le niveau actuel est égal au niveau cible");
    }

    @Test
    void testIdentifierGapsViaEvaluations_WithNullEvals() {
        // Test with null evaluations (line 134 branch)
        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenThrow(new RuntimeException("Comp service down"));
        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), List.class))
            .thenReturn(null);
        when(restTemplate.getForObject(contains("/formations"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertTrue(gaps.isEmpty(), "Aucun gap ne doit être détecté si les évaluations sont null");
    }

    @Test
    void testIdentifierGapsViaEvaluations_WithNoGap() {
        // Test with no gap in evaluations (line 140 branch - gapVal <= 0)
        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenThrow(new RuntimeException("Comp service down"));

        Map<String, Object> eval = new HashMap<>();
        eval.put("note", 5.0); // High note, no gap
        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), List.class))
            .thenReturn(List.of(eval));
        when(restTemplate.getForObject(contains("/formations"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertTrue(gaps.isEmpty(), "Aucun gap ne doit être détecté si la note moyenne est supérieure à la cible");
    }

    @Test
    void testRecommanderFormations_WithNullFormations() {
        // Test with null formations (line 168 branch)
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), List.class))
            .thenReturn(null);
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertTrue(recommandations.isEmpty(), "Aucune recommandation ne doit être faite si les formations sont null");
    }

    @Test
    void testAnalyserEnseignant_WithNullCompetenceCible() {
        // Test with null competenceCible (line 183 branch)
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        assertEquals("Analyse globale du profil", result.get("competenceAnalysee"), "L'analyse doit être globale si competenceCible est null");
    }

    @Test
    void testDetecterBesoins_WithNullBesoinsApprouves() {
        // Test with null besoinsApprouves (line 250 branch)
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(null);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertTrue(besoins.isEmpty(), "Aucun besoin ne doit être détecté si les besoins approuvés sont null");
    }

    @Test
    void testAnalyserTendancesGlobales_WithNullEvals() {
        // Test with null evaluations (line 307 branch)
        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), List.class))
            .thenReturn(null);

        Map<String, Object> result = analysePredictiveService.analyserTendancesGlobales();
        assertNotNull(result);
        Map<String, Object> stats = (Map<String, Object>) result.get("statistiques");
        assertEquals(0, stats.get("totalEvaluations"), "Le total des évaluations doit être 0 si les évaluations sont null");
        assertEquals(0.0, stats.get("noteMoyenne"), "La note moyenne doit être 0.0 si les évaluations sont null");
    }

    @Test
    void testGenererDashboard_WithNullEvals() {
        // Test with null evaluations (line 333 branch)
        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), List.class))
            .thenReturn(null);

        Map<String, Object> result = analysePredictiveService.analyserTendancesGlobales();
        assertNotNull(result);
        Map<String, Object> dashboard = (Map<String, Object>) result.get("dashboard");
        assertNotNull(dashboard, "Le dashboard ne doit pas être null");
        assertTrue(((List<?>) dashboard.get("enseignantsARisque")).isEmpty(), "Aucun enseignant à risque ne doit être détecté si les évaluations sont null");
    }

    @Test
    void testParseNiveau_WithNullValue() {
        // Test with null niveau (line 346 branch)
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", null);

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Un gap doit être détecté si le niveau de maîtrise est null");
        assertEquals(4.0, gaps.get(0).get("gap"), "Le gap doit être de 4 si le niveau de maîtrise est null (0)");
    }

    @Test
    void testParseNiveau_WithNumberValue() {
        // Test with Number value (line 347 branch)
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 3); // Number value

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Un gap doit être détecté si le niveau de maîtrise est un nombre");
        assertEquals(1.0, gaps.get(0).get("gap"), "Le gap doit être de 1 si le niveau de maîtrise est 3");
    }

    @Test
    void testParseNiveau_WithStringValues() {
        // Test all string values (lines 350-355 branches)
        String[] levels = {"DEBUTANT", "1", "NIVEAU_1", "INITIE", "2", "NIVEAU_2", 
                          "CONFIRME", "3", "NIVEAU_3", "AVANCE", "4", "NIVEAU_4", 
                          "EXPERT", "5", "NIVEAU_5", "UNKNOWN"};
        int[] expectedGaps = {3, 3, 3, 2, 2, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 4};

        for (int i = 0; i < levels.length; i++) {
            Map<String, Object> comp = new HashMap<>();
            comp.put("id", 1);
            comp.put("nom", "Java");
            Map<String, Object> aff = new HashMap<>();
            aff.put("competence", comp);
            aff.put("niveauMaitrise", levels[i]);

            when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
                .thenReturn(List.of(aff));
            when(restTemplate.getForObject(contains("/formations"), List.class))
                .thenReturn(Collections.emptyList());
            when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
                .thenReturn(Collections.emptyList());
            when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
                .thenReturn(Collections.emptyList());

            Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
            assertNotNull(result, "Le résultat ne doit pas être null pour le niveau: " + levels[i]);
            List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");

            if (expectedGaps[i] > 0) {
                assertFalse(gaps.isEmpty(), "Un gap doit être détecté pour le niveau: " + levels[i]);
                assertEquals((double) expectedGaps[i], gaps.get(0).get("gap"), 
                    "Le gap doit être de " + expectedGaps[i] + " pour le niveau: " + levels[i]);
            } else {
                assertTrue(gaps.isEmpty(), "Aucun gap ne doit être détecté pour le niveau: " + levels[i]);
            }
        }
    }

    @Test
    void testCalculateProbabilite_WithCibleUnGapTrue() {
        // Test with cibleUnGap = true (line 360 branch)
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
        formation.put("chargeHoraireGlobal", 20);

        Map<String, Object> fc = new HashMap<>();
        fc.put("competenceId", 1L);
        fc.put("competenceNom", "Java");

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), List.class))
            .thenReturn(List.of(formation));
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
            .thenReturn(List.of(fc));
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Des recommandations doivent être faites");
        assertEquals(0.90, recommandations.get(0).get("probabiliteReussite"), 
            "La probabilité de réussite doit être 0.90 si la formation cible un gap");
    }

    @Test
    void testCalculateProbabilite_WithCibleUnGapFalse() {
        // Test with cibleUnGap = false (line 361 branch)
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
        formation.put("chargeHoraireGlobal", 20);

        Map<String, Object> fc = new HashMap<>();
        fc.put("competenceId", 2L); // Different from gap
        fc.put("competenceNom", "Python");

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), List.class))
            .thenReturn(List.of(formation));
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
            .thenReturn(List.of(fc));
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Des recommandations doivent être faites");
        assertEquals(0.50, recommandations.get(0).get("probabiliteReussite"), 
            "La probabilité de réussite doit être 0.50 si la formation ne cible pas un gap");
    }

    @Test
    void testCheckFormationCibleGaps_WithNullFormationId() {
        // Test with null formationId (line 215 branch)
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        Map<String, Object> formation = new HashMap<>();
        formation.put("titreFormation", "Java Advanced");
        formation.put("etatFormation", "PLANIFIEE");
        formation.put("chargeHoraireGlobal", 20);
        // No idFormation

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), List.class))
            .thenReturn(List.of(formation));
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Des recommandations doivent être faites même sans ID de formation");
    }

    @Test
    void testCheckFormationCibleGaps_WithNullFcLinks() {
        // Test with null fcLinks (line 219 branch)
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
        formation.put("chargeHoraireGlobal", 20);

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), List.class))
            .thenReturn(List.of(formation));
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
            .thenReturn(null);
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Des recommandations doivent être faites même sans liens de formation-competence");
    }

    @Test
    void testGetPrioriteValue_Branches() {
        // Test all branches of getPrioriteValue (lines 280-282)
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        // Test with count >= 5 (high priority)
        Map<String, Object> besoin1 = new HashMap<>();
        besoin1.put("competence", "Java");
        besoin1.put("titre", "Formation Java");

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(List.of(besoin1, besoin1, besoin1, besoin1, besoin1));

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertFalse(besoins.isEmpty(), "Des besoins doivent être détectés");
        assertEquals("haute", besoins.get(0).get("priorite"), "La priorité doit être haute pour count >= 5");

        // Test with count >= 2 (medium priority)
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(List.of(besoin1, besoin1));

        result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertFalse(besoins.isEmpty(), "Des besoins doivent être détectés");
        assertEquals("moyenne", besoins.get(0).get("priorite"), "La priorité doit être moyenne pour count >= 2");

        // Test with count < 2 (low priority)
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(List.of(besoin1));

        result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertFalse(besoins.isEmpty(), "Des besoins doivent être détectés");
        assertEquals("faible", besoins.get(0).get("priorite"), "La priorité doit être faible pour count < 2");
    }

    @Test
    void testGetGraviteValue_Branches() {
        // Test all branches of getGraviteValue (lines 286-288)
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");

        // Test with gap >= 3 (high gravity)
        Map<String, Object> aff1 = new HashMap<>();
        aff1.put("competence", comp);
        aff1.put("niveauMaitrise", 1); // gap = 3

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff1));
        when(restTemplate.getForObject(contains("/formations"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Des gaps doivent être détectés");
        assertEquals("elevee", gaps.get(0).get("gravite"), "La gravité doit être élevée pour gap >= 3");

        // Test with gap >= 2 (medium gravity)
        Map<String, Object> aff2 = new HashMap<>();
        aff2.put("competence", comp);
        aff2.put("niveauMaitrise", 2); // gap = 2

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff2));

        result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Des gaps doivent être détectés");
        assertEquals("moyenne", gaps.get(0).get("gravite"), "La gravité doit être moyenne pour gap >= 2");

        // Test with gap < 2 (low gravity)
        Map<String, Object> aff3 = new HashMap<>();
        aff3.put("competence", comp);
        aff3.put("niveauMaitrise", 3); // gap = 1

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff3));

        result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Des gaps doivent être détectés");
        assertEquals("faible", gaps.get(0).get("gravite"), "La gravité doit être faible pour gap < 2");
    }

    @Test
    void testGetPrioriteOrder_Branches() {
        // Test all branches of getPrioriteOrder (lines 366-368)
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 1); // High gap

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
            .thenReturn(Collections.emptyList());

        // Test with high priority
        Map<String, Object> besoin1 = new HashMap<>();
        besoin1.put("competence", "Java");
        besoin1.put("titre", "Formation Java");

        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(List.of(besoin1, besoin1, besoin1, besoin1, besoin1));

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertFalse(besoins.isEmpty(), "Des besoins doivent être détectés");
        assertEquals("haute", besoins.get(0).get("priorite"), "La priorité doit être haute");

        // Test with medium priority
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(List.of(besoin1, besoin1));

        result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertFalse(besoins.isEmpty(), "Des besoins doivent être détectés");
        assertEquals("moyenne", besoins.get(0).get("priorite"), "La priorité doit être moyenne");

        // Test with low priority
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(List.of(besoin1));

        result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertFalse(besoins.isEmpty(), "Des besoins doivent être détectés");
        assertEquals("faible", besoins.get(0).get("priorite"), "La priorité doit être faible");
    }

    @Test
    void testGetGraviteOrder_Branches() {
        // Test all branches of getGraviteOrder (lines 120-122)
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");

        // Test with high gravity
        Map<String, Object> aff1 = new HashMap<>();
        aff1.put("competence", comp);
        aff1.put("niveauMaitrise", 1); // gap = 3, high gravity

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff1));
        when(restTemplate.getForObject(contains("/formations"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Des gaps doivent être détectés");
        assertEquals("elevee", gaps.get(0).get("gravite"), "La gravité doit être élevée");

        // Test with medium gravity
        Map<String, Object> aff2 = new HashMap<>();
        aff2.put("competence", comp);
        aff2.put("niveauMaitrise", 2); // gap = 2, medium gravity

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff2));

        result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Des gaps doivent être détectés");
        assertEquals("moyenne", gaps.get(0).get("gravite"), "La gravité doit être moyenne");

        // Test with low gravity
        Map<String, Object> aff3 = new HashMap<>();
        aff3.put("competence", comp);
        aff3.put("niveauMaitrise", 3); // gap = 1, low gravity

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff3));

        result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Des gaps doivent être détectés");
        assertEquals("faible", gaps.get(0).get("gravite"), "La gravité doit être faible");
    }

    @Test
    void testProcessFormationRecommendation_WithNullCompetenceCiblees() {
        // Test with null competencesCiblees
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
        formation.put("chargeHoraireGlobal", 20);

        Map<String, Object> fc = new HashMap<>();
        fc.put("competenceId", 1L);
        fc.put("competenceNom", null); // Null competence name

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), List.class))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), List.class))
            .thenReturn(List.of(formation));
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), List.class))
            .thenReturn(List.of(fc));
        when(restTemplate.getForObject(contains("/besoinsFormations"), List.class))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Des recommandations doivent être faites même avec des noms de compétences null");
    }
}
