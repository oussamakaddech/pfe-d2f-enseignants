package esprit.pfe.serviceanalyse.client;

import esprit.pfe.serviceanalyse.dto.analytics.*;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.ParameterizedTypeReference;
import org.springframework.stereotype.Component;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.util.UriComponentsBuilder;

import java.net.URLEncoder;
import java.nio.charset.StandardCharsets;
import java.util.List;

/**
 * Typed client (V2) toward the FastAPI Predictive Analytics engine.
 *
 * <p>Every call is protected by a CircuitBreaker + Retry via {@link ResilientCaller}
 * (a standalone bean so Spring AOP actually intercepts the call). The RestTemplate
 * carries connect/read timeouts (the "timeout" leg of the resilience triad).
 * <b>Fallbacks are loud</b>: a downstream outage throws
 * {@link esprit.pfe.serviceanalyse.exception.PredictiveAnalyticsUnavailableException}
 * (mapped to HTTP 502) instead of returning a silent empty body — a critical
 * upstream outage must never be hidden.</p>
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
    private final ResilientCaller resilientCaller;

    @Value("${services.predictive.url}")
    private String predictiveServiceUrl;

    public PredictiveAnalyticsClient(RestTemplate restTemplate, ResilientCaller resilientCaller) {
        this.restTemplate = restTemplate;
        this.resilientCaller = resilientCaller;
    }

    // ── Reads ────────────────────────────────────────────────────────────

    public DashboardOverviewDto getDashboardOverview(String departmentId, String bearerToken) {
        return resilientCaller.get(buildUrl(V2_BASE + "/dashboard/overview", departmentId), bearerToken, restTemplate, DashboardOverviewDto.class);
    }

    public List<RiskDistributionItemDto> getRiskDistribution(String departmentId, String bearerToken) {
        return resilientCaller.get(buildUrl(V2_BASE + "/dashboard/risk-distribution", departmentId), bearerToken,
                restTemplate, new ParameterizedTypeReference<>() {});
    }

    public GapHeatmapDto getGapHeatmap(String departmentId, String bearerToken) {
        return resilientCaller.get(buildUrl(V2_BASE + "/dashboard/gap-heatmap", departmentId), bearerToken, restTemplate, GapHeatmapDto.class);
    }

    public DemandForecastDto getDemandForecast(int months, String bearerToken) {
        String url = predictiveServiceUrl + V2_BASE + "/dashboard/demand-forecast?months=" + months;
        return resilientCaller.get(url, bearerToken, restTemplate, DemandForecastDto.class);
    }

    public ModelHealthDto getModelHealth(String bearerToken) {
        return resilientCaller.get(predictiveServiceUrl + V2_BASE + "/model/health", bearerToken, restTemplate, ModelHealthDto.class);
    }

    public TeacherRiskProfileDto getTeacherProfile(String teacherId, String bearerToken) {
        return resilientCaller.get(predictiveServiceUrl + V2_BASE + "/teachers/" + teacherId + "/profile",
                bearerToken, restTemplate, TeacherRiskProfileDto.class);
    }

    public PageDto<TeacherRiskProfileDto> getTeachers(String departmentId, String level, int page, int size, String bearerToken) {
        UriComponentsBuilder b = UriComponentsBuilder.fromHttpUrl(predictiveServiceUrl + V2_BASE + "/teachers")
                .queryParam("page", page).queryParam("size", size);
        if (departmentId != null) b.queryParam("department_id", departmentId);
        if (level != null) b.queryParam("level", level);
        return resilientCaller.get(b.toUriString(), bearerToken, restTemplate, new ParameterizedTypeReference<>() {});
    }

    public PageDto<AlertDto> getAlerts(String status, String departmentId, int page, int size, String bearerToken) {
        UriComponentsBuilder b = UriComponentsBuilder.fromHttpUrl(predictiveServiceUrl + V2_BASE + "/alerts")
                .queryParam("page", page).queryParam("size", size);
        if (status != null) b.queryParam("status", status);
        if (departmentId != null) b.queryParam("department_id", departmentId);
        return resilientCaller.get(b.toUriString(), bearerToken, restTemplate, new ParameterizedTypeReference<>() {});
    }

    public PageDto<PriorityActionDto> getPriorityActions(String departmentId, int page, int size, String bearerToken) {
        UriComponentsBuilder b = UriComponentsBuilder.fromHttpUrl(predictiveServiceUrl + V2_BASE + "/actions/priority")
                .queryParam("page", page).queryParam("size", size);
        if (departmentId != null) b.queryParam("department_id", departmentId);
        return resilientCaller.get(b.toUriString(), bearerToken, restTemplate, new ParameterizedTypeReference<>() {});
    }

    public JobDto getJob(String jobId, String bearerToken) {
        return resilientCaller.get(predictiveServiceUrl + V2_BASE + "/jobs/" + jobId, bearerToken, restTemplate, JobDto.class);
    }

    // ── Writes ─────────────────────────────────────────────────────────────

    public JobDto analyzeTeacher(String teacherId, String bearerToken) {
        return resilientCaller.post(predictiveServiceUrl + V2_BASE + "/teachers/" + teacherId + "/analyze",
                bearerToken, restTemplate, null, JobDto.class);
    }

    public AlertDto patchAlert(String alertId, AlertPatchDto body, String bearerToken) {
        return resilientCaller.patch(predictiveServiceUrl + V2_BASE + "/alerts/" + alertId,
                bearerToken, restTemplate, body, AlertDto.class);
    }

    public int bulkPatchAlerts(BulkAlertPatchDto body, String bearerToken) {
        MapCountDto dto = resilientCaller.patch(predictiveServiceUrl + V2_BASE + "/alerts/bulk",
                bearerToken, restTemplate, body, MapCountDto.class);
        return dto == null ? 0 : dto.updated();
    }

    public PriorityActionDto patchAction(String actionId, ActionPatchDto body, String bearerToken) {
        return resilientCaller.patch(predictiveServiceUrl + V2_BASE + "/actions/" + actionId,
                bearerToken, restTemplate, body, PriorityActionDto.class);
    }

    public ModelHealthDto retrain(RetrainRequestDto body, String bearerToken) {
        return resilientCaller.post(predictiveServiceUrl + V2_BASE + "/model/retrain", bearerToken, restTemplate, body, ModelHealthDto.class);
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
}
