package esprit.pfe.serviceanalyse.api;

import esprit.pfe.serviceanalyse.dto.analytics.*;
import esprit.pfe.serviceanalyse.service.AnalyticsBffService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpHeaders;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/v2/analytics")
@RequiredArgsConstructor
public class AnalyticsController {

    private final AnalyticsBffService bffService;

    // ── Dashboard ───────────────────────────────────────────────────────

    @GetMapping("/dashboard/overview")
    public ResponseEntity<DashboardOverviewDto> dashboardOverview(
            @RequestParam(required = false) String departmentId,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearerToken) {
        return ResponseEntity.ok(bffService.dashboardOverview(departmentId, bearerToken));
    }

    @GetMapping("/dashboard/risk-distribution")
    public ResponseEntity<java.util.List<RiskDistributionItemDto>> riskDistribution(
            @RequestParam(required = false) String departmentId,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearerToken) {
        return ResponseEntity.ok(bffService.riskDistribution(departmentId, bearerToken));
    }

    @GetMapping("/dashboard/gap-heatmap")
    public ResponseEntity<GapHeatmapDto> gapHeatmap(
            @RequestParam(required = false) String departmentId,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearerToken) {
        return ResponseEntity.ok(bffService.gapHeatmap(departmentId, bearerToken));
    }

    @GetMapping("/dashboard/demand-forecast")
    public ResponseEntity<DemandForecastDto> demandForecast(
            @RequestParam(defaultValue = "6") int months,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearerToken) {
        return ResponseEntity.ok(bffService.demandForecast(months, bearerToken));
    }

    @GetMapping("/model/health")
    public ResponseEntity<ModelHealthDto> modelHealth(
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearerToken) {
        return ResponseEntity.ok(bffService.modelHealth(bearerToken));
    }

    // ── Teacher analytics ─────────────────────────────────────────────────

    @GetMapping("/teachers/{teacherId}/profile")
    public ResponseEntity<TeacherRiskProfileDto> teacherProfile(
            @PathVariable String teacherId,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearerToken) {
        return ResponseEntity.ok(bffService.teacherProfile(teacherId, bearerToken));
    }

    @GetMapping("/teachers")
    public ResponseEntity<PageDto<TeacherRiskProfileDto>> teachers(
            @RequestParam(required = false) String departmentId,
            @RequestParam(required = false) String level,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearerToken) {
        return ResponseEntity.ok(bffService.teachers(departmentId, level, page, size, bearerToken));
    }

    // ── Alerts & actions ───────────────────────────────────────────────────

    @GetMapping("/alerts")
    public ResponseEntity<PageDto<AlertDto>> alerts(
            @RequestParam(required = false) String status,
            @RequestParam(required = false) String departmentId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearerToken) {
        return ResponseEntity.ok(bffService.alerts(status, departmentId, page, size, bearerToken));
    }

    @GetMapping("/actions/priority")
    public ResponseEntity<PageDto<PriorityActionDto>> priorityActions(
            @RequestParam(required = false) String departmentId,
            @RequestParam(defaultValue = "1") int page,
            @RequestParam(defaultValue = "20") int size,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearerToken) {
        return ResponseEntity.ok(bffService.priorityActions(departmentId, page, size, bearerToken));
    }

    @PatchMapping("/alerts/{alertId}")
    public ResponseEntity<AlertDto> patchAlert(
            @PathVariable String alertId,
            @Valid @RequestBody AlertPatchDto body,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearerToken) {
        return ResponseEntity.ok(bffService.patchAlert(alertId, body, bearerToken));
    }

    @PatchMapping("/alerts/bulk")
    public ResponseEntity<java.util.Map<String, Integer>> bulkPatchAlerts(
            @Valid @RequestBody BulkAlertPatchDto body,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearerToken) {
        int updated = bffService.bulkPatchAlerts(body, bearerToken);
        return ResponseEntity.ok(java.util.Map.of("updated", updated));
    }

    @PatchMapping("/actions/{actionId}")
    public ResponseEntity<PriorityActionDto> patchAction(
            @PathVariable String actionId,
            @Valid @RequestBody ActionPatchDto body,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearerToken) {
        return ResponseEntity.ok(bffService.patchAction(actionId, body, bearerToken));
    }

    // ── Model administration (ADMIN / CUP / DEPARTMENT_MANAGER) ─────────────

    @PostMapping("/teachers/{teacherId}/analyze")
    @PreAuthorize("hasAnyAuthority('ADMIN','CUP','DEPARTMENT_MANAGER')")
    public ResponseEntity<JobDto> analyzeTeacher(
            @PathVariable String teacherId,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearerToken) {
        return ResponseEntity.status(202).body(bffService.analyzeTeacher(teacherId, bearerToken));
    }

    @GetMapping("/jobs/{jobId}")
    public ResponseEntity<JobDto> getJob(
            @PathVariable String jobId,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearerToken) {
        return ResponseEntity.ok(bffService.getJob(jobId, bearerToken));
    }

    @PostMapping("/model/retrain")
    @PreAuthorize("hasAuthority('ADMIN')")
    public ResponseEntity<ModelHealthDto> retrain(
            @Valid @RequestBody RetrainRequestDto body,
            @RequestHeader(value = HttpHeaders.AUTHORIZATION, required = false) String bearerToken) {
        return ResponseEntity.ok(bffService.retrain(body, bearerToken));
    }
}
