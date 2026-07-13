package esprit.pfe.serviceanalyse.client;

import esprit.pfe.serviceanalyse.dto.analytics.*;
import esprit.pfe.serviceanalyse.exception.PredictiveAnalyticsUnavailableException;
import esprit.pfe.serviceanalyse.service.client.RestClientHelper;
import io.github.resilience4j.circuitbreaker.annotation.CircuitBreaker;
import io.github.resilience4j.retry.annotation.Retry;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.http.*;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.List;

/**
 * Typed client (V2) toward the FastAPI Predictive Analytics engine.
 *
 * <p>Every call is protected by a CircuitBreaker + Retry, and the RestTemplate
 * carries connect/read timeouts (the "timeout" leg of the resilience triad).
 * <b>Fallbacks are loud</b>: a downstream outage throws
 * {@link PredictiveAnalyticsUnavailableException} (mapped to HTTP 502) instead of
 * returning a silent empty body — a critical upstream outage must never be hidden.</p>
 *
 * <p>Partial data is represented honestly through the typed DTOs themselves
 * (e.g. {@link CoverageDto#status()} == INSUFFICIENT_DATA with a {@code null}
 * percentage), not by the fallback layer.</p>
 */
@Slf4j
@Component
public class PredictiveAnalyticsClient {

    private static final String V2_BASE = "/api/v2/analytics";

    private final RestTemplate restTemplate;

    @Value("${services.predictive.url}")
    private String predictiveServiceUrl;

    public PredictiveAnalyticsClient(RestTemplate restTemplate) {
        this.restTemplate = restTemplate;
    }

    // ── Reads ────────────────────────────────────────────────────────────

    public DashboardOverviewDto getDashboardOverview(String departmentId, String bearerToken) {
        return getInternal(buildUrl(V2_BASE + "/dashboard/overview", departmentId), bearerToken, DashboardOverviewDto.class);
    }

    public List<RiskDistributionItemDto> getRiskDistribution(String departmentId, String bearerToken) {
        return getInternal(buildUrl(V2_BASE + "/dashboard/risk-distribution", departmentId), bearerToken,
                new ParameterizedTypeReference<>() {});
    }

    public GapHeatmapDto getGapHeatmap(String departmentId, String bearerToken) {
        return getInternal(buildUrl(V2_BASE + "/dashboard/gap-heatmap", departmentId), bearerToken, GapHeatmapDto.class);
    }

    public DemandForecastDto getDemandForecast(int months, String bearerToken) {
        String url = predictiveServiceUrl + V2_BASE + "/dashboard/demand-forecast?months=" + months;
        return getInternal(url, bearerToken, DemandForecastDto.class);
    }

    public ModelHealthDto getModelHealth(String bearerToken) {
        return getInternal(predictiveServiceUrl + V2_BASE + "/model/health", bearerToken, ModelHealthDto.class);
    }

    public TeacherRiskProfileDto getTeacherProfile(String teacherId, String bearerToken) {
        return getInternal(predictiveServiceUrl + V2_BASE + "/teachers/" + teacherId + "/profile",
                bearerToken, TeacherRiskProfileDto.class);
    }

    public PageDto<TeacherRiskProfileDto> getTeachers(String departmentId, String level, int page, int size, String bearerToken) {
        UriComponentsBuilder b = UriComponentsBuilder.fromHttpUrl(predictiveServiceUrl + V2_BASE + "/teachers")
                .queryParam("page", page).queryParam("size", size);
        if (departmentId != null) b.queryParam("department_id", departmentId);
        if (level != null) b.queryParam("level", level);
        return getInternal(b.toUriString(), bearerToken, new ParameterizedTypeReference<>() {});
    }

    public PageDto<AlertDto> getAlerts(String status, String departmentId, int page, int size, String bearerToken) {
        UriComponentsBuilder b = UriComponentsBuilder.fromHttpUrl(predictiveServiceUrl + V2_BASE + "/alerts")
                .queryParam("page", page).queryParam("size", size);
        if (status != null) b.queryParam("status", status);
        if (departmentId != null) b.queryParam("department_id", departmentId);
        return getInternal(b.toUriString(), bearerToken, new ParameterizedTypeReference<>() {});
    }

    public PageDto<PriorityActionDto> getPriorityActions(String departmentId, int page, int size, String bearerToken) {
        UriComponentsBuilder b = UriComponentsBuilder.fromHttpUrl(predictiveServiceUrl + V2_BASE + "/actions/priority")
                .queryParam("page", page).queryParam("size", size);
        if (departmentId != null) b.queryParam("department_id", departmentId);
        return getInternal(b.toUriString(), bearerToken, new ParameterizedTypeReference<>() {});
    }

    public JobDto getJob(String jobId, String bearerToken) {
        return getInternal(predictiveServiceUrl + V2_BASE + "/jobs/" + jobId, bearerToken, JobDto.class);
    }

    // ── Writes ─────────────────────────────────────────────────────────────

    public JobDto analyzeTeacher(String teacherId, String bearerToken) {
        return postInternal(predictiveServiceUrl + V2_BASE + "/teachers/" + teacherId + "/analyze",
                bearerToken, null, JobDto.class);
    }

    public AlertDto patchAlert(String alertId, AlertPatchDto body, String bearerToken) {
        return patchInternal(predictiveServiceUrl + V2_BASE + "/alerts/" + alertId,
                bearerToken, body, AlertDto.class);
    }

    public int bulkPatchAlerts(BulkAlertPatchDto body, String bearerToken) {
        MapCountDto dto = patchInternal(predictiveServiceUrl + V2_BASE + "/alerts/bulk",
                bearerToken, body, MapCountDto.class);
        return dto == null ? 0 : dto.updated();
    }

    public PriorityActionDto patchAction(String actionId, ActionPatchDto body, String bearerToken) {
        return patchInternal(predictiveServiceUrl + V2_BASE + "/actions/" + actionId,
                bearerToken, body, PriorityActionDto.class);
    }

    public ModelHealthDto retrain(RetrainRequestDto body, String bearerToken) {
        return postInternal(predictiveServiceUrl + V2_BASE + "/model/retrain", bearerToken, body, ModelHealthDto.class);
    }

    // ── Resilience core (single fallback each) ─────────────────────────────

    @CircuitBreaker(name = "predictive-v2-cb", fallbackMethod = "typedFallback")
    @Retry(name = "predictive-v2-retry")
    private <T> T getInternal(String url, String bearerToken, Class<T> type) {
        return RestClientHelper.getAuthenticated(restTemplate, url, bearerToken, type);
    }

    @CircuitBreaker(name = "predictive-v2-cb", fallbackMethod = "typedFallback")
    @Retry(name = "predictive-v2-retry")
    private <T> T getInternal(String url, String bearerToken, ParameterizedTypeReference<T> ref) {
        return RestClientHelper.getAuthenticated(ref, restTemplate, url, bearerToken);
    }

    @CircuitBreaker(name = "predictive-v2-cb", fallbackMethod = "typedFallback")
    @Retry(name = "predictive-v2-retry")
    private <T> T postInternal(String url, String bearerToken, Object body, Class<T> type) {
        return RestClientHelper.postAuthenticated(restTemplate, url, bearerToken, body, type);
    }

    @CircuitBreaker(name = "predictive-v2-cb", fallbackMethod = "typedFallback")
    @Retry(name = "predictive-v2-retry")
    private <T> T patchInternal(String url, String bearerToken, Object body, Class<T> type) {
        return RestClientHelper.patchAuthenticated(restTemplate, url, bearerToken, body, type);
    }

    @SuppressWarnings("unused")
    private <T> T typedFallback(String url, String bearerToken, Class<T> type, Throwable t) {
        throw new PredictiveAnalyticsUnavailableException(t);
    }

    @SuppressWarnings("unused")
    private <T> T typedFallback(String url, String bearerToken, ParameterizedTypeReference<T> ref, Throwable t) {
        throw new PredictiveAnalyticsUnavailableException(t);
    }

    @SuppressWarnings("unused")
    private <T> T typedFallback(String url, String bearerToken, Object body, Class<T> type, Throwable t) {
        throw new PredictiveAnalyticsUnavailableException(t);
    }

    private String buildUrl(String path, String departmentId) {
        String url = predictiveServiceUrl + path;
        if (departmentId != null && !departmentId.isBlank()) {
            url += "?department_id=" + URLEncoder.encode(departmentId, StandardCharsets.UTF_8);
        }
        return url;
    }

    /** Small carrier for the bulk-update count response. */
    public record MapCountDto(int updated) {
    }

    static {
        // referenced to keep Collections import used if helpers change
        Collections.emptyList();
    }
}
