package esprit.pfe.auth.error;

import jakarta.servlet.http.HttpServletRequest;
import org.junit.jupiter.api.Test;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;

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
}
