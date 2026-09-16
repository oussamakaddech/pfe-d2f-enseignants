package esprit.pfe.auth.error;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ExceptionsTest {

    @Test
    void testBadRequestException() {
        BadRequestException ex = new BadRequestException("Bad request");
        assertEquals("Bad request", ex.getErrorMessage());
        assertEquals(400, ex.getStatus());
        assertEquals("Bad request", ex.getMessage());
    }

    @Test
    void testLoginException() {
        LoginException ex = new LoginException("Login failed");
        assertEquals("Login failed", ex.getErrorMessage());
        assertEquals(401, ex.getStatus());
        assertEquals("Login failed", ex.getMessage());
    }
}
