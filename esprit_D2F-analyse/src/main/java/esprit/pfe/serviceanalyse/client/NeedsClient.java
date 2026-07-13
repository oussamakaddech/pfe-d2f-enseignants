package esprit.pfe.serviceanalyse.client;

import esprit.pfe.serviceanalyse.dto.integration.NeedsSummaryDto;
import esprit.pfe.serviceanalyse.exception.DownstreamServiceException;
import esprit.pfe.serviceanalyse.service.client.RestClientHelper;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

/** Typed client for the Besoin-Formation service. */
@Slf4j
@Component
public class NeedsClient {

    private final RestTemplate restTemplate;

    @Value("${services.besoin-formation.url}")
    private String baseUrl;

    public NeedsClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @CircuitBreaker(name = "besoin-cb", fallbackMethod = "down")
    @Retry(name = "besoin-cb")
    public NeedsSummaryDto getTeacherNeedsSummary(String teacherId, String bearerToken) {
        return RestClientHelper.getAuthenticated(restTemplate,
                baseUrl + "/api/besoins/teacher/" + teacherId + "/summary", bearerToken, NeedsSummaryDto.class);
    }

    @SuppressWarnings("unused")
    private NeedsSummaryDto down(String teacherId, String bearerToken, Throwable t) {
        throw new DownstreamServiceException("besoin-formation", t);
    }
}
