package esprit.pfe.serviceanalyse.dto.analytics;

import java.time.OffsetDateTime;

public record PriorityActionDto(
        String actionId,
        double priorityScore,
        String severity,
        String title,
        String explanation,
        String targetType,
        String targetId,
        String teacher,
        String department,
        String relatedGap,
        String suggestedTraining,
        ActionStatus status,
        OffsetDateTime createdAt
) {
}
