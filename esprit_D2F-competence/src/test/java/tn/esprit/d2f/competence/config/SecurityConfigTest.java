package tn.esprit.d2f.competence.config;

import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.SecurityFilterChain;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

@SpringBootTest
@ActiveProfiles("test")
@DisplayName("SecurityConfig – Tests de configuration")
class SecurityConfigTest {

    @Autowired
    private ApplicationContext context;

    @Test
    @DisplayName("Vérifie que les beans de sécurité sont bien chargés")
    void shouldLoadSecurityBeans() {
        assertThat(context.getBean(SecurityFilterChain.class)).isNotNull();
        assertThat(context.getBean(JwtDecoder.class)).isNotNull();
        assertThat(context.getBean(JwtAuthenticationConverter.class)).isNotNull();
    }

    @Test
    @DisplayName("Vérifie la configuration CORS")
    void testCorsConfigurer() {
        SecurityConfig config = new SecurityConfig();
        WebMvcConfigurer configurer = config.corsConfigurer();
        assertThat(configurer).isNotNull();
        
        CorsRegistry registry = mock(CorsRegistry.class);
        org.springframework.web.servlet.config.annotation.CorsRegistration registration = mock(org.springframework.web.servlet.config.annotation.CorsRegistration.class, RETURNS_SELF);
        
        when(registry.addMapping("/**")).thenReturn(registration);

        configurer.addCorsMappings(registry);
        
        verify(registry).addMapping("/**");
        verify(registration).allowedMethods("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS");
    }
}
