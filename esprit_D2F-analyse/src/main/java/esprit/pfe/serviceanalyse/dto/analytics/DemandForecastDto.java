package esprit.pfe.serviceanalyse.dto.analytics;

import java.time.OffsetDateTime;

/** Demand forecast — explicitly labelled statistical vs ML. */
public record DemandForecastDto(
        String metric,
        java.util.List<ForecastPointDto> historicalPoints,
        java.util.List<ForecastPointDto> projectedPoints,
        ConfidenceIntervalDto confidenceInterval,
        String methodologyLabel,
        boolean isMl,
        int horizonMonths,
        OffsetDateTime computedAt
) {
}
