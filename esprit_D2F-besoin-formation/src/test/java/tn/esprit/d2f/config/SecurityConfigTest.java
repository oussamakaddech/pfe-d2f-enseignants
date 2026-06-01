package tn.esprit.d2f.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.core.Authentication;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.cors.CorsConfiguration;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import java.util.Map;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

class SecurityConfigTest {

    private SecurityConfig config;

    @BeforeEach
    void setUp() {
        config = new SecurityConfig();
        ReflectionTestUtils.setField(config, "jwtSecret", "une-cle-secrete-tres-longue-pour-hs512-qui-depasse-64-caracteres-sinon-ca-plante!");
        ReflectionTestUtils.setField(config, "allowedOriginsRaw", "http://localhost:5173,http://localhost:3000");
    }

    @Test
    void testJwtDecoder() {
        JwtDecoder decoder = config.jwtDecoder();
        assertNotNull(decoder);
    }

    @Test
    void testJwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = config.jwtAuthenticationConverter();
        assertNotNull(converter);
        Jwt jwt = Jwt.withTokenValue("token")
            .header("alg", "none")
            .claim("scope", "ROLE_ADMIN ROLE_CUP")
            .build();

        Authentication authentication = converter.convert(jwt);

        assertThat(authentication).isNotNull();
        assertThat(authentication.getAuthorities())
            .extracting("authority")
            .containsExactly("ROLE_ADMIN", "ROLE_CUP");
    }

    @Test
    @SuppressWarnings("unchecked")
    void testCorsConfigurer() {
        WebMvcConfigurer corsConfigurer = config.corsConfigurer();
        assertNotNull(corsConfigurer);

        CorsRegistry registry = new CorsRegistry();

        corsConfigurer.addCorsMappings(registry);

        Map<String, CorsConfiguration> configurations =
                ReflectionTestUtils.invokeMethod(registry, "getCorsConfigurations");
        assertThat(configurations).containsKey("/**");
        assertThat(configurations.get("/**").getAllowedOrigins())
            .containsExactly("http://localhost:5173", "http://localhost:3000");
        assertThat(configurations.get("/**").getAllowedMethods())
            .containsExactly("GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS");
        assertTrue(configurations.get("/**").getAllowCredentials());
    }

    @Test
    @SuppressWarnings("unchecked")
    void testSecurityFilterChain() throws Exception {
        org.springframework.security.config.annotation.web.builders.HttpSecurity http = mock(org.springframework.security.config.annotation.web.builders.HttpSecurity.class);
        
        when(http.cors(any(org.springframework.security.config.Customizer.class))).thenReturn(http);
        when(http.csrf(any(org.springframework.security.config.Customizer.class))).thenReturn(http);
        when(http.sessionManagement(any(org.springframework.security.config.Customizer.class))).thenReturn(http);
        when(http.authorizeHttpRequests(any(org.springframework.security.config.Customizer.class))).thenReturn(http);
        when(http.oauth2ResourceServer(any(org.springframework.security.config.Customizer.class))).thenReturn(http);
        when(http.build()).thenReturn(mock(org.springframework.security.web.DefaultSecurityFilterChain.class));
        
        org.springframework.security.web.SecurityFilterChain chain = config.securityFilterChain(http);
        
        assertNotNull(chain);
        verify(http).cors(any(org.springframework.security.config.Customizer.class));
        verify(http).csrf(any(org.springframework.security.config.Customizer.class));
    }
}
