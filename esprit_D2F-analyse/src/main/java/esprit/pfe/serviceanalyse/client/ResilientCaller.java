package esprit.pfe.serviceanalyse.client;

import esprit.pfe.serviceanalyse.exception.PredictiveAnalyticsUnavailableException;
import esprit.pfe.serviceanalyse.service.client.RestClientHelper;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestClientException;
import org.springframework.web.client.RestTemplate;

/**
 * Resilient executor for calls toward the FastAPI Predictive Analytics engine.
 *
 * <p>Extracted as a standalone Spring bean so that the {@link CircuitBreaker} /
 * {@link Retry} aspects are applied on a <b>cross-bean</b> invocation (which
 * Spring's proxy-based AOP intercepts). Annotating the private helpers inside
 * {@link PredictiveAnalyticsClient} never worked because those are reached via
 * self-invocation, which bypasses the proxy.</p>
 *
 * <p>Every fallback is loud: a downstream outage throws
 * {@link PredictiveAnalyticsUnavailableException} (HTTP 502) instead of a silent
 * empty body.</p>
 */
@Component
public class ResilientCaller {

    @CircuitBreaker(name = "predictive-v2-cb", fallbackMethod = "fallbackClass")
    @Retry(name = "predictive-v2-retry")
    public <T> T get(String url, String bearerToken, RestTemplate restTemplate, Class<T> type) {
        try {
            return RestClientHelper.getAuthenticated(restTemplate, url, bearerToken, type);
        } catch (RestClientException ex) {
            throw new PredictiveAnalyticsUnavailableException(ex);
        }
    }

    @CircuitBreaker(name = "predictive-v2-cb", fallbackMethod = "fallbackRef")
    @Retry(name = "predictive-v2-retry")
    public <T> T get(String url, String bearerToken, RestTemplate restTemplate, ParameterizedTypeReference<T> ref) {
        try {
            return RestClientHelper.getAuthenticated(ref, restTemplate, url, bearerToken);
        } catch (RestClientException ex) {
            throw new PredictiveAnalyticsUnavailableException(ex);
        }
    }

    @CircuitBreaker(name = "predictive-v2-cb", fallbackMethod = "fallbackPost")
    @Retry(name = "predictive-v2-retry")
    public <T> T post(String url, String bearerToken, RestTemplate restTemplate, Object body, Class<T> type) {
        try {
            return RestClientHelper.postAuthenticated(restTemplate, url, bearerToken, body, type);
        } catch (RestClientException ex) {
            throw new PredictiveAnalyticsUnavailableException(ex);
        }
    }

    @CircuitBreaker(name = "predictive-v2-cb", fallbackMethod = "fallbackPatch")
    @Retry(name = "predictive-v2-retry")
    public <T> T patch(String url, String bearerToken, RestTemplate restTemplate, Object body, Class<T> type) {
        try {
            return RestClientHelper.patchAuthenticated(restTemplate, url, bearerToken, body, type);
        } catch (RestClientException ex) {
            throw new PredictiveAnalyticsUnavailableException(ex);
        }
    }

    @SuppressWarnings("unused")
    private <T> T fallbackClass(String url, String bearerToken, RestTemplate restTemplate, Class<T> type, Throwable t) {
        throw new PredictiveAnalyticsUnavailableException(t);
    }

    @SuppressWarnings("unused")
    private <T> T fallbackRef(String url, String bearerToken, RestTemplate restTemplate, ParameterizedTypeReference<T> ref, Throwable t) {
        throw new PredictiveAnalyticsUnavailableException(t);
    }

    @SuppressWarnings("unused")
    private <T> T fallbackPost(String url, String bearerToken, RestTemplate restTemplate, Object body, Class<T> type, Throwable t) {
        throw new PredictiveAnalyticsUnavailableException(t);
    }

    @SuppressWarnings("unused")
    private <T> T fallbackPatch(String url, String bearerToken, RestTemplate restTemplate, Object body, Class<T> type, Throwable t) {
        throw new PredictiveAnalyticsUnavailableException(t);
    }
}
