package tn.esprit.d2f.exception;

import jakarta.persistence.EntityNotFoundException;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import java.util.List;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class GlobalExceptionHandlerTest {

    private GlobalExceptionHandler handler;
    private MockHttpServletRequest request;

    @BeforeEach
    void setUp() {
        handler = new GlobalExceptionHandler();
        request = new MockHttpServletRequest();
        request.setRequestURI("/api/test");
    }

    @Test
    void testHandleNotFound() {
        EntityNotFoundException ex = new EntityNotFoundException("Entity not found");
        ResponseEntity<ErrorResponse> response = handler.handleNotFound(ex, request);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertEquals("Entity not found", response.getBody().getMessage());
        assertEquals("BESOIN_NOT_FOUND", response.getBody().getErrorCode());
        assertEquals("/api/test", response.getBody().getPath());
    }

    @Test
    void testHandleValidation() {
        MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
        BindingResult bindingResult = mock(BindingResult.class);
        when(ex.getBindingResult()).thenReturn(bindingResult);
        when(bindingResult.getFieldErrors()).thenReturn(List.of(
                new FieldError("object", "field1", "cannot be null"),
                new FieldError("object", "field2", "must be positive")
        ));

        ResponseEntity<ErrorResponse> response = handler.handleValidation(ex, request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertTrue(response.getBody().getMessage().contains("field1: cannot be null"));
        assertTrue(response.getBody().getMessage().contains("field2: must be positive"));
        assertEquals("BESOIN_VALIDATION_ERROR", response.getBody().getErrorCode());
    }

    @Test
    void testHandleAccessDenied() {
        AccessDeniedException ex = new AccessDeniedException("Denied");
        ResponseEntity<ErrorResponse> response = handler.handleAccessDenied(ex, request);

        assertEquals(HttpStatus.FORBIDDEN, response.getStatusCode());
        assertEquals("BESOIN_ACCESS_DENIED", response.getBody().getErrorCode());
    }

    @Test
    void testHandleAuthentication() {
        BadCredentialsException ex = new BadCredentialsException("Bad creds");
        ResponseEntity<ErrorResponse> response = handler.handleAuthentication(ex, request);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertEquals("BESOIN_UNAUTHORIZED", response.getBody().getErrorCode());
    }

    @Test
    void testHandleIllegalArgument() {
        IllegalArgumentException ex = new IllegalArgumentException("Illegal arg");
        ResponseEntity<ErrorResponse> response = handler.handleIllegalArgument(ex, request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        // Handler always returns a generic sanitized message (Fix 1 — never leak raw Java messages)
        assertEquals("Requête invalide : vérifiez les paramètres envoyés.", response.getBody().getMessage());
        assertEquals("BESOIN_BUSINESS_RULE_VIOLATION", response.getBody().getErrorCode());
    }

    @Test
    void testHandleDataIntegrity_WithRootCause() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException("Outer msg",
                new RuntimeException("Root cause msg"));
        ResponseEntity<ErrorResponse> response = handler.handleDataIntegrity(ex, request);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        // Handler always returns a generic sanitized message for data integrity violations
        assertEquals("Conflit de données : une contrainte d'intégrité a été violée.",
                response.getBody().getMessage());
        assertEquals("BESOIN_DATA_CONFLICT", response.getBody().getErrorCode());
    }

    @Test
    void testHandleDataIntegrity_WithoutRootCause() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException("Outer msg");
        ResponseEntity<ErrorResponse> response = handler.handleDataIntegrity(ex, request);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        // Handler always returns a generic sanitized message (never leaks raw DB message)
        assertEquals("Conflit de données : une contrainte d'intégrité a été violée.",
                response.getBody().getMessage());
        assertEquals("BESOIN_DATA_CONFLICT", response.getBody().getErrorCode());
    }

    @Test
    void testHandleGeneral() {
        Exception ex = new Exception("General error");
        ResponseEntity<ErrorResponse> response = handler.handleGeneral(ex, request);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertEquals("BESOIN_INTERNAL_ERROR", response.getBody().getErrorCode());
        assertNotNull(response.getBody().getTraceId());
    }
}
