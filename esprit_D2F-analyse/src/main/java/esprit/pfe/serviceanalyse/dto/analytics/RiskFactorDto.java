package esprit.pfe.serviceanalyse.dto.analytics;

/** One explained risk factor (the score is fully explainable). */
public record RiskFactorDto(
        String code,
        String label,
        double value,
        double normalizedValue,
        double weight,
        double contribution,
        String explanation
) {
}
