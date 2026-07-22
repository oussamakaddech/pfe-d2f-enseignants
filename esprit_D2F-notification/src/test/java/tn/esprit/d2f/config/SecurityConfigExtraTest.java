package tn.esprit.d2f.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.config.annotation.web.builders.HttpSecurity;
import org.springframework.test.util.ReflectionTestUtils;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("SecurityConfig - Tests additionnels")
class SecurityConfigExtraTest {

    @Test
    @DisplayName("SecurityConfig - doit annoter la classe correctement")
    void securityConfig_shouldHaveCorrectAnnotations() {
        assertThat(SecurityConfig.class.isAnnotationPresent(
                org.springframework.context.annotation.Configuration.class)).isTrue();
        assertThat(SecurityConfig.class.isAnnotationPresent(
                org.springframework.security.config.annotation.method.configuration.EnableMethodSecurity.class)).isTrue();
    }

    @Test
    @DisplayName("SecurityConfig - champs annotés @Value")
    void securityConfig_shouldHaveValueAnnotations() {
        try {
            var jwtSecretField = SecurityConfig.class.getDeclaredField("jwtSecret");
            assertThat(jwtSecretField.isAnnotationPresent(
                    org.springframework.beans.factory.annotation.Value.class)).isTrue();
        } catch (NoSuchFieldException e) {
            throw new AssertionError("Champ jwtSecret manquant", e);
        }
    }

    @Test
    @DisplayName("SecurityConfig - accepte une injection valide des valeurs")
    void securityConfig_shouldAcceptInjectedValues() throws Exception {
        SecurityConfig config = new SecurityConfig();
        ReflectionTestUtils.setField(config, "jwtSecret", "secret");
        ReflectionTestUtils.setField(config, "allowedOriginsRaw", "http://localhost:3000");

        var converter = config.jwtAuthenticationConverter();
        assertThat(converter).isNotNull();
    }
}
