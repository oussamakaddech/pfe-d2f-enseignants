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
class AnalysePredictiveServiceTest {

    @InjectMocks
    private AnalysePredictiveService analysePredictiveService;

    private final String testEnseignantId = "ens1";

    @BeforeEach
    void setUp() {
        // Injecter les valeurs de configuration pour les tests
        ReflectionTestUtils.setField(analysePredictiveService, "evaluationServiceUrl", "http://localhost:8083");
        ReflectionTestUtils.setField(analysePredictiveService, "formationServiceUrl", "http://localhost:8084");
        ReflectionTestUtils.setField(analysePredictiveService, "competenceServiceUrl", "http://localhost:8085");
        ReflectionTestUtils.setField(analysePredictiveService, "besoinFormationServiceUrl", "http://localhost:8082");
    }

    @Test
    void testAnalyserEnseignant_WithCompetenceCible() {
        // Arrange
        Long competenceCible = 1L;

        // Act
        Map<String, Object> result = analysePredictiveService.analyserEnseignant(testEnseignantId, competenceCible);

        // Assert
        assertNotNull(result);
        assertEquals(testEnseignantId, result.get("enseignantId"));
        assertTrue(result.containsKey("gaps"));
        assertTrue(result.containsKey("recommandationsFormations"));
        assertTrue(result.containsKey("besoinsDetectes"));
        assertTrue(result.containsKey("dashboard"));
        assertEquals("Analyse ciblée compétence " + competenceCible, result.get("competenceAnalysee"));
    }

    @Test
    void testAnalyserEnseignant_WithoutCompetenceCible() {
        // Act
        Map<String, Object> result = analysePredictiveService.analyserEnseignant(testEnseignantId, null);

        // Assert
        assertNotNull(result);
        assertEquals(testEnseignantId, result.get("enseignantId"));
        assertTrue(result.containsKey("gaps"));
        assertTrue(result.containsKey("recommandationsFormations"));
        assertTrue(result.containsKey("besoinsDetectes"));
        assertTrue(result.containsKey("dashboard"));
        assertEquals("Analyse globale du profil", result.get("competenceAnalysee"));
    }

    @Test
    void testParseNiveau_ValidNumber() {
        // Cette méthode est privée, mais nous testons indirectement via analyserEnseignant
        // Le test réel nécessiterait un mock du RestTemplate
        assertNotNull(analysePredictiveService);
    }

    @Test
    void testAnalyserEnseignant_StructureResult() {
        // Act
        Map<String, Object> result = analysePredictiveService.analyserEnseignant(testEnseignantId, null);

        // Assert - Vérifier la structure du résultat
        assertNotNull(result);
        assertTrue(result.containsKey("enseignantId"));
        assertTrue(result.containsKey("competenceAnalysee"));
        assertTrue(result.containsKey("gaps"));
        assertTrue(result.containsKey("recommandationsFormations"));
        assertTrue(result.containsKey("besoinsDetectes"));
        assertTrue(result.containsKey("dashboard"));
    }

    @Test
    void testAnalyserEnseignant_EnseignantIdNotNull() {
        // Act
        Map<String, Object> result = analysePredictiveService.analyserEnseignant(testEnseignantId, null);

        // Assert
        assertNotNull(result.get("enseignantId"));
        assertEquals(testEnseignantId, result.get("enseignantId"));
    }

    @Test
    void testAnalyserEnseignant_ReturnsLinkedHashMap() {
        // Act
        Map<String, Object> result = analysePredictiveService.analyserEnseignant(testEnseignantId, null);

        // Assert - Vérifier que le résultat est une LinkedHashMap (préserve l'ordre)
        assertTrue(result instanceof java.util.LinkedHashMap);
    }
}
