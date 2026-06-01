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

    @Test
    void testRecommanderFormations_WithNullFormations() {
        // Test with null formations
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(null);
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertTrue(recommandations.isEmpty(), "Aucune recommandation ne doit être faite si les formations sont null");
    }

    @Test
    void testRecommanderFormations_WithServiceFailure() {
        // Test with service failure
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenThrow(new RuntimeException("Service de formation indisponible"));
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Une recommandation de fallback doit être faite en cas d'erreur");
        assertEquals("Service formation indisponible", recommandations.get(0).get("titre"), 
            "Le titre de la recommandation de fallback doit être correct");
    }

    @Test
    void testRecommanderFormations_WithAnnuleeFormation() {
        // Test with ANNULEE formation (should be skipped)
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        Map<String, Object> formation = new HashMap<>();
        formation.put("formationId", 101);
        formation.put("titreFormation", "Java Advanced");
        formation.put("etatFormation", "ANNULEE");
        formation.put("chargeHoraireGlobal", 20);

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
        assertTrue(recommandations.isEmpty(), "Aucune recommandation ne doit être faite pour une formation annulée");
    }

    @Test
    void testRecommanderFormations_WithMultipleFormations() {
        // Test with multiple formations
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        Map<String, Object> formation1 = new HashMap<>();
        formation1.put("idFormation", 101);
        formation1.put("titreFormation", "Java Advanced");
        formation1.put("etatFormation", "PLANIFIEE");
        formation1.put("chargeHoraireGlobal", 20);

        Map<String, Object> formation2 = new HashMap<>();
        formation2.put("idFormation", 102);
        formation2.put("titreFormation", "Python Basics");
        formation2.put("etatFormation", "PLANIFIEE");
        formation2.put("chargeHoraireGlobal", 15);

        Map<String, Object> fc = new HashMap<>();
        fc.put("competenceId", 1L);
        fc.put("competenceNom", "Java");

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(List.of(formation1, formation2));
        when(restTemplate.getForObject(contains("/formation-competences/formation/"), eq(List.class)))
            .thenReturn(List.of(fc));
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertEquals(2, recommandations.size(), "Deux recommandations doivent être faites");
        assertEquals(1, recommandations.get(0).get("ordre"), "La première recommandation doit avoir l'ordre 1");
        assertEquals(2, recommandations.get(1).get("ordre"), "La deuxième recommandation doit avoir l'ordre 2");
    }

    @Test
    void testRecommanderFormations_WithCompetenceCible() {
        // Test with competenceCible
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

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", 1L);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Les recommandations doivent être détectées");
        assertEquals(0.90, recommandations.get(0).get("probabiliteReussite"), 
            "La probabilité de réussite doit être 0.90 pour une formation ciblant la compétence cible");
    }

    @Test
    void testRecommanderFormations_WithNullChargeHoraire() {
        // Test with null chargeHoraireGlobal
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
        // No chargeHoraireGlobal

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
        assertFalse(recommandations.isEmpty(), "Les recommandations doivent être détectées");
        assertEquals("0h", recommandations.get(0).get("dureeEstimee"), 
            "La durée estimée doit être '0h' si chargeHoraireGlobal est null");
    }

    @Test
    void testRecommanderFormations_WithNullTitre() {
        // Test with null titreFormation
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        Map<String, Object> formation = new HashMap<>();
        formation.put("idFormation", 101);
        formation.put("etatFormation", "PLANIFIEE");
        formation.put("chargeHoraireGlobal", 20);
        // No titreFormation

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
        assertFalse(recommandations.isEmpty(), "Les recommandations doivent être détectées");
        assertEquals("Sans titre", recommandations.get(0).get("titre"), 
            "Le titre doit être 'Sans titre' si titreFormation est null");
    }
}
