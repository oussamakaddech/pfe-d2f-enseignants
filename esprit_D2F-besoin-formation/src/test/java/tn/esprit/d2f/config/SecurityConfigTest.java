package tn.esprit.d2f.config;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.servlet.config.annotation.CorsRegistry;
import org.springframework.web.servlet.config.annotation.WebMvcConfigurer;

import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.anyString;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;
import org.springframework.web.servlet.config.annotation.CorsRegistration;

class SecurityConfigTest {

    private SecurityConfig config;

    @BeforeEach
    void setUp() {
        config = new SecurityConfig();
        ReflectionTestUtils.setField(config, "jwtSecret", "une-cle-secrete-tres-longue-pour-hs512-qui-depasse-64-caracteres-sinon-ca-plante!");
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
    }

    @Test
    void testCorsConfigurer() {
        WebMvcConfigurer corsConfigurer = config.corsConfigurer();
        assertNotNull(corsConfigurer);

        CorsRegistry registry = mock(CorsRegistry.class);
        CorsRegistration registration = mock(CorsRegistration.class);
        
        when(registry.addMapping("/**")).thenReturn(registration);
        when(registration.allowedOriginPatterns(anyString(), anyString(), anyString())).thenReturn(registration);
        when(registration.allowedMethods(anyString(), anyString(), anyString(), anyString(), anyString(), anyString())).thenReturn(registration);
        when(registration.allowedHeaders(anyString())).thenReturn(registration);
        when(registration.allowCredentials(true)).thenReturn(registration);

        corsConfigurer.addCorsMappings(registry);

        verify(registry).addMapping("/**");
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
