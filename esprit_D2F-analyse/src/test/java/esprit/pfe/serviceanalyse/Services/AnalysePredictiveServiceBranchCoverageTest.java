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
import org.springframework.web.client.RestTemplate;

import java.util.*;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@MockitoSettings(strictness = Strictness.LENIENT)
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

    private void stubNullBody(String fragment) {
        when(restTemplate.exchange(contains(fragment), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(null));
    }

    private Map<String, Object> aff(Long id, String nom, Object niveau) {
        Map<String, Object> m = new HashMap<>();
        if (id != null) m.put("competenceId", id);
        if (nom != null) m.put("competenceNom", nom);
        m.put("niveau", niveau);
        return m;
    }

    private Map<String, Object> eval(Double note, String id) {
        Map<String, Object> m = new HashMap<>();
        m.put("noteGlobale", note);
        m.put("enseignantId", id);
        return m;
    }

    private void envAutour() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);
    }

    @Test
    void testAnalyserEnseignant_WithNullCompetenceObject() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT, aff(null, null, "INITIE"));
        envAutour();

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Les gaps doivent être détectés même avec un objet de compétence null");
    }

    @Test
    void testAnalyserEnseignant_WithNoGap() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "AVANCE"));
        envAutour();

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertTrue(gaps.isEmpty(), "Aucun gap ne doit être détecté si le niveau actuel est égal au niveau cible");
    }

    @Test
    void testIdentifierGapsViaEvaluations_WithNullEvals() {
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, COMPETENCES_ENSEIGNANT, new RuntimeException("Comp service down"));
        stubNullBody(EVALUATIONS);
        envAutour();

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertTrue(gaps.isEmpty(), "Aucun gap ne doit être détecté si les évaluations sont null");
    }

    @Test
    void testIdentifierGapsViaEvaluations_WithNoGap() {
        RestTemplateMockHelper.mockEndpointFailure(restTemplate, COMPETENCES_ENSEIGNANT, new RuntimeException("Comp service down"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, EVALUATIONS, eval(5.0, "ens1"));
        envAutour();

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertTrue(gaps.isEmpty(), "Aucun gap ne doit être détecté si la note moyenne est supérieure à la cible");
    }

    @Test
    void testRecommanderFormations_WithNullFormations() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        stubNullBody(FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertTrue(recommandations.isEmpty(), "Aucune recommandation ne doit être faite si les formations sont null");
    }

    @Test
    void testAnalyserEnseignant_WithNullCompetenceCible() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        envAutour();

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        assertEquals("Analyse globale du profil", result.get("competenceAnalysee"), "L'analyse doit être globale si competenceCible est null");
    }

    @Test
    void testDetecterBesoins_WithNullBesoinsApprouves() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        stubNullBody(BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertTrue(besoins.isEmpty(), "Aucun besoin ne doit être détecté si les besoins approuvés sont null");
    }

    @Test
    void testAnalyserTendancesGlobales_WithNullEvals() {
        stubNullBody(EVALUATIONS);

        Map<String, Object> result = analysePredictiveService.analyserTendancesGlobales();
        assertNotNull(result);
        Map<String, Object> stats = (Map<String, Object>) result.get("statistiques");
        assertEquals(0, stats.get("totalEvaluations"), "Le total des évaluations doit être 0 si les évaluations sont null");
        assertEquals(0.0, stats.get("noteMoyenne"), "La note moyenne doit être 0.0 si les évaluations sont null");
    }

    @Test
    void testGenererDashboard_WithNullEvals() {
        stubNullBody(EVALUATIONS);

        Map<String, Object> result = analysePredictiveService.analyserTendancesGlobales();
        assertNotNull(result);
        Map<String, Object> dashboard = (Map<String, Object>) result.get("dashboard");
        assertNotNull(dashboard, "Le dashboard ne doit pas être null");
        assertTrue(((List<?>) dashboard.get("enseignantsARisque")).isEmpty(), "Aucun enseignant à risque ne doit être détecté si les évaluations sont null");
    }

    @Test
    void testParseNiveau_WithNullValue() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT, aff(1L, "Java", null));
        envAutour();

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Un gap doit être détecté si le niveau de maîtrise est null");
        assertEquals(4.0, gaps.get(0).get("gap"), "Le gap doit être de 4 si le niveau de maîtrise est null (0)");
    }

    @Test
    void testParseNiveau_WithNumberValue() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT, aff(1L, "Java", 3));
        envAutour();

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Un gap doit être détecté si le niveau de maîtrise est un nombre");
        assertEquals(1.0, gaps.get(0).get("gap"), "Le gap doit être de 1 si le niveau de maîtrise est 3");
    }

    @Test
    void testParseNiveau_WithStringValues() {
        String[] levels = {"DEBUTANT", "1", "NIVEAU_1", "INITIE", "2", "NIVEAU_2",
                          "CONFIRME", "3", "NIVEAU_3", "AVANCE", "4", "NIVEAU_4",
                          "EXPERT", "5", "NIVEAU_5", "UNKNOWN"};
        int[] expectedGaps = {3, 3, 3, 2, 2, 2, 1, 1, 1, 0, 0, 0, 0, 0, 0, 4};

        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        for (int i = 0; i < levels.length; i++) {
            RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT, aff(1L, "Java", levels[i]));

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
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        Map<String, Object> formation = RestTemplateMockHelper.formation(101L, "Java Advanced", "PLANIFIEE");
        formation.put("chargeHoraireGlobal", 20);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS, formation);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES,
                RestTemplateMockHelper.formationCompetence(1L, "Java"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Des recommandations doivent être faites");
        assertEquals(0.90, recommandations.get(0).get("probabiliteReussite"),
            "La probabilité de réussite doit être 0.90 si la formation cible un gap");
    }

    @Test
    void testCalculateProbabilite_WithCibleUnGapFalse() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        Map<String, Object> formation = RestTemplateMockHelper.formation(101L, "Java Advanced", "PLANIFIEE");
        formation.put("chargeHoraireGlobal", 20);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS, formation);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES,
                RestTemplateMockHelper.formationCompetence(2L, "Python"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Des recommandations doivent être faites");
        assertEquals(0.50, recommandations.get(0).get("probabiliteReussite"),
            "La probabilité de réussite doit être 0.50 si la formation ne cible pas un gap");
    }

    @Test
    void testCheckFormationCibleGaps_WithNullFormationId() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        Map<String, Object> formation = RestTemplateMockHelper.formation(0L, "Java Advanced", "PLANIFIEE");
        formation.put("chargeHoraireGlobal", 20);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS, formation);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Des recommandations doivent être faites même sans ID de formation");
    }

    @Test
    void testCheckFormationCibleGaps_WithNullFcLinks() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        Map<String, Object> formation = RestTemplateMockHelper.formation(101L, "Java Advanced", "PLANIFIEE");
        formation.put("chargeHoraireGlobal", 20);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS, formation);
        stubNullBody(FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Des recommandations doivent être faites même sans liens de formation-competence");
    }

    @Test
    void testGetPrioriteValue_Branches() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);

        Map<String, Object> besoin1 = new HashMap<>();
        besoin1.put("competenceNom", "Java");
        besoin1.put("titre", "Formation Java");

        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS, repete(besoin1, 5).toArray());
        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertFalse(besoins.isEmpty(), "Des besoins doivent être détectés");
        assertEquals("haute", besoins.get(0).get("priorite"), "La priorité doit être haute pour count >= 5");

        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS, repete(besoin1, 2).toArray());
        result = analysePredictiveService.analyserEnseignant("ens1", null);
        besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertFalse(besoins.isEmpty(), "Des besoins doivent être détectés");
        assertEquals("moyenne", besoins.get(0).get("priorite"), "La priorité doit être moyenne pour count >= 2");

        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS, repete(besoin1, 1).toArray());
        result = analysePredictiveService.analyserEnseignant("ens1", null);
        besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertFalse(besoins.isEmpty(), "Des besoins doivent être détectés");
        assertEquals("faible", besoins.get(0).get("priorite"), "La priorité doit être faible pour count < 2");
    }

    @Test
    void testGetGraviteValue_Branches() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "DEBUTANT"));
        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Des gaps doivent être détectés");
        assertEquals("elevee", gaps.get(0).get("gravite"), "La gravité doit être élevée pour gap >= 3");

        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        result = analysePredictiveService.analyserEnseignant("ens1", null);
        gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Des gaps doivent être détectés");
        assertEquals("moyenne", gaps.get(0).get("gravite"), "La gravité doit être moyenne pour gap >= 2");

        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "CONFIRME"));
        result = analysePredictiveService.analyserEnseignant("ens1", null);
        gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Des gaps doivent être détectés");
        assertEquals("faible", gaps.get(0).get("gravite"), "La gravité doit être faible pour gap < 2");
    }

    @Test
    void testGetPrioriteOrder_Branches() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "DEBUTANT"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);

        Map<String, Object> besoin1 = new HashMap<>();
        besoin1.put("competenceNom", "Java");
        besoin1.put("titre", "Formation Java");

        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS, repete(besoin1, 5).toArray());
        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertFalse(besoins.isEmpty(), "Des besoins doivent être détectés");
        assertEquals("haute", besoins.get(0).get("priorite"), "La priorité doit être haute");

        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS, repete(besoin1, 2).toArray());
        result = analysePredictiveService.analyserEnseignant("ens1", null);
        besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertFalse(besoins.isEmpty(), "Des besoins doivent être détectés");
        assertEquals("moyenne", besoins.get(0).get("priorite"), "La priorité doit être moyenne");

        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS, repete(besoin1, 1).toArray());
        result = analysePredictiveService.analyserEnseignant("ens1", null);
        besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
        assertFalse(besoins.isEmpty(), "Des besoins doivent être détectés");
        assertEquals("faible", besoins.get(0).get("priorite"), "La priorité doit être faible");
    }

    @Test
    void testGetGraviteOrder_Branches() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES);
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "DEBUTANT"));
        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        List<Map<String, Object>> gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Des gaps doivent être détectés");
        assertEquals("elevee", gaps.get(0).get("gravite"), "La gravité doit être élevée");

        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        result = analysePredictiveService.analyserEnseignant("ens1", null);
        gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Des gaps doivent être détectés");
        assertEquals("moyenne", gaps.get(0).get("gravite"), "La gravité doit être moyenne");

        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "CONFIRME"));
        result = analysePredictiveService.analyserEnseignant("ens1", null);
        gaps = (List<Map<String, Object>>) result.get("gaps");
        assertFalse(gaps.isEmpty(), "Des gaps doivent être détectés");
        assertEquals("faible", gaps.get(0).get("gravite"), "La gravité doit être faible");
    }

    @Test
    void testProcessFormationRecommendation_WithNullCompetenceCiblees() {
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_ENSEIGNANT,
                RestTemplateMockHelper.affectation(1L, "Java", 1L, "DOM", "INITIE"));
        RestTemplateMockHelper.mockEndpoint(restTemplate, COMPETENCES_DOMAINE);
        Map<String, Object> formation = RestTemplateMockHelper.formation(101L, "Java Advanced", "PLANIFIEE");
        formation.put("chargeHoraireGlobal", 20);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATIONS, formation);
        RestTemplateMockHelper.mockEndpoint(restTemplate, FORMATION_COMPETENCES,
                RestTemplateMockHelper.formationCompetence(1L, null));
        RestTemplateMockHelper.mockEndpoint(restTemplate, BESOINS);

        Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
        assertNotNull(result);
        List<Map<String, Object>> recommandations = (List<Map<String, Object>>) result.get("recommandationsFormations");
        assertFalse(recommandations.isEmpty(), "Des recommandations doivent être faites même avec des noms de compétences null");
    }

    private List<Map<String, Object>> repete(Map<String, Object> b, int n) {
        List<Map<String, Object>> l = new ArrayList<>();
        for (int i = 0; i < n; i++) l.add(b);
        return l;
    }
}
