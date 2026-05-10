package esprit.pfe.servicecertificat.outil;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.context.TestPropertySource;

import static org.assertj.core.api.Assertions.assertThat;

@SpringBootTest
@TestPropertySource(properties = {"jwt.secret=test-secret-key-for-testing-purposes-only-must-be-at-least-512-bits"})
@DisplayName("FormationSecurityConfig - Tests d'intégration")
class FormationSecurityConfigTest {

    @Value("${jwt.secret}")
    private String jwtSecret;

    @Test
    @DisplayName("jwt.secret doit être injecté correctement")
    void jwtSecretInjected() {
        assertThat(jwtSecret).isNotNull()
                .isNotEmpty();
    }

    @Test
    @DisplayName("La configuration doit charger sans erreur")
    void configLoadsWithoutError() {
        assertThat(jwtSecret).isEqualTo("test-secret-key-for-testing-purposes-only-must-be-at-least-512-bits");
    }
}