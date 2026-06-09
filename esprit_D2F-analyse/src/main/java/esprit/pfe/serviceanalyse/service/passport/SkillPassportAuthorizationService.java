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
 *  - ROLE_ADMIN / ROLE_CUP → accès à TOUS les passeports (périmètre PFE global)
 *  - Tout autre utilisateur authentifié (ENSEIGNANT, ANIMATEUR, FORMATEUR,
 *    CHEF_DEPARTEMENT, RESPONSABLE_DOSSIER) → accès uniquement à SON propre
 *    passeport. Cohérent avec l'endpoint /me et avec la parité
 *    ANIMATEUR ≡ ENSEIGNANT appliquée dans le reste de la matrice.
 *
 * NB : faute de scoping par département dans ce service, CHEF_DEPARTEMENT
 * reste en moindre privilège (son propre passeport). L'accès « tous les
 * passeports de mon département » nécessiterait de comparer les départements
 * côté assembleur — évolution future.
 */
@Slf4j
@Service
public class SkillPassportAuthorizationService {

    private static final String ROLE_ADMIN = "ROLE_ADMIN";
    private static final String ROLE_CUP   = "ROLE_CUP";

    /**
     * Vérifie que l'utilisateur authentifié peut accéder au passeport de {@code targetUsername}.
     */
    public void checkAccess(Authentication authentication, String targetUsername) {
        if (authentication == null) {
            throw new PassportAccessDeniedException("Authentification requise.");
        }

        Collection<? extends GrantedAuthority> authorities = authentication.getAuthorities();

        // Accès global : administration et coordination pédagogique.
        if (hasRole(authorities, ROLE_ADMIN) || hasRole(authorities, ROLE_CUP)) {
            return;
        }

        // Accès self : tout utilisateur authentifié peut consulter SON propre
        // passeport, quel que soit son rôle (enseignant, animateur, formateur,
        // chef de département, responsable de dossier).
        String currentUsername = extractUsername(authentication);
        if (currentUsername != null && currentUsername.equals(targetUsername)) {
            return;
        }

        throw new PassportAccessDeniedException(
                "Accès refusé : vous ne pouvez consulter que votre propre passeport de compétences.");
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
