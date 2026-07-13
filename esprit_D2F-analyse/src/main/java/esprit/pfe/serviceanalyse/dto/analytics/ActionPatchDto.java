package esprit.pfe.serviceanalyse.dto.analytics;

/** PATCH body for a priority action. */
public record ActionPatchDto(ActionStatus status, String note) {
}
