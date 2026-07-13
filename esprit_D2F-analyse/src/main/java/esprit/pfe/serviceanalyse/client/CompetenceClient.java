package esprit.pfe.serviceanalyse.client;

import esprit.pfe.serviceanalyse.dto.integration.CompetenceDto;
import esprit.pfe.serviceanalyse.exception.DownstreamServiceException;
import esprit.pfe.serviceanalyse.service.client.RestClientHelper;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

import java.util.List;

/** Typed client for the Competence service. */
@Slf4j
@Component
public class CompetenceClient {

    private final RestTemplate restTemplate;

    @Value("${services.competence.url}")
    private String baseUrl;

    public CompetenceClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @CircuitBreaker(name = "competence-cb", fallbackMethod = "down")
    @Retry(name = "competence-cb")
    public List<CompetenceDto> getTeacherCompetencies(String teacherId, String bearerToken) {
        return RestClientHelper.getAuthenticated(new ParameterizedTypeReference<>() {}, restTemplate,
                baseUrl + "/api/competences/teacher/" + teacherId, bearerToken);
    }

    @SuppressWarnings("unused")
    private List<CompetenceDto> down(String teacherId, String bearerToken, Throwable t) {
        throw new DownstreamServiceException("competence", t);
    }
}
