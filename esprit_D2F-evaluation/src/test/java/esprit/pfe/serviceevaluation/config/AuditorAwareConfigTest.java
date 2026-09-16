package esprit.pfe.serviceevaluation.config;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContext;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

@DisplayName("AuditorAwareConfig - Tests unitaires")
class AuditorAwareConfigTest {

    private final AuditorAwareConfig config = new AuditorAwareConfig();
    private AuditorAware<String> auditorProvider;
    private SecurityContext originalContext;

    @BeforeEach
    void setUp() {
        originalContext = SecurityContextHolder.getContext();
        SecurityContextHolder.setContext(SecurityContextHolder.createEmptyContext());
        auditorProvider = config.auditorProvider();
    }

    @AfterEach
    void tearDown() {
        SecurityContextHolder.setContext(originalContext);
    }

    @Test
    @DisplayName("should return 'system' when Authentication is null")
    void whenAuthenticationIsNull_shouldReturnSystem() {
        SecurityContextHolder.getContext().setAuthentication(null);
        Optional<String> auditor = auditorProvider.getCurrentAuditor();
        assertThat(auditor).contains("system");
    }

    @Test
    @DisplayName("should return 'system' when Authentication is not authenticated")
    void whenAuthenticationIsNotAuthenticated_shouldReturnSystem() {
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(false);
        SecurityContextHolder.getContext().setAuthentication(auth);

        Optional<String> auditor = auditorProvider.getCurrentAuditor();
        assertThat(auditor).contains("system");
    }

    @Test
    @DisplayName("should return 'system' when principal is not JWT and name is null")
    void whenPrincipalNotJwtAndNameIsNull_shouldReturnSystem() {
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getPrincipal()).thenReturn("not-a-jwt");
        when(auth.getName()).thenReturn(null);
        SecurityContextHolder.getContext().setAuthentication(auth);

        Optional<String> auditor = auditorProvider.getCurrentAuditor();
        assertThat(auditor).contains("system");
    }

    @Test
    @DisplayName("should return name when principal is not JWT and name is not null")
    void whenPrincipalNotJwtAndNameIsNotNull_shouldReturnName() {
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        when(auth.getPrincipal()).thenReturn("not-a-jwt");
        when(auth.getName()).thenReturn("john_doe");
        SecurityContextHolder.getContext().setAuthentication(auth);

        Optional<String> auditor = auditorProvider.getCurrentAuditor();
        assertThat(auditor).contains("john_doe");
    }

    @Test
    @DisplayName("should return email when principal is JWT with email claim")
    void whenPrincipalIsJwtWithEmail_shouldReturnEmail() {
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        Jwt jwt = mock(Jwt.class);
        when(auth.getPrincipal()).thenReturn(jwt);
        when(jwt.getClaimAsString("email")).thenReturn("john.doe@test.com");
        SecurityContextHolder.getContext().setAuthentication(auth);

        Optional<String> auditor = auditorProvider.getCurrentAuditor();
        assertThat(auditor).contains("john.doe@test.com");
    }

    @Test
    @DisplayName("should return username when principal is JWT with preferred_username claim and no email")
    void whenPrincipalIsJwtWithUsername_shouldReturnUsername() {
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        Jwt jwt = mock(Jwt.class);
        when(auth.getPrincipal()).thenReturn(jwt);
        when(jwt.getClaimAsString("email")).thenReturn(null);
        when(jwt.getClaimAsString("preferred_username")).thenReturn("jdoe");
        SecurityContextHolder.getContext().setAuthentication(auth);

        Optional<String> auditor = auditorProvider.getCurrentAuditor();
        assertThat(auditor).contains("jdoe");
    }

    @Test
    @DisplayName("should return subject when principal is JWT with subject and no email/username")
    void whenPrincipalIsJwtWithSubject_shouldReturnSubject() {
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        Jwt jwt = mock(Jwt.class);
        when(auth.getPrincipal()).thenReturn(jwt);
        when(jwt.getClaimAsString("email")).thenReturn("");
        when(jwt.getClaimAsString("preferred_username")).thenReturn(" ");
        when(jwt.getSubject()).thenReturn("user-sub-123");
        SecurityContextHolder.getContext().setAuthentication(auth);

        Optional<String> auditor = auditorProvider.getCurrentAuditor();
        assertThat(auditor).contains("user-sub-123");
    }

    @Test
    @DisplayName("should return 'system' when principal is JWT with no claims or subject")
    void whenPrincipalIsJwtWithNoClaims_shouldReturnSystem() {
        Authentication auth = mock(Authentication.class);
        when(auth.isAuthenticated()).thenReturn(true);
        Jwt jwt = mock(Jwt.class);
        when(auth.getPrincipal()).thenReturn(jwt);
        when(jwt.getClaimAsString("email")).thenReturn(null);
        when(jwt.getClaimAsString("preferred_username")).thenReturn(null);
        when(jwt.getSubject()).thenReturn(null);
        SecurityContextHolder.getContext().setAuthentication(auth);

        Optional<String> auditor = auditorProvider.getCurrentAuditor();
        assertThat(auditor).contains("system");
    }
}
