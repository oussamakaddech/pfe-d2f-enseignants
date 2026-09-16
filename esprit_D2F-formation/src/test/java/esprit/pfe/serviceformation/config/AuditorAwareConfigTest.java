package esprit.pfe.serviceformation.config;

import org.junit.jupiter.api.AfterEach;
import org.junit.jupiter.api.Test;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.List;

import static org.assertj.core.api.Assertions.assertThat;

class AuditorAwareConfigTest {

    private final AuditorAwareConfig config = new AuditorAwareConfig();

    @AfterEach
    void tearDown() {
        SecurityContextHolder.clearContext();
    }

    @Test
    void returnsSystemWhenAuthenticationIsMissingOrNotAuthenticated() {
                assertThat(config.auditorProvider().getCurrentAuditor()).contains("system");

        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken("user", "pass"));

                assertThat(config.auditorProvider().getCurrentAuditor()).contains("system");
    }

    @Test
    void resolvesAuditorFromJwtEmailPreferredUsernameAndSubject() {
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                Jwt.withTokenValue("token")
                        .header("alg", "none")
                        .claim("email", "teacher@esprit.tn")
                        .claim("preferred_username", "teacher.username")
                        .subject("teacher-subject")
                        .build(),
                "n/a",
                List.of()));

        assertThat(config.auditorProvider().getCurrentAuditor()).contains("teacher@esprit.tn");

        SecurityContextHolder.clearContext();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                Jwt.withTokenValue("token")
                        .header("alg", "none")
                        .claim("preferred_username", "teacher.username")
                        .subject("teacher-subject")
                        .build(),
                "n/a",
                List.of()));

        assertThat(config.auditorProvider().getCurrentAuditor()).contains("teacher.username");

        SecurityContextHolder.clearContext();
        SecurityContextHolder.getContext().setAuthentication(new UsernamePasswordAuthenticationToken(
                Jwt.withTokenValue("token")
                        .header("alg", "none")
                        .subject("teacher-subject")
                        .build(),
                "n/a",
                List.of()));

                assertThat(config.auditorProvider().getCurrentAuditor()).contains("teacher-subject");
    }
}