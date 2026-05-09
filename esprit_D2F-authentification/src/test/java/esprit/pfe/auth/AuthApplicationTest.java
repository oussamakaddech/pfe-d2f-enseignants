package esprit.pfe.auth;

import org.junit.jupiter.api.Test;
import static org.junit.jupiter.api.Assertions.assertNotNull;

class AuthApplicationTest {

    @Test
    void contextLoads() {
        // Simple assertion to verify the class is present and testable
        AuthApplication app = new AuthApplication();
        assertNotNull(app);
    }
}
