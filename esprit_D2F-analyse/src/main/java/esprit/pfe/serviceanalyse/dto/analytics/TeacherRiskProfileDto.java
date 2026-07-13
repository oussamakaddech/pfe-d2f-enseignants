package esprit.pfe.serviceanalyse.dto.analytics;

import java.time.OffsetDateTime;

/**
 * The persisted, single-source-of-truth teacher risk profile.
 * Every dashboard, table, chart, alert and recommendation reads this same shape.
 */
public record TeacherRiskProfileDto(
        String teacherId,
        String teacherName,
        String initials,
        String departmentId,
        String departmentName,
        double score,
        int percentage,
        RiskLevel level,
        RiskTrend trend,
        java.util.List<RiskFactorDto> factors,
        int criticalGapCount,
        java.util.List<String> topGaps,
        String recommendedAction,
        OffsetDateTime computedAt,
        String algorithmVersion,
        DataQualityStatus dataQuality
) {
}
