package esprit.pfe.serviceanalyse.dto.analytics;

import java.util.List;

/** Cohort recommendation request body. */
public record CohortRecommendationDto(List<String> teacherIds) {
}
