package esprit.pfe.serviceanalyse.dto.analytics;

import java.time.OffsetDateTime;

public record ModelHealthDto(
        String modelVersion,
        String modelType,
        OffsetDateTime lastTrainedAt,
        int sampleCount,
        Double r2,
        Double rmse,
        String driftStatus,
        String validationStatus,
        String disclaimer
) {
}
