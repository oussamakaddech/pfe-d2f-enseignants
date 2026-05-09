package esprit.pfe.auth.security;

import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.mock.web.MockHttpServletRequest;
import org.springframework.mock.web.MockHttpServletResponse;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.core.AuthenticationException;
import org.springframework.security.core.userdetails.UserDetailsService;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.security.oauth2.jwt.JwtDecoder;
import org.springframework.security.oauth2.jwt.JwtEncoder;
import org.springframework.security.oauth2.server.resource.authentication.JwtAuthenticationConverter;
import org.springframework.security.web.AuthenticationEntryPoint;
import org.springframework.security.web.access.AccessDeniedHandler;
import org.springframework.test.util.ReflectionTestUtils;
import org.springframework.web.cors.CorsConfigurationSource;

import jakarta.servlet.http.HttpServletResponse;
import java.util.Collection;
import org.springframework.security.core.GrantedAuthority;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.mock;

class SecurityConfigTest {

    private SecurityConfig config;

    @BeforeEach
    void setUp() {
        config = new SecurityConfig();
        ReflectionTestUtils.setField(config, "secretKey", "une-cle-secrete-de-test-assez-longue-pour-hs512-au-moins-64-caracteres-de-longueur-minimum-sinon-nimbus-va-planter!");
        ReflectionTestUtils.setField(config, "allowedOriginsRaw", "http://localhost:3000,http://localhost:5173");
    }

    @Test
    void testPasswordEncoder() {
        PasswordEncoder encoder = config.passwordEncoder();
        assertNotNull(encoder);
        assertTrue(encoder.encode("password").startsWith("$2a$"));
    }

    @Test
    void testJwtEncoderAndDecoder() {
        JwtEncoder encoder = config.jwtEncoder();
        assertNotNull(encoder);
        JwtDecoder decoder = config.jwtDecoder();
        assertNotNull(decoder);
    }

    @Test
    void testAuthenticationManager() {
        UserDetailsService userDetailsService = mock(UserDetailsService.class);
        AuthenticationManager authManager = config.authenticationManager(userDetailsService);
        assertNotNull(authManager);
    }

    @Test
    void testCorsConfigurationSource() {
        CorsConfigurationSource source = config.corsConfigurationSource();
        assertNotNull(source);
        MockHttpServletRequest request = new MockHttpServletRequest();
        assertNotNull(source.getCorsConfiguration(request));
        assertEquals(2, source.getCorsConfiguration(request).getAllowedOrigins().size());
    }

    @Test
    void testAuthenticationEntryPoint() throws Exception {
        AuthenticationEntryPoint entryPoint = config.authenticationEntryPoint();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/test");
        MockHttpServletResponse response = new MockHttpServletResponse();
        
        AuthenticationException authException = mock(AuthenticationException.class);
        entryPoint.commence(request, response, authException);
        
        assertEquals(HttpServletResponse.SC_UNAUTHORIZED, response.getStatus());
        assertTrue(response.getContentAsString().contains("AUTH-401"));
    }

    @Test
    void testAccessDeniedHandler() throws Exception {
        AccessDeniedHandler handler = config.accessDeniedHandler();
        MockHttpServletRequest request = new MockHttpServletRequest();
        request.setRequestURI("/api/test");
        MockHttpServletResponse response = new MockHttpServletResponse();
        
        AccessDeniedException accessException = mock(AccessDeniedException.class);
        handler.handle(request, response, accessException);
        
        assertEquals(HttpServletResponse.SC_FORBIDDEN, response.getStatus());
        assertTrue(response.getContentAsString().contains("AUTH-403"));
    }

    @Test
    void testJwtAuthenticationConverter() {
        JwtAuthenticationConverter converter = config.jwtAuthenticationConverter();
        assertNotNull(converter);
        
        Jwt jwt = mock(Jwt.class);
        org.mockito.Mockito.when(jwt.getClaimAsString("scope")).thenReturn("admin user ROLE_TEST");
        
        // This relies on the internal JwtGrantedAuthoritiesConverter we set in the lambda
        Collection<GrantedAuthority> authorities = (Collection<GrantedAuthority>) converter.convert(jwt).getAuthorities();
        assertNotNull(authorities);
        // It should convert "admin" to "ROLE_ADMIN", "user" to "ROLE_USER", "ROLE_TEST" stays "ROLE_TEST"
        assertTrue(authorities.stream().anyMatch(a -> a.getAuthority().equals("ROLE_ADMIN")));
        assertTrue(authorities.stream().anyMatch(a -> a.getAuthority().equals("ROLE_TEST")));
    }
}
