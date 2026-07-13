package esprit.pfe.serviceanalyse.dto.analytics;

public record GapHeatmapCellDto(
        String departmentId,
        String competenceId,
        double gapRatio,
        String severity,
        int teacherCount
) {
}
