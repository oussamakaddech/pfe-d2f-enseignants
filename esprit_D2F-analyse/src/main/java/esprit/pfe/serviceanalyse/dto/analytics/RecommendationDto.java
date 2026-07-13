package esprit.pfe.serviceanalyse.dto.analytics;

import java.time.OffsetDateTime;

public record RecommendationDto(
        String id,
        String teacherId,
        String departmentId,
        String title,
        String explanation,
        String suggestedTrainingId,
        RecommendationStatus status,
        OffsetDateTime createdAt
) {
}
