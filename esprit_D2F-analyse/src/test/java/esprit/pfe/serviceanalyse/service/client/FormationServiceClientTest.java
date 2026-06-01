
package esprit.pfe.serviceanalyse.service.client;

import esprit.pfe.serviceanalyse.dto.passport.TrainingHistoryDTO;
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
@DisplayName("FormationServiceClient - Tests")
class FormationServiceClientTest {

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private FormationServiceClient client;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(client, "formationServiceUrl", "http://localhost:8088");
    }

    @Test
    @DisplayName("getFormationsForTeacher: inscriptions disponibles retourne formations mappées")
    void getFormations_withInscriptions_returnsMappedFormations() {
        List<Map<String, Object>> inscriptions = List.of(
                Map.of("formationId", "10", "titreFormation", "Spring Boot",
                        "dateDebut", "2025-01-01", "dateFin", "2025-03-01",
                        "chargeHoraire", "40", "etatFormation", "TERMINEE",
                        "competencesCiblees", List.of("Java", "Spring"))
        );

        when(restTemplate.exchange(contains("/inscription/"), eq(HttpMethod.GET), any(HttpEntity.class), eq(List.class)))
                .thenReturn(ResponseEntity.ok(inscriptions));

        List<TrainingHistoryDTO> result = client.getFormationsForTeacher("user1", "Bearer token");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitre()).isEqualTo("Spring Boot");
        assertThat(result.get(0).getDuree()).isEqualTo("40h");
        assertThat(result.get(0).getStatut()).isEqualTo("TERMINEE");
        assertThat(result.get(0).getCompetencesCiblees()).containsExactly("Java", "Spring");
    }

    @Test
    @DisplayName("getFormationsForTeacher: inscriptions vides fallback vers /formations")
    void getFormations_withEmptyInscriptions_fallbackToFormations() {
        List<Map<String, Object>> formations = List.of(
                Map.of("formationId", "20", "titreFormation", "Python",
                        "dateDebut", "2025-02-01", "dateFin", "2025-04-01",
                        "chargeHoraireGlobal", "30", "etatFormation", "EN_COURS")
        );

        when(restTemplate.exchange(contains("/inscription/"), eq(HttpMethod.GET), any(HttpEntity.class), eq(List.class)))
                .thenReturn(ResponseEntity.ok(Collections.emptyList()));
        when(restTemplate.exchange(contains("/formations"), eq(HttpMethod.GET), any(HttpEntity.class), eq(List.class)))
                .thenReturn(ResponseEntity.ok(formations));

        List<TrainingHistoryDTO> result = client.getFormationsForTeacher("user1", "Bearer token");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitre()).isEqualTo("Python");
        assertThat(result.get(0).getCompetencesCiblees()).isEmpty();
    }

    @Test
    @DisplayName("getFormationsForTeacher: endpoint inscription en erreur fallback vers /formations")
    void getFormations_withInscriptionError_fallbackToFormations() {
        List<Map<String, Object>> formations = List.of(
                Map.of("formationId", "30", "titreFormation", "DevOps",
                        "dateDebut", "2025-03-01", "dateFin", "2025-05-01",
                        "chargeHoraireGlobal", "20", "etatFormation", "PLANIFIEE")
        );

        when(restTemplate.exchange(contains("/inscription/"), eq(HttpMethod.GET), any(HttpEntity.class), eq(List.class)))
                .thenThrow(new RuntimeException("Connection refused"));
        when(restTemplate.exchange(contains("/formations"), eq(HttpMethod.GET), any(HttpEntity.class), eq(List.class)))
                .thenReturn(ResponseEntity.ok(formations));

        List<TrainingHistoryDTO> result = client.getFormationsForTeacher("user1", "Bearer token");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitre()).isEqualTo("DevOps");
    }

    @Test
    @DisplayName("getFormationsForTeacher: formations ANNULEE sont exclues")
    void getFormations_withAnnulee_excludesThem() {
        List<Map<String, Object>> formations = List.of(
                Map.of("formationId", "40", "titreFormation", "Cancelled",
                        "dateDebut", "2025-01-01", "dateFin", "2025-02-01",
                        "chargeHoraireGlobal", "10", "etatFormation", "ANNULEE"),
                Map.of("formationId", "41", "titreFormation", "Active",
                        "dateDebut", "2025-01-01", "dateFin", "2025-02-01",
                        "chargeHoraireGlobal", "15", "etatFormation", "EN_COURS")
        );

        when(restTemplate.exchange(contains("/inscription/"), eq(HttpMethod.GET), any(HttpEntity.class), eq(List.class)))
                .thenThrow(new RuntimeException("Error"));
        when(restTemplate.exchange(contains("/formations"), eq(HttpMethod.GET), any(HttpEntity.class), eq(List.class)))
                .thenReturn(ResponseEntity.ok(formations));

        List<TrainingHistoryDTO> result = client.getFormationsForTeacher("user1", "Bearer token");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getTitre()).isEqualTo("Active");
    }

    @Test
    @DisplayName("getFormationsForTeacher: réponse null retourne liste vide")
    void getFormations_withNullResponse_returnsEmptyList() {
        when(restTemplate.exchange(contains("/inscription/"), eq(HttpMethod.GET), any(HttpEntity.class), eq(List.class)))
                .thenThrow(new RuntimeException("Error"));
        when(restTemplate.exchange(contains("/formations"), eq(HttpMethod.GET), any(HttpEntity.class), eq(List.class)))
                .thenReturn(ResponseEntity.ok(null));

        List<TrainingHistoryDTO> result = client.getFormationsForTeacher("user1", "Bearer token");

        assertThat(result).isEmpty();
    }



    @Test
    @DisplayName("getFormationsForTeacher: competencesCiblees non-List retourne liste vide")
    void getFormations_withNonListCompetences_returnsEmptyCompetences() {
        List<Map<String, Object>> inscriptions = List.of(
                Map.of("formationId", "10", "titreFormation", "Test",
                        "dateDebut", "2025-01-01", "dateFin", "2025-02-01",
                        "chargeHoraire", "10", "etatFormation", "TERMINEE",
                        "competencesCiblees", "not-a-list")
        );

        when(restTemplate.exchange(contains("/inscription/"), eq(HttpMethod.GET), any(HttpEntity.class), eq(List.class)))
                .thenReturn(ResponseEntity.ok(inscriptions));

        List<TrainingHistoryDTO> result = client.getFormationsForTeacher("user1", "Bearer token");

        assertThat(result).hasSize(1);
        assertThat(result.get(0).getCompetencesCiblees()).isEmpty();
    }
}
