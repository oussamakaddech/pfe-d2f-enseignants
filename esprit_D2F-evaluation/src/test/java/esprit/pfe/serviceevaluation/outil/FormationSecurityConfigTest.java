package esprit.pfe.serviceevaluation.outil;

import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.TestPropertySource;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;

import static org.junit.jupiter.api.Assertions.*;

@SpringBootTest
@ActiveProfiles("test")
@TestPropertySource(properties = "jwt.secret=test-secret-key-for-testing-purposes-only-must-beat-512-bits")
class FormationSecurityConfigTest {

    @Autowired
    private FormationSecurityConfig formationSecurityConfig;

    @Test
    void testFormationSecurityConfigCreation() {
        // Test that we can create an instance of FormationSecurityConfig
        assertNotNull(formationSecurityConfig, "FormationSecurityConfig should be instantiable");
    }

    @Test
    void testSecurityConfig() {
        // Test that we can get a JwtAuthenticationConverter
        JwtAuthenticationConverter converter = formationSecurityConfig.jwtAuthenticationConverter();
        assertNotNull(converter, "JwtAuthenticationConverter should not be null");

        // Test that we can get a JwtDecoder
        JwtDecoder decoder = formationSecurityConfig.jwtDecoder();
        assertNotNull(decoder, "JwtDecoder should not be null");
    }
}
