package tn.esprit.d2f.config;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

class AuditorAwareConfigTest {

    private final AuditorAwareConfig config = new AuditorAwareConfig();

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void auditorProviderWhenAuthenticationIsMissingReturnsSystemUser() {
        SecurityContextHolder.clearContext();

        AuditorAware<String> auditorAware = config.auditorProvider();

        assertEquals("system", auditorAware.getCurrentAuditor().orElseThrow());
    }

    @Test
    void auditorProviderWhenAuthenticationIsAnonymousReturnsSystemUser() {
        Authentication authentication = mock(Authentication.class);
        when(authentication.isAuthenticated()).thenReturn(false);
        SecurityContextHolder.getContext().setAuthentication(authentication);

        AuditorAware<String> auditorAware = config.auditorProvider();

        assertEquals("system", auditorAware.getCurrentAuditor().orElseThrow());
    }

    @Test
    void auditorProviderWhenJwtHasEmailReturnsEmail() {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .claim("email", "auditor@example.com")
                .build();

        Authentication authentication = mock(Authentication.class);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(jwt);
        SecurityContextHolder.getContext().setAuthentication(authentication);

        AuditorAware<String> auditorAware = config.auditorProvider();

        assertEquals("auditor@example.com", auditorAware.getCurrentAuditor().orElseThrow());
    }

    @Test
    void auditorProviderWhenJwtHasPreferredUsernameReturnsPreferredUsername() {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .claim("preferred_username", "preferred.user")
                .build();

        Authentication authentication = mock(Authentication.class);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(jwt);
        SecurityContextHolder.getContext().setAuthentication(authentication);

        AuditorAware<String> auditorAware = config.auditorProvider();

        assertEquals("preferred.user", auditorAware.getCurrentAuditor().orElseThrow());
    }

    @Test
    void auditorProviderWhenJwtHasNoClaimsReturnsSubject() {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "none")
                .subject("subject.user")
                .build();

        Authentication authentication = mock(Authentication.class);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(jwt);
        SecurityContextHolder.getContext().setAuthentication(authentication);

        AuditorAware<String> auditorAware = config.auditorProvider();

        assertEquals("subject.user", auditorAware.getCurrentAuditor().orElseThrow());
    }

    @Test
    void auditorProviderWhenPrincipalIsNotJwtReturnsAuthenticationName() {
        Authentication authentication = mock(Authentication.class);
        when(authentication.isAuthenticated()).thenReturn(true);
        when(authentication.getPrincipal()).thenReturn(new Object());
        when(authentication.getName()).thenReturn("jane.doe");
        SecurityContextHolder.getContext().setAuthentication(authentication);

        AuditorAware<String> auditorAware = config.auditorProvider();

        assertEquals("jane.doe", auditorAware.getCurrentAuditor().orElseThrow());
    }
}