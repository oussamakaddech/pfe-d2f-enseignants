package esprit.pfe.serviceanalyse.client;

import esprit.pfe.serviceanalyse.dto.integration.TeacherIdentityDto;
import esprit.pfe.serviceanalyse.exception.DownstreamServiceException;
import esprit.pfe.serviceanalyse.service.client.RestClientHelper;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;

/** Typed client for the Auth service (teacher identity / department). */
@Slf4j
@Component
public class AuthClient {

    private final RestTemplate restTemplate;

    @Value("${services.auth.url}")
    private String baseUrl;

    public AuthClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    @CircuitBreaker(name = "auth-cb", fallbackMethod = "down")
    @Retry(name = "auth-cb")
    public TeacherIdentityDto getTeacherIdentity(String teacherId, String bearerToken) {
        return RestClientHelper.getAuthenticated(restTemplate, baseUrl + "/api/users/" + teacherId, bearerToken, TeacherIdentityDto.class);
    }

    @SuppressWarnings("unused")
    private TeacherIdentityDto down(String teacherId, String bearerToken, Throwable t) {
        throw new DownstreamServiceException("auth", t);
    }
}
