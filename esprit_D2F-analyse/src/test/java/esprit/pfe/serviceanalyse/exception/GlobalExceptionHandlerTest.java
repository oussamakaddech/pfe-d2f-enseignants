package esprit.pfe.serviceanalyse.exception;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("GlobalExceptionHandler - Tests unitaires")
class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;
    private HttpServletRequest request;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
        request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/api/v1/analyse-predictive/test");
    }

    @Test
    @DisplayName("handleNotFound - retourne 404")
    void shouldHandleResourceNotFound() {
        ResourceNotFoundException ex = new ResourceNotFoundException("Ressource introuvable");

        ResponseEntity<ErrorResponse> response = handler.handleNotFound(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.NOT_FOUND);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getStatus()).isEqualTo(404);
        assertThat(response.getBody().getMessage()).isEqualTo("Ressource introuvable");
        assertThat(response.getBody().getErrorCode()).isEqualTo("ANL-404");
        assertThat(response.getBody().getPath()).isEqualTo("/api/v1/analyse-predictive/test");
    }

    @Test
    @DisplayName("handleValidation - retourne 400 avec détails des champs")
    void shouldHandleValidationErrors() {
        BindingResult bindingResult = mock(BindingResult.class);
        FieldError fieldError1 = new FieldError("obj", "name", "must not be blank");
        FieldError fieldError2 = new FieldError("obj", "email", "must be valid");
        when(bindingResult.getFieldErrors()).thenReturn(List.of(fieldError1, fieldError2));

        MethodArgumentNotValidException ex = new MethodArgumentNotValidException(null, bindingResult);

        ResponseEntity<ErrorResponse> response = handler.handleValidation(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getErrorCode()).isEqualTo("ANL-400");
        assertThat(response.getBody().getMessage()).contains("name", "email");
    }

    @Test
    @DisplayName("handleAccessDenied - retourne 403")
    void shouldHandleAccessDenied() {
        AccessDeniedException ex = new AccessDeniedException("Forbidden");

        ResponseEntity<ErrorResponse> response = handler.handleAccessDenied(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.FORBIDDEN);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getErrorCode()).isEqualTo("ANL-403");
        assertThat(response.getBody().getMessage()).contains("Accès refusé");
    }

    @Test
    @DisplayName("handleAuthentication - retourne 401 pour BadCredentials")
    void shouldHandleBadCredentials() {
        BadCredentialsException ex = new BadCredentialsException("Invalid credentials");

        ResponseEntity<ErrorResponse> response = handler.handleAuthentication(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.UNAUTHORIZED);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getErrorCode()).isEqualTo("ANL-401");
        assertThat(response.getBody().getMessage()).contains("authentification");
    }

    @Test
    @DisplayName("handleIllegalArgument - retourne 400")
    void shouldHandleIllegalArgument() {
        IllegalArgumentException ex = new IllegalArgumentException("Paramètre invalide");

        ResponseEntity<ErrorResponse> response = handler.handleIllegalArgument(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.BAD_REQUEST);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getErrorCode()).isEqualTo("ANL-400");
        assertThat(response.getBody().getMessage()).isEqualTo("Paramètre invalide");
    }

    @Test
    @DisplayName("handleGeneral - retourne 500 avec traceId")
    void shouldHandleGenericException() {
        Exception ex = new RuntimeException("Something went wrong");

        ResponseEntity<ErrorResponse> response = handler.handleGeneral(ex, request);

        assertThat(response.getStatusCode()).isEqualTo(HttpStatus.INTERNAL_SERVER_ERROR);
        assertThat(response.getBody()).isNotNull();
        assertThat(response.getBody().getErrorCode()).isEqualTo("ANL-500");
        assertThat(response.getBody().getTraceId()).isNotBlank();
    }

    @Test
    @DisplayName("ResourceNotFoundException - vérifie le message")
    void shouldCreateResourceNotFoundWithMessage() {
        ResourceNotFoundException ex = new ResourceNotFoundException("Test message");

        assertThat(ex).isInstanceOf(RuntimeException.class);
        assertThat(ex.getMessage()).isEqualTo("Test message");
    }

    @Test
    @DisplayName("ErrorResponse - vérifie le builder")
    void shouldBuildErrorResponse() {
        ErrorResponse response = ErrorResponse.builder()
                .timestamp("2026-05-12T00:00:00")
                .status(404)
                .errorCode("ANL-404")
                .message("Not found")
                .path("/test")
                .traceId("abc-123")
                .build();

        assertThat(response.getTimestamp()).isEqualTo("2026-05-12T00:00:00");
        assertThat(response.getStatus()).isEqualTo(404);
        assertThat(response.getErrorCode()).isEqualTo("ANL-404");
        assertThat(response.getMessage()).isEqualTo("Not found");
        assertThat(response.getPath()).isEqualTo("/test");
        assertThat(response.getTraceId()).isEqualTo("abc-123");
    }
}
