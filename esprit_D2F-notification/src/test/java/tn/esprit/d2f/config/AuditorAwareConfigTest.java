package tn.esprit.d2f.config;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.AnonymousAuthenticationToken;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.authority.AuthorityUtils;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;

@DisplayName("AuditorAwareConfig - Tests unitaires")
class AuditorAwareConfigTest {

    private final AuditorAwareConfig config = new AuditorAwareConfig();

    @AfterEach
    void cleanup() {
        SecurityContextHolder.clearContext();
    }

    @Test
    @DisplayName("auditorProvider() - doit retourner system si pas d'authentification")
    void shouldReturnSystemWhenNoAuth() {
        SecurityContextHolder.clearContext();

        Optional<String> auditor = config.auditorProvider().getCurrentAuditor();

        assertThat(auditor).contains("system");
    }

    @Test
    @DisplayName("auditorProvider() - doit retourner system pour une anonymous auth")
    void shouldReturnSystemForAnonymous() {
        Authentication anon = new AnonymousAuthenticationToken(
                "key", "anonymousUser", AuthorityUtils.createAuthorityList("ROLE_ANONYMOUS"));
        SecurityContextHolder.getContext().setAuthentication(anon);

        Optional<String> auditor = config.auditorProvider().getCurrentAuditor();

        assertThat(auditor).isPresent();
        assertThat(auditor.get()).isIn("system", "anonymousUser");
    }

    @Test
    @DisplayName("auditorProvider() - doit retourner l'email du JWT en priorité")
    void shouldReturnEmailFromJwt() {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "RS256")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .subject("subject-1")
                .claim("email", "user@example.com")
                .claim("preferred_username", "username")
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(jwt, null, AuthorityUtils.createAuthorityList("ROLE_USER"))
        );

        Optional<String> auditor = config.auditorProvider().getCurrentAuditor();

        assertThat(auditor).contains("user@example.com");
    }

    @Test
    @DisplayName("auditorProvider() - doit fallback sur preferred_username si email absent")
    void shouldFallbackToUsername() {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "RS256")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .subject("subject-1")
                .claim("preferred_username", "myUser")
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(jwt, null, AuthorityUtils.createAuthorityList("ROLE_USER"))
        );

        Optional<String> auditor = config.auditorProvider().getCurrentAuditor();

        assertThat(auditor).contains("myUser");
    }

    @Test
    @DisplayName("auditorProvider() - doit fallback sur subject si email et username absents")
    void shouldFallbackToSubject() {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "RS256")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .subject("subject-only")
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(jwt, null, AuthorityUtils.createAuthorityList("ROLE_USER"))
        );

        Optional<String> auditor = config.auditorProvider().getCurrentAuditor();

        assertThat(auditor).contains("subject-only");
    }

    @Test
    @DisplayName("auditorProvider() - doit fallback sur system si subject absent dans JWT")
    void shouldFallbackToSystemWhenJwtSubjectIsNull() {
        Jwt jwt = Jwt.withTokenValue("token")
                .header("alg", "RS256")
                .issuedAt(Instant.now())
                .expiresAt(Instant.now().plusSeconds(3600))
                .subject("")
                .claim("email", "  ")
                .build();
        SecurityContextHolder.getContext().setAuthentication(
                new UsernamePasswordAuthenticationToken(jwt, null, AuthorityUtils.createAuthorityList("ROLE_USER"))
        );

        Optional<String> auditor = config.auditorProvider().getCurrentAuditor();

        assertThat(auditor).isPresent();
    }

    @Test
    @DisplayName("auditorProvider() - doit utiliser auth.getName() pour un principal non-JWT")
    void shouldUseAuthNameForNonJwtPrincipal() {
        Authentication auth = new UsernamePasswordAuthenticationToken(
                "simpleUser", null, AuthorityUtils.createAuthorityList("ROLE_USER"));
        SecurityContextHolder.getContext().setAuthentication(auth);

        Optional<String> auditor = config.auditorProvider().getCurrentAuditor();

        assertThat(auditor).contains("simpleUser");
    }
}
