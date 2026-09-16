package esprit.pfe.servicecertificat.exception;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("ErrorResponse - Tests unitaires")
class ErrorResponseTest {

    @Test
    @DisplayName("doit créer ErrorResponse avec tous les champs")
    void createErrorResponse_WithAllFields() {
        ErrorResponse response = ErrorResponse.builder()
                .timestamp("2026-05-09T10:00:00")
                .status(404)
                .errorCode("CERT-404")
                .message("Resource not found")
                .path("/api/v1/certificates/1")
                .traceId("abc123")
                .build();

        assertThat(response.getTimestamp()).isEqualTo("2026-05-09T10:00:00");
        assertThat(response.getStatus()).isEqualTo(404);
        assertThat(response.getErrorCode()).isEqualTo("CERT-404");
        assertThat(response.getMessage()).isEqualTo("Resource not found");
        assertThat(response.getPath()).isEqualTo("/api/v1/certificates/1");
        assertThat(response.getTraceId()).isEqualTo("abc123");
    }

    @Test
    @DisplayName("doit créer ErrorResponse avec constructeur par défaut")
    void createErrorResponse_WithNoArgsConstructor() {
        ErrorResponse response = new ErrorResponse();
        response.setTimestamp("2026-05-09T10:00:00");
        response.setStatus(500);
        response.setErrorCode("CERT-500");
        response.setMessage("Internal error");
        response.setPath("/api/v1/test");
        response.setTraceId("trace-001");

        assertThat(response.getTimestamp()).isEqualTo("2026-05-09T10:00:00");
        assertThat(response.getStatus()).isEqualTo(500);
        assertThat(response.getErrorCode()).isEqualTo("CERT-500");
        assertThat(response.getMessage()).isEqualTo("Internal error");
        assertThat(response.getPath()).isEqualTo("/api/v1/test");
        assertThat(response.getTraceId()).isEqualTo("trace-001");
    }

    @Test
    @DisplayName("doit créer ErrorResponse avec constructeur AllArgs")
    void createErrorResponse_WithAllArgsConstructor() {
        ErrorResponse response = new ErrorResponse(
                "2026-05-09T10:00:00",
                400,
                "CERT-400",
                "Bad request",
                "/api/v1/certificates",
                "trace-002"
        );

        assertThat(response.getTimestamp()).isEqualTo("2026-05-09T10:00:00");
        assertThat(response.getStatus()).isEqualTo(400);
        assertThat(response.getErrorCode()).isEqualTo("CERT-400");
        assertThat(response.getMessage()).isEqualTo("Bad request");
        assertThat(response.getPath()).isEqualTo("/api/v1/certificates");
        assertThat(response.getTraceId()).isEqualTo("trace-002");
    }

    @Test
    @DisplayName("toString doit contenir tous les champs")
    void toString_ShouldContainAllFields() {
        ErrorResponse response = ErrorResponse.builder()
                .timestamp("2026-05-09T10:00:00")
                .status(404)
                .errorCode("CERT-404")
                .message("Not found")
                .path("/api/v1/test")
                .traceId("trace-003")
                .build();

        assertThat(response.toString())
                .contains("timestamp")
                .contains("404")
                .contains("CERT-404")
                .contains("Not found");
    }

    @Test
    @DisplayName("doit vérifier que le timestamp est correctement formaté (ISO-8601)")
    void timestamp_ShouldBeISO8601Format() {
        ErrorResponse response = ErrorResponse.builder()
                .timestamp("2026-05-09T14:30:45")
                .status(400)
                .errorCode("CERT-400")
                .message("Bad request")
                .path("/api/v1/certificates")
                .traceId("trace-004")
                .build();

        assertThat(response.getTimestamp()).matches("\\d{4}-\\d{2}-\\d{2}T\\d{2}:\\d{2}:\\d{2}");
    }

    @Test
    @DisplayName("doit vérifier que le chemin de la requête est correctement capturé")
    void path_ShouldCaptureRequestUri() {
        ErrorResponse response = ErrorResponse.builder()
                .timestamp("2026-05-09T10:00:00")
                .status(404)
                .errorCode("CERT-404")
                .message("Not found")
                .path("/api/v1/certificates/123")
                .traceId("trace-005")
                .build();

        assertThat(response.getPath()).isEqualTo("/api/v1/certificates/123");
        assertThat(response.getPath()).startsWith("/");
    }

    @Test
    @DisplayName("doit vérifier que les codes d'erreur sont correctement générés")
    void errorCode_ShouldFollowCorrectPattern() {
        ErrorResponse response404 = ErrorResponse.builder()
                .timestamp("2026-05-09T10:00:00")
                .status(404)
                .errorCode("CERT-404")
                .message("Not found")
                .path("/api/v1/certificates")
                .traceId("trace-006")
                .build();

        ErrorResponse response401 = ErrorResponse.builder()
                .timestamp("2026-05-09T10:00:00")
                .status(401)
                .errorCode("CERT-401")
                .message("Unauthorized")
                .path("/api/v1/certificates")
                .traceId("trace-007")
                .build();

        ErrorResponse response500 = ErrorResponse.builder()
                .timestamp("2026-05-09T10:00:00")
                .status(500)
                .errorCode("CERT-500")
                .message("Internal error")
                .path("/api/v1/certificates")
                .traceId("trace-008")
                .build();

        assertThat(response404.getErrorCode()).isEqualTo("CERT-404");
        assertThat(response404.getErrorCode()).matches("CERT-\\d{3}");

        assertThat(response401.getErrorCode()).isEqualTo("CERT-401");
        assertThat(response401.getErrorCode()).matches("CERT-\\d{3}");

        assertThat(response500.getErrorCode()).isEqualTo("CERT-500");
        assertThat(response500.getErrorCode()).matches("CERT-\\d{3}");
    }

    @Test
    @DisplayName("doit vérifier que le status correspond au code d'erreur HTTP")
    void status_ShouldMatchHttpErrorCode() {
        ErrorResponse response403 = ErrorResponse.builder()
                .timestamp("2026-05-09T10:00:00")
                .status(403)
                .errorCode("CERT-403")
                .message("Forbidden")
                .path("/api/v1/admin")
                .traceId("trace-009")
                .build();

        assertThat(response403.getStatus()).isEqualTo(403);
        assertThat(response403.getErrorCode()).contains("403");
    }
}
