package tn.esprit.d2f.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("GlobalExceptionHandler - Tests unitaires")
class GlobalExceptionHandlerTest {

    private final GlobalExceptionHandler handler = new GlobalExceptionHandler();
    private jakarta.servlet.http.HttpServletRequest request;

    @BeforeEach
    void setUp() {
        request = mock(jakarta.servlet.http.HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/api/v1/notifications");
    }

    @Test
    @DisplayName("handleNotFound - doit répondre 404 avec le code NOTIFICATION_NOT_FOUND")
    void handleNotFound_shouldReturn404() {
        ResponseEntity<ErrorResponse> response =
                handler.handleNotFound(new ResourceNotFoundException("Notification non trouvée"), request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getErrorCode()).isEqualTo("NOTIFICATION_NOT_FOUND");
        assertThat(response.getBody().getMessage()).isEqualTo("Notification non trouvée");
        assertThat(response.getBody().getPath()).isEqualTo("/api/v1/notifications");
        assertThat(response.getBody().getTimestamp()).isNotNull();
    }

    @Test
    @DisplayName("handleValidation - doit répondre 400 avec les erreurs de champs concaténées")
    void handleValidation_shouldReturn400() {
        BindingResult bindingResult = mock(BindingResult.class);
        FieldError fieldError = new FieldError("notification", "message", "ne doit pas être vide");
        when(bindingResult.getFieldErrors()).thenReturn(List.of(fieldError));
        MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
        when(ex.getBindingResult()).thenReturn(bindingResult);

        ResponseEntity<ErrorResponse> response = handler.handleValidation(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getErrorCode()).isEqualTo("NOTIFICATION_VALIDATION_ERROR");
        assertThat(response.getBody().getMessage()).isEqualTo("message: ne doit pas être vide");
    }

    @Test
    @DisplayName("handleIllegalArgument - doit répondre 400 avec le code BUSINESS_RULE")
    void handleIllegalArgument_shouldReturn400() {
        ResponseEntity<ErrorResponse> response =
                handler.handleIllegalArgument(new IllegalArgumentException("boom"), request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getErrorCode()).isEqualTo("NOTIFICATION_BUSINESS_RULE_VIOLATION");
    }

    @Test
    @DisplayName("handleGeneral - doit répondre 500 avec un traceId non vide")
    void handleGeneral_shouldReturn500WithTraceId() {
        ResponseEntity<ErrorResponse> response =
                handler.handleGeneral(new RuntimeException("défaillance"), request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getErrorCode()).isEqualTo("NOTIFICATION_INTERNAL_ERROR");
        assertThat(response.getBody().getTraceId()).isNotBlank();
        assertThat(response.getBody().getMessage()).contains("Référence de support");
    }

    @Test
    @DisplayName("ResourceNotFoundException - doit porter le message et @ResponseStatus 404")
    void resourceNotFoundException_shouldCarryMessage() {
        ResourceNotFoundException ex = new ResourceNotFoundException("introuvable");

        assertThat(ex.getMessage()).isEqualTo("introuvable");
        assertThat(ResourceNotFoundException.class.getAnnotation(
                org.springframework.web.bind.annotation.ResponseStatus.class).value())
                .isEqualTo(HttpStatus.NOT_FOUND);
    }

    @Test
    @DisplayName("ErrorResponse - builder doit remplir tous les champs")
    void errorResponse_builderShouldPopulateFields() {
        ErrorResponse body = ErrorResponse.builder()
                .timestamp(java.time.Instant.parse("2026-01-01T00:00:00Z"))
                .status(404)
                .errorCode("E")
                .message("m")
                .path("/p")
                .traceId("t")
                .build();

        assertThat(body.getStatus()).isEqualTo(404);
        assertThat(body.getErrorCode()).isEqualTo("E");
        assertThat(body.getMessage()).isEqualTo("m");
        assertThat(body.getPath()).isEqualTo("/p");
        assertThat(body.getTraceId()).isEqualTo("t");
        assertThat(body.toString()).contains("404");
    }
}
