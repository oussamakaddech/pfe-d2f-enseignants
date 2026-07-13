package esprit.pfe.serviceanalyse.dto.integration;

public record EvaluationDto(String competenceId, double normalizedLevel, boolean regression, int stagnationMonths) {
}
