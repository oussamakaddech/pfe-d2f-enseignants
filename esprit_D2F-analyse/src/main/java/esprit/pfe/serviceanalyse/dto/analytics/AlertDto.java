package esprit.pfe.serviceanalyse.dto.analytics;

public record AlertDto(
        String id,
        String teacherId,
        String departmentId,
        AlertSeverity severity,
        AlertStatus status,
        String title,
        String message,
        String createdAt,
        String updatedAt
) {
}
