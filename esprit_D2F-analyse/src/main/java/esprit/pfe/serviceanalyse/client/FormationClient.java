package esprit.pfe.serviceanalyse.client;

import esprit.pfe.serviceanalyse.dto.integration.CompletionDto;
import esprit.pfe.serviceanalyse.exception.DownstreamServiceException;
import esprit.pfe.serviceanalyse.service.client.RestClientHelper;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

/** Typed client for the Formation service (training completion). */
@Slf4j
@Component
public class FormationClient {

    private final RestTemplate restTemplate;

    @Value("${services.formation.url}")
    private String baseUrl;

    public FormationClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @CircuitBreaker(name = "formation-cb", fallbackMethod = "down")
    @Retry(name = "formation-cb")
    public CompletionDto getTeacherCompletion(String teacherId, String bearerToken) {
        return RestClientHelper.getAuthenticated(restTemplate,
                baseUrl + "/api/formations/teacher/" + teacherId + "/completion", bearerToken, CompletionDto.class);
    }

    @SuppressWarnings("unused")
    private CompletionDto down(String teacherId, String bearerToken, Throwable t) {
        throw new DownstreamServiceException("formation", t);
    }
}
