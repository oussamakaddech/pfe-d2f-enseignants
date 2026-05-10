package tn.esprit.d2f.exception;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.core.AuthenticationException;

import static org.junit.jupiter.api.Assertions.*;

/**
 * Additional coverage tests for GlobalExceptionHandler.
 * Targets the ResourceNotFoundException variant in handleNotFound
 * and the AuthenticationException (non-BadCredentials) variant.
 */
class GlobalExceptionHandlerCoverageTest {

    private GlobalExceptionHandler handler;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
        request = new MockHttpServletRequest();
        request.setRequestURI("/api/v1/test");
    }

    @Test
    void handleNotFound_withResourceNotFoundException() {
        ResourceNotFoundException ex = new ResourceNotFoundException("Besoin not found");
        ResponseEntity<ErrorResponse> response = handler.handleNotFound(ex, request);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Besoin not found", response.getBody().getMessage());
        assertEquals("BESOIN-404", response.getBody().getErrorCode());
        assertEquals("/api/v1/test", response.getBody().getPath());
        assertNotNull(response.getBody().getTraceId());
        assertNotNull(response.getBody().getTimestamp());
    }

    @Test
    void handleAuthentication_withAuthenticationException() {
        // Use a concrete AuthenticationException subclass other than BadCredentialsException
        AuthenticationException ex = new AuthenticationException("Auth failed") {};
        ResponseEntity<ErrorResponse> response = handler.handleAuthentication(ex, request);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("BESOIN-401", response.getBody().getErrorCode());
        assertNotNull(response.getBody().getTraceId());
    }

    @Test
    void handleGeneral_withRuntimeException() {
        RuntimeException ex = new RuntimeException("Unexpected");
        ResponseEntity<ErrorResponse> response = handler.handleGeneral(ex, request);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("BESOIN-500", response.getBody().getErrorCode());
        assertNotNull(response.getBody().getTraceId());
        assertEquals("/api/v1/test", response.getBody().getPath());
    }

    @Test
    void handleIllegalArgument_withEmptyMessage() {
        IllegalArgumentException ex = new IllegalArgumentException("");
        ResponseEntity<ErrorResponse> response = handler.handleIllegalArgument(ex, request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("", response.getBody().getMessage());
    }

    @Test
    void handleAccessDenied_shouldContainCorrectMessage() {
        org.springframework.security.access.AccessDeniedException ex =
                new org.springframework.security.access.AccessDeniedException("Forbidden");
        ResponseEntity<ErrorResponse> response = handler.handleAccessDenied(ex, request);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertNotNull(response.getBody());
        assertTrue(response.getBody().getMessage().contains("Accès refusé"));
        assertEquals("BESOIN-403", response.getBody().getErrorCode());
        assertNotNull(response.getBody().getTimestamp());
        assertEquals(403, response.getBody().getStatus());
    }

    @Test
    void errorResponse_builderAndGetters() {
        ErrorResponse errorResponse = ErrorResponse.builder()
                .timestamp("2026-01-01T00:00:00")
                .status(500)
                .errorCode("BESOIN-500")
                .message("Error message")
                .path("/api/test")
                .traceId("trace-123")
                .build();

        assertEquals("2026-01-01T00:00:00", errorResponse.getTimestamp());
        assertEquals(500, errorResponse.getStatus());
        assertEquals("BESOIN-500", errorResponse.getErrorCode());
        assertEquals("Error message", errorResponse.getMessage());
        assertEquals("/api/test", errorResponse.getPath());
        assertEquals("trace-123", errorResponse.getTraceId());
    }

    @Test
    void errorResponse_noArgsConstructor() {
        ErrorResponse errorResponse = new ErrorResponse();
        assertNotNull(errorResponse);
        assertNull(errorResponse.getMessage());
        assertNull(errorResponse.getPath());
        assertEquals(0, errorResponse.getStatus());
    }

    @Test
    void errorResponse_allArgsConstructor() {
        ErrorResponse errorResponse = new ErrorResponse(
                "2026-01-01", 404, "BESOIN-404", "Not found", "/path", "trace"
        );
        assertEquals("2026-01-01", errorResponse.getTimestamp());
        assertEquals(404, errorResponse.getStatus());
        assertEquals("BESOIN-404", errorResponse.getErrorCode());
        assertEquals("Not found", errorResponse.getMessage());
        assertEquals("/path", errorResponse.getPath());
        assertEquals("trace", errorResponse.getTraceId());
    }

    @Test
    void errorResponse_setters() {
        ErrorResponse errorResponse = new ErrorResponse();
        errorResponse.setTimestamp("ts");
        errorResponse.setStatus(400);
        errorResponse.setErrorCode("code");
        errorResponse.setMessage("msg");
        errorResponse.setPath("/p");
        errorResponse.setTraceId("t");

        assertEquals("ts", errorResponse.getTimestamp());
        assertEquals(400, errorResponse.getStatus());
        assertEquals("code", errorResponse.getErrorCode());
        assertEquals("msg", errorResponse.getMessage());
        assertEquals("/p", errorResponse.getPath());
        assertEquals("t", errorResponse.getTraceId());
    }
}
