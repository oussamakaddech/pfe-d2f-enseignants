package esprit.pfe.serviceanalyse.dto.analytics;

import java.time.OffsetDateTime;

/** Retrain request body. */
public record RetrainRequestDto(int sampleCount, Double r2, Double rmse) {
}
