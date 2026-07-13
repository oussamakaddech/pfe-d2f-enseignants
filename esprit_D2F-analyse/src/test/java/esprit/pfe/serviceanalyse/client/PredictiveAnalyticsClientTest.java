package esprit.pfe.serviceanalyse.client;

import esprit.pfe.serviceanalyse.exception.PredictiveAnalyticsUnavailableException;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpMethod;
import org.springframework.test.context.TestPropertySource;
import org.springframework.web.client.ResourceAccessException;
import org.springframework.web.client.RestTemplate;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.when;

/**
 * Verifies the core resilience guarantee: when the FastAPI engine is unreachable,
 * the typed client surfaces a {@link PredictiveAnalyticsUnavailableException}
 * (HTTP 502) — it NEVER returns a silent empty body hiding the outage.
 */
@SpringBootTest
@TestPropertySource(locations = "classpath:application-test.properties")
class PredictiveAnalyticsClientTest {

    @Autowired
    private PredictiveAnalyticsClient client;

    @MockBean
    private RestTemplate restTemplate;

    @Test
    void upstreamOutageIsLoudNotSilent() {
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), any(Class.class)))
                .thenThrow(new ResourceAccessException("connection refused"));

        assertThrows(PredictiveAnalyticsUnavailableException.class,
                () -> client.getDashboardOverview(null, "Bearer x"));
    }

    @Test
    void upstreamOutageOnProfileIsLoud() {
        when(restTemplate.exchange(anyString(), any(HttpMethod.class), any(HttpEntity.class), any(Class.class)))
                .thenThrow(new ResourceAccessException("connection refused"));

        assertThrows(PredictiveAnalyticsUnavailableException.class,
                () -> client.getTeacherProfile("T1", "Bearer x"));
    }
}
