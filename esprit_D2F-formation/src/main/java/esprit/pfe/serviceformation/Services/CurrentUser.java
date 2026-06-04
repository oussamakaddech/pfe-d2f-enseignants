package esprit.pfe.serviceformation.services;

import org.springframework.security.oauth2.jwt.Jwt;

import java.util.HashSet;
import java.util.Set;

/**
 * Contexte de l'utilisateur authentifié, résolu depuis le JWT (claims sub,
 * userId, email, scope). Sert au contrôle d'accès row-level de la page unifiée.
 * Les rôles sont normalisés SANS préfixe ROLE_ (ex. "CHEF_DEPARTEMENT").
 */
public record CurrentUser(String username, String userId, String email, Set<String> roles) {

    public static CurrentUser fromJwt(Jwt jwt) {
        if (jwt == null) {
            return new CurrentUser(null, null, null, Set.of());
        }
        Set<String> roles = new HashSet<>();
        String scope = jwt.getClaimAsString("scope");
        if (scope != null && !scope.isBlank()) {
            for (String token : scope.split(" ")) {
                String r = token.trim().toUpperCase();
                if (r.startsWith("ROLE_")) {
                    r = r.substring(5);
                }
                if (!r.isBlank()) {
                    roles.add(r);
                }
            }
        }
        return new CurrentUser(
                jwt.getSubject(),
                jwt.getClaimAsString("userId"),
                jwt.getClaimAsString("email"),
                roles);
    }

    public boolean hasRole(String role) {
        return roles.contains(role);
    }

    public boolean isAdmin() {
        return roles.contains("ADMIN");
    }

    /** Vue complète, sans restriction de département. */
    public boolean hasGlobalScope() {
        return roles.contains("ADMIN") || roles.contains("CUP")
                || roles.contains("D2F") || roles.contains("RESPONSABLE_DOSSIER");
    }

    /** Périmètre restreint à son propre département. */
    public boolean isDepartmentScoped() {
        return roles.contains("CHEF_DEPARTEMENT") && !hasGlobalScope();
    }
}
