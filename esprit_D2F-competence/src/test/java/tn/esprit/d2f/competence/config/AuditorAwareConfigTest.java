package tn.esprit.d2f.competence.config;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.AuditorAware;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import org.springframework.security.core.authority.AuthorityUtils;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("AuditorAwareConfig – Tests unitaires")
class AuditorAwareConfigTest {

    private final AuditorAwareConfig config = new AuditorAwareConfig();
    private final AuditorAware<String> auditorProvider = config.auditorProvider();

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("Retourne 'system' si non authentifié")
    void shouldReturnSystemWhenNoAuth() {
        SecurityContextHolder.getContext().setAuthentication(null);
        Optional<String> auditor = auditorProvider.getCurrentAuditor();
        assertThat(auditor).contains("system");
    }

    @Test
    @DisplayName("Retourne le nom de l'utilisateur pour une auth classique")
    void shouldReturnNameForBasicAuth() {
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken("user123", "pw", AuthorityUtils.createAuthorityList("ROLE_USER"));
        SecurityContextHolder.getContext().setAuthentication(auth);
        Optional<String> auditor = auditorProvider.getCurrentAuditor();
        assertThat(auditor).contains("user123");
    }

    @Test
    @DisplayName("Résout l'auditeur depuis un JWT (email > username > sub)")
    void shouldResolveFromJwt() {
        Jwt jwt = mock(Jwt.class);
        when(jwt.getClaimAsString("email")).thenReturn("test@example.com");
        
        UsernamePasswordAuthenticationToken auth = new UsernamePasswordAuthenticationToken(jwt, null, AuthorityUtils.createAuthorityList("ROLE_USER"));
        SecurityContextHolder.getContext().setAuthentication(auth);
        
        assertThat(auditorProvider.getCurrentAuditor()).contains("test@example.com");

        when(jwt.getClaimAsString("email")).thenReturn(null);
        when(jwt.getClaimAsString("preferred_username")).thenReturn("pref_user");
        assertThat(auditorProvider.getCurrentAuditor()).contains("pref_user");

        when(jwt.getClaimAsString("preferred_username")).thenReturn(null);
        when(jwt.getSubject()).thenReturn("subject-123");
        assertThat(auditorProvider.getCurrentAuditor()).contains("subject-123");
        
        when(jwt.getSubject()).thenReturn(null);
        assertThat(auditorProvider.getCurrentAuditor()).contains("system");
    }
}
