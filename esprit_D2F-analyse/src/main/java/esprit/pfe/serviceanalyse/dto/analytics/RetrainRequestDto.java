package esprit.pfe.serviceanalyse.dto.analytics;

/** Retrain request body. */
public record RetrainRequestDto(int sampleCount, Double r2, Double rmse) {
}
