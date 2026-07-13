package esprit.pfe.serviceanalyse.dto.analytics;

/** Generic pagination envelope matching the FastAPI V2 `Page` contract. */
public record PageDto<T>(
        java.util.List<T> items,
        int total,
        int page,
        int size,
        int pages
) {
    public static <T> PageDto<T> empty() {
        return new PageDto<>(java.util.List.of(), 0, 1, 0, 0);
    }
}
