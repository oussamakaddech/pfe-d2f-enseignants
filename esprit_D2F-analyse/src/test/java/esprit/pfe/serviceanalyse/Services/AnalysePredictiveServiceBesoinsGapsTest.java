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
class AnalysePredictiveServiceBesoinsGapsTest {

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
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Les recommandations doivent être détectées");
        assertEquals(0.50, recommandations.get(0).get("probabiliteReussite"), 
            "La probabilité de réussite doit être 0.50 pour une formation sans ID");
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
        assertEquals(0.50, recommandations.get(0).get("probabiliteReussite"), 
            "La probabilité de réussite doit être 0.50 pour une formation sans liens de compétence");
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
        assertEquals(0.50, recommandations.get(0).get("probabiliteReussite"), 
            "La probabilité de réussite doit être 0.50 pour une formation sans ID de compétence");
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
        assertEquals(0.90, recommandations.get(0).get("probabiliteReussite"), 
            "La probabilité de réussite doit être 0.90 pour une formation ciblant un gap");
        assertTrue(((List<?>) recommandations.get(0).get("competencesCiblees")).isEmpty(), 
            "La liste des compétences ciblées doit être vide");
    }

    @Test
    void testCheckFormationCibleGaps_WithServiceFailure() {
        // Test with service failure
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
            .thenThrow(new RuntimeException("Service down"));
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Les recommandations doivent être détectées");
        assertEquals(0.50, recommandations.get(0).get("probabiliteReussite"), 
            "La probabilité de réussite doit être 0.50 en cas d'échec du service");
    }

    @Test
    void testDetecterBesoins_WithNullBesoinsApprouves() {
        // Test with null besoinsApprouves
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
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(null);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertTrue(besoins.isEmpty(), "Aucun besoin ne doit être détecté si les besoins approuvés sont null");
    }

    @Test
    void testDetecterBesoins_WithServiceFailure() {
        // Test with service failure (fallback via gaps)
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
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenThrow(new RuntimeException("Service down"));

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertFalse(besoins.isEmpty(), "Les besoins doivent être détectés via le fallback des gaps");
        assertEquals("individuel", besoins.get(0).get("type"), "Le type doit être individuel pour le fallback");
    }

    @Test
    void testDetecterBesoins_WithEmptyBesoinsApprouves() {
        // Test with empty besoinsApprouves
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
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(Collections.emptyList());

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertTrue(besoins.isEmpty(), "Aucun besoin ne doit être détecté si les besoins approuvés sont vides");
    }

    @Test
    void testDetecterBesoins_WithOnlyTitre() {
        // Test with only titre (no competence)
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        Map<String, Object> besoin = new HashMap<>();
        besoin.put("titre", "Formation Java");

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(List.of(besoin));

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertFalse(besoins.isEmpty(), "Les besoins doivent être détectés même sans compétence");
        assertEquals("Formation Java", besoins.get(0).get("competenceCode"), 
            "Le code de compétence doit être le titre");
    }

    @Test
    void testDetecterBesoins_WithOnlyCompetence() {
        // Test with only competence (no titre)
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        Map<String, Object> besoin = new HashMap<>();
        besoin.put("competence", "Java");

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(List.of(besoin));

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertFalse(besoins.isEmpty(), "Les besoins doivent être détectés même sans titre");
        assertEquals("Java", besoins.get(0).get("competenceCode"), 
            "Le code de compétence doit être le nom de la compétence");
    }

    @Test
    void testDetecterBesoins_WithNeitherCompetenceNorTitre() {
        // Test with neither competence nor titre (should use "inconnu")
        Map<String, Object> comp = new HashMap<>();
        comp.put("id", 1);
        comp.put("nom", "Java");
        Map<String, Object> aff = new HashMap<>();
        aff.put("competence", comp);
        aff.put("niveauMaitrise", 2);

        Map<String, Object> besoin = new HashMap<>();
        besoin.put("otherField", "value");

        when(restTemplate.getForObject(contains("/api/v1/enseignant-competences"), eq(List.class)))
            .thenReturn(List.of(aff));
        when(restTemplate.getForObject(contains("/formations"), eq(List.class)))
            .thenReturn(Collections.emptyList());
        when(restTemplate.getForObject(contains("/besoinsFormations"), eq(List.class)))
            .thenReturn(List.of(besoin));

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertTrue(besoins.isEmpty(), "Les besoins approuvés sans compétence ni titre doivent être ignorés");
    }
}
