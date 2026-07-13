package esprit.pfe.serviceanalyse.service;

import esprit.pfe.serviceanalyse.client.PredictiveAnalyticsClient;
import esprit.pfe.serviceanalyse.dto.analytics.*;
import esprit.pfe.serviceanalyse.exception.PredictiveAnalyticsUnavailableException;
import esprit.pfe.serviceanalyse.exception.ResourceNotFoundException;
import esprit.pfe.serviceanalyse.security.AnalyticsAuthorizationService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.stereotype.Service;
import org.springframework.web.client.HttpClientErrorException;

/**
 * BFF façade for the V2 analytics API.
 *
 * <p>Responsibilities:
 * <ul>
 *   <li>Forward the caller's JWT to the FastAPI engine (which enforces its own RBAC).</li>
 *   <li>Apply object-level (BOLA) authorization at the BFF edge.</li>
 *   <li>Translate 4xx from upstream into proper domain exceptions (404 →
 *       {@link ResourceNotFoundException}, 403 → AccessDenied); let 5xx/timeouts
 *       become a loud {@link PredictiveAnalyticsUnavailableException} (502).</li>
 * </ul>
 *
 * <p>No business risk logic lives here — the single source of truth is the
 * FastAPI engine. This service only shapes and secures the response.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AnalyticsBffService {

    private final PredictiveAnalyticsClient predictiveClient;
    private final AnalyticsAuthorizationService authorizationService;

    private Authentication auth() {
        return SecurityContextHolder.getContext().getAuthentication();
    }

    public DashboardOverviewDto dashboardOverview(String departmentId, String bearerToken) {
        authorizationService.authorizeDepartment(auth(), departmentId);
        return translate(() -> predictiveClient.getDashboardOverview(departmentId, bearerToken));
    }

    public java.util.List<RiskDistributionItemDto> riskDistribution(String departmentId, String bearerToken) {
        authorizationService.authorizeDepartment(auth(), departmentId);
        return translate(() -> predictiveClient.getRiskDistribution(departmentId, bearerToken));
    }

    public GapHeatmapDto gapHeatmap(String departmentId, String bearerToken) {
        authorizationService.authorizeDepartment(auth(), departmentId);
        return translate(() -> predictiveClient.getGapHeatmap(departmentId, bearerToken));
    }

    public DemandForecastDto demandForecast(int months, String bearerToken) {
        return translate(() -> predictiveClient.getDemandForecast(months, bearerToken));
    }

    public ModelHealthDto modelHealth(String bearerToken) {
        return translate(() -> predictiveClient.getModelHealth(bearerToken));
    }

    public TeacherRiskProfileDto teacherProfile(String teacherId, String bearerToken) {
        TeacherRiskProfileDto profile = translate(() -> predictiveClient.getTeacherProfile(teacherId, bearerToken));
        if (profile == null) {
            throw new ResourceNotFoundException("Profil de risque introuvable pour " + teacherId);
        }
        authorizationService.authorizeTeacherAccess(auth(), teacherId, profile.departmentId());
        return profile;
    }

    public PageDto<TeacherRiskProfileDto> teachers(String departmentId, String level, int page, int size, String bearerToken) {
        authorizationService.authorizeDepartment(auth(), departmentId);
        return translate(() -> predictiveClient.getTeachers(departmentId, level, page, size, bearerToken));
    }

    public PageDto<AlertDto> alerts(String status, String departmentId, int page, int size, String bearerToken) {
        authorizationService.authorizeDepartment(auth(), departmentId);
        return translate(() -> predictiveClient.getAlerts(status, departmentId, page, size, bearerToken));
    }

    public PageDto<PriorityActionDto> priorityActions(String departmentId, int page, int size, String bearerToken) {
        authorizationService.authorizeDepartment(auth(), departmentId);
        return translate(() -> predictiveClient.getPriorityActions(departmentId, page, size, bearerToken));
    }

    public JobDto analyzeTeacher(String teacherId, String bearerToken) {
        // admin / CUP / dept-manager only — mirrored from upstream.
        return translate(() -> predictiveClient.analyzeTeacher(teacherId, bearerToken));
    }

    public JobDto getJob(String jobId, String bearerToken) {
        JobDto job = translate(() -> predictiveClient.getJob(jobId, bearerToken));
        if (job == null) {
            throw new ResourceNotFoundException("Job introuvable : " + jobId);
        }
        return job;
    }

    public AlertDto patchAlert(String alertId, AlertPatchDto body, String bearerToken) {
        return translate(() -> predictiveClient.patchAlert(alertId, body, bearerToken));
    }

    public int bulkPatchAlerts(BulkAlertPatchDto body, String bearerToken) {
        return translate(() -> predictiveClient.bulkPatchAlerts(body, bearerToken));
    }

    public PriorityActionDto patchAction(String actionId, ActionPatchDto body, String bearerToken) {
        return translate(() -> predictiveClient.patchAction(actionId, body, bearerToken));
    }

    public ModelHealthDto retrain(RetrainRequestDto body, String bearerToken) {
        return translate(() -> predictiveClient.retrain(body, bearerToken));
    }

    /** Executes a client call, translating 4xx to domain exceptions. */
    private <T> T translate(ClientCall<T> call) {
        try {
            return call.run();
        } catch (HttpClientErrorException e) {
            if (e.getStatusCode().value() == 404) {
                throw new ResourceNotFoundException("Ressource introuvable côté moteur d'analyse.");
            }
            if (e.getStatusCode().value() == 403) {
                throw new org.springframework.security.access.AccessDeniedException("Accès refusé par le moteur d'analyse.");
            }
            if (e.getStatusCode().is4xxClientError()) {
                throw new IllegalArgumentException("Requête invalide : " + e.getStatusText());
            }
            throw new PredictiveAnalyticsUnavailableException(e);
        }
    }

    @FunctionalInterface
    private interface ClientCall<T> {
        T run();
    }
}
