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
}
