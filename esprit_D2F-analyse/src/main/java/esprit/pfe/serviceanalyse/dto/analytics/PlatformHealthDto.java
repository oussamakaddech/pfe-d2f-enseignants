package esprit.pfe.serviceanalyse.dto.analytics;

/** Platform health — components map is intentionally dynamic (infra probes). */
public record PlatformHealthDto(
        double score,
        String status,
        java.util.Map<String, Object> components
) {
}
