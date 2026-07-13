package esprit.pfe.serviceanalyse.dto.analytics;

import java.time.OffsetDateTime;

public record GapHeatmapDto(
        java.util.List<java.util.Map<String, Object>> departments,
        java.util.List<java.util.Map<String, Object>> competencies,
        java.util.List<GapHeatmapCellDto> cells,
        java.util.Map<String, Object> filters,
        OffsetDateTime computedAt
) {
}
