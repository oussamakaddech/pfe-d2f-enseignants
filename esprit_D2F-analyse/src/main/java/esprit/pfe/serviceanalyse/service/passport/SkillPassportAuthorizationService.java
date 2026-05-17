package esprit.pfe.serviceanalyse.service.passport;

import esprit.pfe.serviceanalyse.exception.PassportAccessDeniedException;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.Collection;

/**
 * Règles RBAC du Passeport de Compétences :
 *  - ROLE_ADMIN      → accès à tous les passeports
 *  - ROLE_CUP        → accès à tous les enseignants (périmètre global pour le PFE)
 *  - ROLE_D2F        → accès à tous les enseignants
 *  - ROLE_ENSEIGNANT → accès uniquement à son propre passeport
 *  - Autres          → 403
 */
@Slf4j
@Service
public class SkillPassportAuthorizationService {

    private static final String ROLE_ADMIN = "ROLE_ADMIN";
    private static final String ROLE_CUP   = "ROLE_CUP";
    private static final String ROLE_D2F   = "ROLE_D2F";
    private static final String ROLE_ENSEIGNANT = "ROLE_ENSEIGNANT";

    /**
     * Vérifie que l'utilisateur authentifié peut accéder au passeport de {@code targetUsername}.
     */
    public void checkAccess(Authentication authentication, String targetUsername) {
        if (authentication == null) {
            throw new PassportAccessDeniedException("Authentification requise.");
        }

        Collection<? extends GrantedAuthority> authorities = authentication.getAuthorities();
        boolean isAdmin = hasRole(authorities, ROLE_ADMIN);
        boolean isCup   = hasRole(authorities, ROLE_CUP);
        boolean isD2f   = hasRole(authorities, ROLE_D2F);
        boolean isEnseignant = hasRole(authorities, ROLE_ENSEIGNANT);

        if (isAdmin || isCup || isD2f) {
            return; // accès global autorisé
        }

        if (isEnseignant) {
            String currentUsername = extractUsername(authentication);
            if (currentUsername != null && currentUsername.equals(targetUsername)) {
                return; // l'enseignant accède à son propre passeport
            }
            throw new PassportAccessDeniedException(
                    "Un enseignant ne peut consulter que son propre passeport de compétences.");
        }

        throw new PassportAccessDeniedException(
                "Accès refusé : rôle insuffisant pour consulter ce passeport de compétences.");
    }

    /**
     * Extrait le username depuis le JWT (claim "sub").
     */
    public String extractUsername(Authentication authentication) {
        if (authentication.getPrincipal() instanceof Jwt jwt) {
            // "sub" contient le username dans ce projet
            return jwt.getSubject();
        }
        return authentication.getName();
    }

    private boolean hasRole(Collection<? extends GrantedAuthority> authorities, String role) {
        return authorities.stream().anyMatch(a -> role.equals(a.getAuthority()));
    }
}
