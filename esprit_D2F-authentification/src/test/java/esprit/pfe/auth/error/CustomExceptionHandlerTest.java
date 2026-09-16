package esprit.pfe.auth.error;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.AuthenticationException;
import org.springframework.validation.BindingResult;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class CustomExceptionHandlerTest {

    private final CustomExceptionHandler handler = new CustomExceptionHandler();

    @Test
    void handleLoginException_ShouldReturnCustomError() {
        LoginException ex = new LoginException("Login failed");
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/api/login");

        ResponseEntity<CustomErrorResponse> response = handler.handleLoginException(ex, request);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Login failed", response.getBody().getMessage());
        assertEquals("/api/login", response.getBody().getPath());
    }

    @Test
    void handleBadRequestException_ShouldReturnCustomError() {
        BadRequestException ex = new BadRequestException("Bad request");
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/api/test");

        ResponseEntity<CustomErrorResponse> response = handler.handleBadRequestException(ex, request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Bad request", response.getBody().getMessage());
    }
    
    @Test
    void handleTokenExpiredException_ShouldReturnCustomError() {
        TokenExpiredException ex = new TokenExpiredException("Token expired");
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/api/reset-password");

        ResponseEntity<CustomErrorResponse> response = handler.handleTokenExpiredException(ex, request);

        assertEquals(HttpStatus.GONE, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Token expired", response.getBody().getMessage());
        assertEquals("/api/reset-password", response.getBody().getPath());
    }

    @Test
    void handleDataIntegrityViolation_ShouldReturn409() {
        DataIntegrityViolationException ex = new DataIntegrityViolationException("constraint violation");
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/api/account/create");

        ResponseEntity<CustomErrorResponse> response = handler.handleDataIntegrityViolation(ex, request);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(409, response.getBody().getStatus());
    }

    @Test
    void handleConflictException_ShouldReturn409() {
        ConflictException ex = new ConflictException("Username already taken");
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/api/account/create");

        ResponseEntity<CustomErrorResponse> response = handler.handleConflictException(ex, request);

        assertEquals(HttpStatus.CONFLICT, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("Username already taken", response.getBody().getMessage());
    }

    @Test
    void handleResourceNotFoundException_ShouldReturn404() {
        ResourceNotFoundException ex = new ResourceNotFoundException("User not found");
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/api/account/xyz");

        ResponseEntity<CustomErrorResponse> response = handler.handleResourceNotFoundException(ex, request);

        assertEquals(HttpStatus.NOT_FOUND, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals("User not found", response.getBody().getMessage());
    }

    @Test
    void handleValidationException_WithFieldError_UsesFieldMessage() {
        MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
        BindingResult bindingResult = mock(BindingResult.class);
        FieldError fieldError = new FieldError("signupRequest", "username", "must not be blank");
        when(ex.getBindingResult()).thenReturn(bindingResult);
        when(bindingResult.getFieldError()).thenReturn(fieldError);
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/api/auth/signup");

        ResponseEntity<CustomErrorResponse> response = handler.handleValidationException(ex, request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("must not be blank", response.getBody().getMessage());
    }

    @Test
    void handleValidationException_WithNullFieldError_UsesDefaultMessage() {
        MethodArgumentNotValidException ex = mock(MethodArgumentNotValidException.class);
        BindingResult bindingResult = mock(BindingResult.class);
        when(ex.getBindingResult()).thenReturn(bindingResult);
        when(bindingResult.getFieldError()).thenReturn(null);
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/api/auth/signup");

        ResponseEntity<CustomErrorResponse> response = handler.handleValidationException(ex, request);

        assertEquals(HttpStatus.BAD_REQUEST, response.getStatusCode());
        assertEquals("Validation failed", response.getBody().getMessage());
    }

    @Test
    void handleAuthenticationException_ShouldReturn401() {
        AuthenticationException ex = mock(AuthenticationException.class);
        when(ex.getMessage()).thenReturn("Bad credentials");
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/api/auth/refresh");

        ResponseEntity<CustomErrorResponse> response = handler.handleAuthenticationException(ex, request);

        assertEquals(HttpStatus.UNAUTHORIZED, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(401, response.getBody().getStatus());
    }

    @Test
    void handleUnexpectedException_ShouldReturn500WithTraceId() {
        Exception ex = new RuntimeException("Unexpected failure");
        HttpServletRequest request = mock(HttpServletRequest.class);
        when(request.getRequestURI()).thenReturn("/api/some/endpoint");

        ResponseEntity<CustomErrorResponse> response = handler.handleUnexpectedException(ex, request);

        assertEquals(HttpStatus.INTERNAL_SERVER_ERROR, response.getStatusCode());
        assertNotNull(response.getBody());
        assertEquals(500, response.getBody().getStatus());
        assertNotNull(response.getBody().getTraceId());
        assertEquals("Une erreur interne est survenue.", response.getBody().getMessage());
    }
}
