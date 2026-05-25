
package esprit.pfe.serviceanalyse.service.client;

import esprit.pfe.serviceanalyse.dto.passport.DomainSummaryDTO;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;
import org.springframework.test.util.ReflectionTestUtils;

import java.util.*;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("CompetenceServiceClient - Tests")
class CompetenceServiceClientTest {

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private CompetenceServiceClient client;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(client, "competenceServiceUrl", "http://localhost:8005");
    }

    private Map<String, Object> aff(String domaineNom, String competenceNom, Long savoirId,
                                     String savoirCode, String savoirNom, String niveau,
                                     String sousCompetenceNom, String dateAcquisition) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("domaineNom", domaineNom);
        m.put("competenceNom", competenceNom);
        m.put("savoirId", savoirId);
        m.put("savoirCode", savoirCode);
        m.put("savoirNom", savoirNom);
        m.put("niveau", niveau);
        m.put("sousCompetenceNom", sousCompetenceNom);
        m.put("dateAcquisition", dateAcquisition);
        return m;
    }

    @Test
    @DisplayName("getDomainSummaries: retourne des domaines a partir des affectations")
    void getDomainSummaries_withAffectations_returnsDomains() {
        List<Map<String, Object>> affectations = List.of(
                aff("Informatique", "Java", 1L, "S-INF01", "Spring Boot", "N3_INTERMEDIAIRE", "Framework", "2025-01-15"),
                aff("Informatique", "Python", 2L, "SF-INF02", "Django", "N2_ELEMENTAIRE", null, "2025-03-01"),
                aff("Mathematiques", "Algebre", 3L, "SE-M01", "Resolution", "N4_AVANCE", "Calcul", "2024-06-10")
        );

        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(List.class)))
                .thenReturn(ResponseEntity.ok(affectations));

        List<DomainSummaryDTO> result = client.getDomainSummaries("user1", "Bearer token");

        assertThat(result).hasSize(2);
        assertThat(result.get(0).getNom()).isEqualTo("Informatique");
        assertThat(result.get(0).getCompetences()).hasSize(2);
        assertThat(result.get(0).getTotalSavoirs()).isEqualTo(2);
        assertThat(result.get(1).getNom()).isEqualTo("Mathematiques");
        assertThat(result.get(1).getTotalSavoirs()).isEqualTo(1);
    }

    @Test
    @DisplayName("getDomainSummaries: affectations vides retourne liste vide")
    void getDomainSummaries_withEmptyAffectations_returnsEmptyList() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(List.class)))
                .thenReturn(ResponseEntity.ok(Collections.emptyList()));

        List<DomainSummaryDTO> result = client.getDomainSummaries("user1", "Bearer token");

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("getDomainSummaries: réponse null retourne liste vide")
    void getDomainSummaries_withNullResponse_returnsEmptyList() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(List.class)))
                .thenReturn(ResponseEntity.ok(null));

        List<DomainSummaryDTO> result = client.getDomainSummaries("user1", "Bearer token");

        assertThat(result).isEmpty();
    }

    @Test
    @DisplayName("getDomainSummaries: niveau null utilise la valeur par défaut 1")
    void getDomainSummaries_withNullNiveau_usesDefault() {
        List<Map<String, Object>> affectations = List.of(
                aff("Test", "Comp", 1L, "S01", "Savoir1", null, null, "2025-01-01")
        );

        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(List.class)))
                .thenReturn(ResponseEntity.ok(affectations));

        List<DomainSummaryDTO> result = client.getDomainSummaries("user1", "Bearer token");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCompetences().get(0).getSavoirs().get(0).getNiveauNumeric()).isEqualTo(1);
    }

    @Test
    @DisplayName("getDomainSummaries: savoirCode SF infère SAVOIR_FAIRE")
    void getDomainSummaries_withSFCode_infersSavoirFaire() {
        List<Map<String, Object>> affectations = List.of(
                aff("D1", "C1", 1L, "SF-01", "Faire", "N2_ELEMENTAIRE", null, "2025-01-01")
        );

        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(List.class)))
                .thenReturn(ResponseEntity.ok(affectations));

        List<DomainSummaryDTO> result = client.getDomainSummaries("user1", "Bearer token");

        assertThat(result.get(0).getCompetences().get(0).getSavoirs().get(0).getType()).isEqualTo("SAVOIR_FAIRE");
    }

    @Test
    @DisplayName("getDomainSummaries: savoirCode SE infère SAVOIR_ETRE")
    void getDomainSummaries_withSECode_infersSavoirEtre() {
        List<Map<String, Object>> affectations = List.of(
                aff("D1", "C1", 1L, "SE-01", "Etre", "N5_EXPERT", null, "2025-01-01")
        );

        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(List.class)))
                .thenReturn(ResponseEntity.ok(affectations));

        List<DomainSummaryDTO> result = client.getDomainSummaries("user1", "Bearer token");

        assertThat(result.get(0).getCompetences().get(0).getSavoirs().get(0).getType()).isEqualTo("SAVOIR_ETRE");
    }



    @Test
    @DisplayName("getDomainSummaries: niveau N5 retourne niveauNumeric 5")
    void getDomainSummaries_withN5_returns5() {
        List<Map<String, Object>> affectations = List.of(
                aff("D1", "C1", 1L, "S01", "Expert", "N5_EXPERT", null, "2025-01-01")
        );

        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(List.class)))
                .thenReturn(ResponseEntity.ok(affectations));

        List<DomainSummaryDTO> result = client.getDomainSummaries("user1", "Bearer token");

        assertThat(result.get(0).getCompetences().get(0).getSavoirs().get(0).getNiveauNumeric()).isEqualTo(5);
        assertThat(result.get(0).getCompetences().get(0).getSavoirs().get(0).getNiveauLabel()).isEqualTo("N5 \u2013 Expert");
    }

    @Test
    @DisplayName("getDomainSummaries: dateAcquisition null retourne null")
    void getDomainSummaries_withNullDate_returnsNullDate() {
        List<Map<String, Object>> affectations = List.of(
                aff("D1", "C1", 1L, "S01", "S1", "N1_DEBUTANT", null, null)
        );

        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(List.class)))
                .thenReturn(ResponseEntity.ok(affectations));

        List<DomainSummaryDTO> result = client.getDomainSummaries("user1", "Bearer token");

        assertThat(result.get(0).getCompetences().get(0).getSavoirs().get(0).getDateAcquisition()).isNull();
    }
}
