package esprit.pfe.serviceanalyse.service.client;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.ArgumentCaptor;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.client.RestTemplate;

import java.util.List;
import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("PredictiveEngineClient - Tests")
class PredictiveEngineClientTest {

    @Mock
    private RestTemplate restTemplate;

    @InjectMocks
    private PredictiveEngineClient client;

    @BeforeEach
    void setUp() {
        ReflectionTestUtils.setField(client, "predictiveServiceUrl", "http://localhost:8090");
    }

    @Test
    @DisplayName("getOverview: retourne le corps désérialisé")
    void getOverview_returnsBody() {
        Map<String, Object> body = Map.of("nb_enseignants_suivis", 12, "score_risque_moyen", 0.4);
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(body));

        Map<String, Object> result = client.getOverview("Bearer t");

        assertThat(result).containsEntry("nb_enseignants_suivis", 12);
    }

    @Test
    @DisplayName("getOverview: corps null retourne map vide")
    void getOverview_nullBody_returnsEmpty() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(null));

        assertThat(client.getOverview("Bearer t")).isEmpty();
    }

    @Test
    @DisplayName("getPriorityActions: liste mappée + département encodé dans l'URL")
    void getPriorityActions_buildsUrlWithDept() {
        List<Map<String, Object>> actions = List.of(Map.of("enseignant_id", "t1", "score_action", 0.8));
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Object.class)))
                .thenReturn(ResponseEntity.ok(actions));

        List<Map<String, Object>> result = client.getPriorityActions(10, "DEPT 1", "Bearer t");

        assertThat(result).hasSize(1);
        ArgumentCaptor<String> urlCaptor = ArgumentCaptor.forClass(String.class);
        verify(restTemplate).exchange(urlCaptor.capture(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Object.class));
        assertThat(urlCaptor.getValue())
                .contains("/actions/priority?limit=10")
                .contains("departement_id=DEPT+1");
    }

    @Test
    @DisplayName("getDemandForecast: URL paramétrée par months")
    void getDemandForecast_buildsUrl() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(Map.of("method", "ewma+linear")));

        Map<String, Object> result = client.getDemandForecast(9, "Bearer t");

        assertThat(result).containsEntry("method", "ewma+linear");
        ArgumentCaptor<String> urlCaptor = ArgumentCaptor.forClass(String.class);
        verify(restTemplate).exchange(urlCaptor.capture(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class));
        assertThat(urlCaptor.getValue()).contains("/dashboard/demand-forecast?months=9");
    }
}
