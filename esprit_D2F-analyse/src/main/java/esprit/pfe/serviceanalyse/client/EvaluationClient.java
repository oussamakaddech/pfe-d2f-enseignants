package esprit.pfe.serviceanalyse.client;

import esprit.pfe.serviceanalyse.dto.integration.EvaluationDto;
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

/** Typed client for the Evaluation service. */
@Slf4j
@Component
public class EvaluationClient {

    private final RestTemplate restTemplate;

    @Value("${services.evaluation.url}")
    private String baseUrl;

    public EvaluationClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @CircuitBreaker(name = "evaluation-cb", fallbackMethod = "down")
    @Retry(name = "evaluation-cb")
    public List<EvaluationDto> getTeacherEvaluations(String teacherId, String bearerToken) {
        return RestClientHelper.getAuthenticated(new ParameterizedTypeReference<>() {}, restTemplate,
                baseUrl + "/api/evaluations/teacher/" + teacherId, bearerToken);
    }

    @SuppressWarnings("unused")
    private List<EvaluationDto> down(String teacherId, String bearerToken, Throwable t) {
        throw new DownstreamServiceException("evaluation", t);
    }
}
