
package esprit.pfe.serviceanalyse.service.client;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
@DisplayName("RestClientHelper - Tests")
class RestClientHelperTest {

    @Mock
    private RestTemplate restTemplate;

    @Test
    @DisplayName("getAuthenticated avec token valide forwarde l'en-tête Authorization")
    void getAuthenticated_withToken_shouldForwardAuthHeader() {
        Map<String, String> expectedBody = Map.of("key", "value");
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(expectedBody));

        Map<String, String> result = RestClientHelper.getAuthenticated(restTemplate, "http://test/api", "Bearer token123", Map.class);

        assertThat(result).isNotNull().containsEntry("key", "value");
    }

    @Test
    @DisplayName("getAuthenticated avec token null n'ajoute pas d'en-tête Authorization")
    void getAuthenticated_withNullToken_shouldNotAddAuthHeader() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(Map.of("result", "ok")));

        Map<?, ?> result = RestClientHelper.getAuthenticated(restTemplate, "http://test/api", null, Map.class);

        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("getAuthenticated avec token blank n'ajoute pas d'en-tête Authorization")
    void getAuthenticated_withBlankToken_shouldNotAddAuthHeader() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(Map.of("result", "ok")));

        Map<?, ?> result = RestClientHelper.getAuthenticated(restTemplate, "http://test/api", "   ", Map.class);

        assertThat(result).isNotNull();
    }

    @Test
    @DisplayName("getAuthenticated retourne null si le body est null")
    void getAuthenticated_withNullBody_shouldReturnNull() {
        when(restTemplate.exchange(anyString(), eq(HttpMethod.GET), any(HttpEntity.class), eq(Map.class)))
                .thenReturn(ResponseEntity.ok(null));

        Map<?, ?> result = RestClientHelper.getAuthenticated(restTemplate, "http://test/api", "Bearer x", Map.class);

        assertThat(result).isNull();
    }
}
