package esprit.pfe.serviceanalyse.dto.analytics;

public record RiskDistributionItemDto(
        RiskLevel level,
        int count,
        double percentage
) {
}
