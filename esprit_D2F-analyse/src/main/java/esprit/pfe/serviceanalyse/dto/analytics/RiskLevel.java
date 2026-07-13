package esprit.pfe.serviceanalyse.dto.analytics;

/** Risk scale — single canonical vocabulary, matching the FastAPI V2 contract. */
public enum RiskLevel {
    LOW, MODERATE, HIGH, CRITICAL;

    public String frenchLabel() {
        return switch (this) {
            case LOW -> "Faible";
            case MODERATE -> "Modéré";
            case HIGH -> "Élevé";
            case CRITICAL -> "Critique";
        };
    }
}
