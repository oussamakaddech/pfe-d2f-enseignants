package esprit.pfe.auth;

import org.junit.jupiter.api.Test;
import org.springframework.boot.SpringApplication;
import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

class AuthApplicationTest {

    @Test
    void contextLoads() {
        AuthApplication app = new AuthApplication();
        assertNotNull(app);
    }

    @Test
    void main_shouldCallSpringApplicationRun() {
        try (var mockStatic = mockStatic(SpringApplication.class)) {
            mockStatic.when(() -> SpringApplication.run(AuthApplication.class, new String[]{}))
                    .thenReturn(null);

            AuthApplication.main(new String[]{});

            mockStatic.verify(() -> SpringApplication.run(AuthApplication.class, new String[]{}));
        }
    }
}
