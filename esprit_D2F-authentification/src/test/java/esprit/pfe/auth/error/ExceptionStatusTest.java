package esprit.pfe.auth.error;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.*;

class ExceptionStatusTest {

    @Test
    void badRequestException_ShouldReturn400() {
        BadRequestException ex = new BadRequestException("Bad request error");
        assertEquals(400, ex.getStatus());
        assertEquals("Bad request error", ex.getErrorMessage());
    }

    @Test
    void loginException_ShouldReturn401() {
        LoginException ex = new LoginException("Login failed");
        assertEquals(401, ex.getStatus());
        assertEquals("Login failed", ex.getErrorMessage());
    }
}
