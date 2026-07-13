package esprit.pfe.serviceanalyse.dto.analytics;

import java.util.List;

/** Bulk PATCH body for multiple alerts (audited). */
public record BulkAlertPatchDto(List<String> ids, AlertStatus status, String note) {
}
