package esprit.pfe.serviceanalyse.dto.analytics;

import java.time.OffsetDateTime;

/** Async job status (analyze / batch). Returned with HTTP 202 + status URL. */
public record JobDto(
        String jobId,
        String jobType,
        String scope,
        String status,
        int progress,
        int total,
        String error,
        OffsetDateTime createdAt,
        OffsetDateTime finishedAt,
        String statusUrl
) {
}
