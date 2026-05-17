package esprit.pfe.serviceevaluation;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
class ServiceEvaluationApplicationTest {

    @Test
    void contextLoads() {
        assertTrue(true, "Spring context should load successfully");
    }
}
