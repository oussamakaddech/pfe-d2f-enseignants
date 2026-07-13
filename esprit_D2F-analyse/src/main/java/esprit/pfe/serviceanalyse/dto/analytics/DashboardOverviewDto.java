package esprit.pfe.serviceanalyse.dto.analytics;

import java.time.OffsetDateTime;

public record DashboardOverviewDto(
        String scope,
        java.util.Map<String, Object> filters,
        int teachersAnalyzed,
        double averageRisk,
        int priorityTeacherCount,
        int criticalGapCount,
        int newAlertCount,
        CoverageDto coverage,
        ModelHealthSummaryDto modelHealth,
        PlatformHealthDto platformHealth,
        OffsetDateTime computedAt
) {
}
