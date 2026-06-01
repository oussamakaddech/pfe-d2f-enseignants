package esprit.pfe.serviceformation;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;

@SpringBootTest(classes = ServiceFormationApplication.class)
@ActiveProfiles("test")
class ServiceFormationApplicationTest {

    @Test
    void contextLoads() {
        // Just tests if the context can load
    }

    @Test
    void testMainMethod() {
        assertDoesNotThrow(() -> ServiceFormationApplication.main(new String[]{}));
    }
}
