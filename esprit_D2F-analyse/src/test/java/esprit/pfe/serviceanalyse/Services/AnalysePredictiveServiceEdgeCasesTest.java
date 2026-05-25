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

    @Test
    void testIdentifierGapsViaEvaluations_WithNullNotes() {
        // Test with null notes in evaluations
        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenThrow(new RuntimeException("Comp service down"));

        Map<String, Object> eval = new HashMap<>();
        eval.put("note", null);
        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), eq(List.class)))
            .thenReturn(List.of(eval));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertTrue(gaps.isEmpty(), "Aucun gap ne doit être détecté si toutes les notes sont null");
    }

    @Test
    void testIdentifierGapsViaEvaluations_WithMixedNotes() {
        // Test with mixed null and valid notes in evaluations
        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenThrow(new RuntimeException("Comp service down"));

        Map<String, Object> eval1 = new HashMap<>();
        eval1.put("note", 2.5);

        Map<String, Object> eval2 = new HashMap<>();
        eval2.put("note", null);

        Map<String, Object> eval3 = new HashMap<>();
        eval3.put("note", 3.5);

        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), eq(List.class)))
            .thenReturn(List.of(eval1, eval2, eval3));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertTrue(gaps.isEmpty(), "Aucun gap ne doit être détecté lorsque la moyenne atteint la cible");
    }

    @Test
    void testIdentifierGapsViaEvaluations_WithHighGap() {
        // Test with high gap (gapVal >= 2)
        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenThrow(new RuntimeException("Comp service down"));

        Map<String, Object> eval = new HashMap<>();
        eval.put("note", 1.0); // gapVal = 3.0 - 1.0 = 2.0 -> GRAVITE_ELEVEE
        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), eq(List.class)))
            .thenReturn(List.of(eval));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Les gaps doivent être détectés");
        assertEquals("elevee", gaps.get(0).get("gravite"), "La gravité doit être élevée pour un gap >= 2");
    }

    @Test
    void testIdentifierGapsViaEvaluations_WithMediumGap() {
        // Test with medium gap (0 < gapVal < 2)
        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenThrow(new RuntimeException("Comp service down"));

        Map<String, Object> eval = new HashMap<>();
        eval.put("note", 2.5); // gapVal = 3.0 - 2.5 = 0.5 -> GRAVITE_MOYENNE
        when(restTemplate.getForObject(contains("/evaluation/evaluations-globales"), eq(List.class)))
            .thenReturn(List.of(eval));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Les gaps doivent être détectés");
        assertEquals("moyenne", gaps.get(0).get("gravite"), "La gravité doit être moyenne pour un gap < 2");
    }

    @Test
    void testCheckFormationCibleGaps_WithNullFormationId() {
        // Test with null formationId
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        Map<String, Object> formation = new HashMap<>();
        formation.put("titreFormation", "Java Advanced");
        formation.put("etatFormation", "PLANIFIEE");
        // No idFormation

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
        assertFalse(recommandations.isEmpty(), "Les recommandations doivent être détectées");
        assertEquals(0.50, recommandations.get(0).get("probabiliteReussite"), "La probabilité de réussite doit être 0.50 pour une formation sans ID");
    }

    @Test
    void testCheckFormationCibleGaps_WithNullFcLinks() {
        // Test with null fcLinks
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        Map<String, Object> formation = new HashMap<>();
        formation.put("formationId", 101);
        formation.put("titreFormation", "Java Advanced");
        formation.put("etatFormation", "PLANIFIEE");

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(List.of(formation));
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(null);
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Les recommandations doivent être détectées");
        assertEquals(0.50, recommandations.get(0).get("probabiliteReussite"), "La probabilité de réussite doit être 0.50 pour une formation sans liens de compétence");
    }

    @Test
    void testCheckFormationCibleGaps_WithNullCompId() {
        // Test with null compId in fcLinks
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        Map<String, Object> formation = new HashMap<>();
        formation.put("formationId", 101);
        formation.put("titreFormation", "Java Advanced");
        formation.put("etatFormation", "PLANIFIEE");

        Map<String, Object> fc = new HashMap<>();
        fc.put("competenceNom", "Java");
        // No competenceId

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
        assertFalse(recommandations.isEmpty(), "Les recommandations doivent être détectées");
        assertEquals(0.50, recommandations.get(0).get("probabiliteReussite"), "La probabilité de réussite doit être 0.50 pour une formation sans ID de compétence");
    }

    @Test
    void testCheckFormationCibleGaps_WithNullCompNom() {
        // Test with null compNom in fcLinks
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        Map<String, Object> formation = new HashMap<>();
        formation.put("formationId", 101);
        formation.put("titreFormation", "Java Advanced");
        formation.put("etatFormation", "PLANIFIEE");

        Map<String, Object> fc = new HashMap<>();
        fc.put("competenceId", 1L);
        // No competenceNom

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
        assertFalse(recommandations.isEmpty(), "Les recommandations doivent être détectées");
        assertEquals(0.90, recommandations.get(0).get("probabiliteReussite"), "La probabilité de réussite doit être 0.90 pour une formation ciblant un gap");
        assertTrue(((List<?>) recommandations.get(0).get("competencesCiblees")).isEmpty(), "La liste des compétences ciblées doit être vide");
    }

    @Test
    void testDetecterBesoins_WithEmptyGaps() {
        // Test with empty gaps in fallback
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
            .thenThrow(new RuntimeException("Service down"));

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertTrue(besoins.isEmpty(), "Aucun besoin ne doit être détecté s'il n'y a pas de gaps");
    }

    @Test
    void testDetecterBesoins_WithMultipleGaps() {
        // Test with multiple gaps in fallback
        Map<String, Object> comp1 = new HashMap<>();
        comp1.put("id", 1);
        comp1.put("nom", "Java");
        Map<String, Object> aff1 = new HashMap<>();
        aff1.put("competence", comp1);
        aff1.put("niveauMaitrise", 1); // High gap

        Map<String, Object> comp2 = new HashMap<>();
        comp2.put("id", 2);
        comp2.put("nom", "Python");
        Map<String, Object> aff2 = new HashMap<>();
        aff2.put("competence", comp2);
        aff2.put("niveauMaitrise", 2); // Medium gap

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenReturn(List.of(aff1, aff2));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenThrow(new RuntimeException("Service down"));

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertEquals(2, besoins.size(), "Deux besoins doivent être détectés pour deux gaps");
        assertEquals("elevee", besoins.get(0).get("priorite"), "Le premier besoin doit avoir une priorité élevée");
        assertEquals("moyenne", besoins.get(1).get("priorite"), "Le deuxième besoin doit avoir une priorité moyenne");
    }
}
