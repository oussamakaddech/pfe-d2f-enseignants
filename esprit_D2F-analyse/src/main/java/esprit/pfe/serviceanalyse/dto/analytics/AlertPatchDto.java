package esprit.pfe.serviceanalyse.dto.analytics;

/** PATCH body for a single alert. */
public record AlertPatchDto(AlertStatus status, String note) {
}
