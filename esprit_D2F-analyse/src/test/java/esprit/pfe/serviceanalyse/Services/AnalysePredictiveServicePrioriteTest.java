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
class AnalysePredictiveServicePrioriteTest {

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
        void testGetPrioriteOrder_WithHighPriority() {
                // Test with high priority
                Map<String, Object> comp = new HashMap<>();
                comp.put("id", 1);
                comp.put("nom", "Java");
                Map<String, Object> aff = new HashMap<>();
                aff.put("competence", comp);
                aff.put("niveauMaitrise", 2);

                Map<String, Object> besoin = new HashMap<>();
                besoin.put("competence", "Java");
                besoin.put("titre", "Formation Java");

                when(restTemplate.getForObject(anyString(), any(Class.class)))
                                .thenReturn(List.of(aff));
                when(restTemplate.getForObject(anyString(), any(Class.class)))
                                .thenReturn(Collections.emptyList());
                when(restTemplate.getForObject(anyString(), any(Class.class)))
                                .thenReturn(Collections.emptyList());
                when(restTemplate.getForObject(anyString(), any(Class.class)))
                                .thenReturn(List.of(besoin, besoin, besoin, besoin, besoin)); // 5 besoins -> haute
                                                                                              // priorité

                Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
                assertNotNull(result);
                List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
                assertFalse(besoins.isEmpty(), "Les besoins doivent être détectés");
                assertEquals("haute", besoins.get(0).get("priorite"), "La priorité doit être haute pour count >= 5");
        }

        @Test
        void testGetPrioriteOrder_WithMediumPriority() {
                // Test with medium priority
                Map<String, Object> comp = new HashMap<>();
                comp.put("id", 1);
                comp.put("nom", "Java");
                Map<String, Object> aff = new HashMap<>();
                aff.put("competence", comp);
                aff.put("niveauMaitrise", 2);

                Map<String, Object> besoin = new HashMap<>();
                besoin.put("competence", "Java");
                besoin.put("titre", "Formation Java");

                when(restTemplate.getForObject(anyString(), any(Class.class)))
                                .thenReturn(List.of(aff));
                when(restTemplate.getForObject(anyString(), any(Class.class)))
                                .thenReturn(Collections.emptyList());
                when(restTemplate.getForObject(anyString(), any(Class.class)))
                                .thenReturn(Collections.emptyList());
                when(restTemplate.getForObject(anyString(), any(Class.class)))
                                .thenReturn(List.of(besoin, besoin)); // 2 besoins -> moyenne priorité

                Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
                assertNotNull(result);
                List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
                assertFalse(besoins.isEmpty(), "Les besoins doivent être détectés");
                assertEquals("moyenne", besoins.get(0).get("priorite"),
                                "La priorité doit être moyenne pour 2 <= count < 5");
        }

        @Test
        void testGetPrioriteOrder_WithLowPriority() {
                // Test with low priority
                Map<String, Object> comp = new HashMap<>();
                comp.put("id", 1);
                comp.put("nom", "Java");
                Map<String, Object> aff = new HashMap<>();
                aff.put("competence", comp);
                aff.put("niveauMaitrise", 2);

                Map<String, Object> besoin = new HashMap<>();
                besoin.put("competence", "Java");
                besoin.put("titre", "Formation Java");

                when(restTemplate.getForObject(anyString(), any(Class.class)))
                                .thenReturn(List.of(aff));
                when(restTemplate.getForObject(anyString(), any(Class.class)))
                                .thenReturn(Collections.emptyList());
                when(restTemplate.getForObject(anyString(), any(Class.class)))
                                .thenReturn(Collections.emptyList());
                when(restTemplate.getForObject(anyString(), any(Class.class)))
                                .thenReturn(List.of(besoin)); // 1 besoin -> faible priorité

                Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
                assertNotNull(result);
                List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
                assertFalse(besoins.isEmpty(), "Les besoins doivent être détectés");
                assertEquals("faible", besoins.get(0).get("priorite"), "La priorité doit être faible pour count < 2");
        }

        @Test
        void testGetPrioriteOrder_WithMultiplePriorities() {
                // Test with multiple priorities (should be sorted by priority)
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

                Map<String, Object> besoin3 = new HashMap<>();
                besoin3.put("competence", "JavaScript");
                besoin3.put("titre", "Formation JavaScript");

                when(restTemplate.getForObject(anyString(), any(Class.class)))
                                .thenReturn(List.of(aff));
                when(restTemplate.getForObject(anyString(), any(Class.class)))
                                .thenReturn(Collections.emptyList());
                when(restTemplate.getForObject(anyString(), any(Class.class)))
                                .thenReturn(Collections.emptyList());
                when(restTemplate.getForObject(anyString(), any(Class.class)))
                                .thenReturn(List.of(besoin1, besoin1, besoin1, besoin1, besoin1, besoin2, besoin2,
                                                besoin3)); // 5 Java
                                                           // (haute),
                                                           // 2
                                                           // Python
                                                           // (moyenne),
                                                           // 1
                                                           // JavaScript
                                                           // (faible)

                Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
                assertNotNull(result);
                List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
                assertEquals(3, besoins.size(), "Trois types de besoins doivent être détectés");
                assertEquals("haute", besoins.get(0).get("priorite"),
                                "Le premier besoin doit avoir une priorité haute");
                assertEquals("moyenne", besoins.get(1).get("priorite"),
                                "Le deuxième besoin doit avoir une priorité moyenne");
                assertEquals("faible", besoins.get(2).get("priorite"),
                                "Le troisième besoin doit avoir une priorité faible");
        }

        @Test
        void testGetPrioriteOrder_WithUnknownPriority() {
                // Test with unknown priority
                Map<String, Object> comp = new HashMap<>();
                comp.put("id", 1);
                comp.put("nom", "Java");
                Map<String, Object> aff = new HashMap<>();
                aff.put("competence", comp);
                aff.put("niveauMaitrise", 1); // High gap

                when(restTemplate.getForObject(anyString(), any(Class.class)))
                                .thenReturn(List.of(aff));
                when(restTemplate.getForObject(anyString(), any(Class.class)))
                                .thenReturn(Collections.emptyList());
                when(restTemplate.getForObject(anyString(), any(Class.class)))
                                .thenReturn(Collections.emptyList());
                when(restTemplate.getForObject(anyString(), any(Class.class)))
                                .thenThrow(new RuntimeException("Service down"));
                when(restTemplate.getForObject(anyString(), any(Class.class)))
                                .thenReturn(List.of(aff));

                Map<String, Object> result = analysePredictiveService.analyserEnseignant("ens1", null);
                assertNotNull(result);
                List<Map<String, Object>> besoins = (List<Map<String, Object>>) result.get("besoinsDetectes");
                assertFalse(besoins.isEmpty(), "Les besoins doivent être détectés via le fallback des gaps");
                assertEquals("faible", besoins.get(0).get("priorite"),
                                "La priorité doit correspondre au besoin détecté");
        }
}
