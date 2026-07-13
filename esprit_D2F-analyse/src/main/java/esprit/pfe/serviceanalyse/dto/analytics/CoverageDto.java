package esprit.pfe.serviceanalyse.dto.analytics;

import java.time.OffsetDateTime;

/**
 * Coverage with explicit data quality. {@code coveragePercent} is {@code null}
 * when {@code status} is INSUFFICIENT_DATA or NO_DATA, with a {@code reason}.
 */
public record CoverageDto(
        String scope,
        Double coveragePercent,
        DataQualityStatus status,
        String reason,
        int eligibleTeachers,
        int evaluatedTeachers,
        int totalCompetencies,
        int coveredCompetencies,
        OffsetDateTime computedAt
) {
}
