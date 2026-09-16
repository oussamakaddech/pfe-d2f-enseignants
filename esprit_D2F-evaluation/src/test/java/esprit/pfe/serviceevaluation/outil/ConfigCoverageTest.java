package esprit.pfe.serviceevaluation.outil;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;

import static org.junit.jupiter.api.Assertions.assertNotNull;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = "jwt.secret=test-secret-key-for-testing-purposes-only-must-beat-512-bits")
class ConfigCoverageTest {

    @Autowired
    private SecurityFilterChain securityFilterChain;

    @Autowired
    private ObjectMapper objectMapper;

    @Autowired
    private MessageConverter messageConverter;

    @Test
    void testSecurityConfigLoads() {
        assertNotNull(securityFilterChain);
    }

    @Test
    void testJmsConfig() {
        assertNotNull(messageConverter);
    }
}
