package tn.esprit.d2f.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Optional;

@Configuration
public class AuditorAwareConfig {

    private static final String SYSTEM_USER = "system";

    @Bean
    public AuditorAware<String> auditorProvider() {
        return () -> {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                return Optional.of(SYSTEM_USER);
            }
            Object principal = auth.getPrincipal();
            if (principal instanceof Jwt jwt) {
                return Optional.of(resolveFromJwt(jwt));
            }
            String name = auth.getName();
            return Optional.of(name != null ? name : SYSTEM_USER);
        };
    }

    private static String resolveFromJwt(Jwt jwt) {
        String email = jwt.getClaimAsString("email");
        if (email != null && !email.isBlank()) {
            return email;
        }
        String username = jwt.getClaimAsString("preferred_username");
        if (username != null && !username.isBlank()) {
            return username;
        }
        String sub = jwt.getSubject();
        return sub != null ? sub : SYSTEM_USER;
    }
}
