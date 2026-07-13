package esprit.pfe.serviceanalyse.dto.analytics;

public record ModelHealthSummaryDto(
        String modelVersion,
        String modelType,
        String validationStatus,
        String driftStatus,
        Double r2
) {
}
