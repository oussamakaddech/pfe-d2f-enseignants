package tn.esprit.d2f.competence.config;

import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.data.domain.AuditorAware;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

import java.util.Optional;

/**
 * Fournit le bean {@link AuditorAware} utilisé par Spring Data JPA Auditing
 * pour peupler automatiquement les champs {@code createdBy} et {@code updatedBy}
 * de {@link tn.esprit.d2f.competence.entity.BaseAuditEntity}.
 *
 * <p>Le "qui" est extrait du subject ({@code sub}) du JWT porteur de la requête
 * courante, via le {@link SecurityContextHolder}. Si aucune authentification
 * n'est disponible (appel système, tests), la valeur {@code "system"} est renvoyée.
 */
@Configuration
public class AuditorAwareConfig {

    @Bean
    public AuditorAware<String> auditorProvider() {
        return () -> {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth == null || !auth.isAuthenticated()) {
                return Optional.of("system");
            }
            Object principal = auth.getPrincipal();
            if (principal instanceof Jwt jwt) {
                // Priorité : claim "email", sinon "preferred_username", sinon "sub"
                String email = jwt.getClaimAsString("email");
                if (email != null && !email.isBlank()) return Optional.of(email);
                String username = jwt.getClaimAsString("preferred_username");
                if (username != null && !username.isBlank()) return Optional.of(username);
                String sub = jwt.getSubject();
                return Optional.ofNullable(sub != null ? sub : "system");
            }
            // Fallback sur le nom Spring Security standard
            String name = auth.getName();
            return Optional.of(name != null ? name : "system");
        };
    }
}
