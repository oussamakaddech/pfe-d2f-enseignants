package esprit.pfe.serviceanalyse.dto.analytics;

/** Explicit data-quality status (principle #3): never a misleading 0%. */
public enum DataQualityStatus {
    CALCULATED, INSUFFICIENT_DATA, NO_DATA;

    public String frenchLabel() {
        return switch (this) {
            case CALCULATED -> "Calculé";
            case INSUFFICIENT_DATA -> "Non calculable";
            case NO_DATA -> "Aucune donnée";
        };
    }
}
