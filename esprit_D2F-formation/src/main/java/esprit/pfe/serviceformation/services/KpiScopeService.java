package esprit.pfe.serviceformation.services;

import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.exception.AccessDeniedException;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Périmètre KPI résolu côté serveur (JAMAIS depuis le frontend) :
 * <ul>
 *   <li>ADMIN → vue globale ;</li>
 *   <li>CUP → UP de sa fiche enseignant ;</li>
 *   <li>CHEF_DEPARTEMENT → département de sa fiche enseignant ;</li>
 *   <li>autres rôles autorisés en lecture KPI (ANIMATEUR,
 *       RESPONSABLE_DOSSIER) → vue globale (inchangée).</li>
 * </ul>
 * Deny-by-default : un CUP/chef sans fiche ou sans UP/département résolu
 * reçoit l'id sentinelle {@link #NO_SCOPE_ID} (ne matche aucune formation)
 * — jamais la vue globale.
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class KpiScopeService {

    /** Id sentinelle ne matchant aucun référentiel : périmètre vide forcé. */
    public static final String NO_SCOPE_ID = "__scope_indetermine__";

    private static final String ROLE_ADMIN = "ADMIN";
    private static final String ROLE_CUP = "CUP";
    private static final String ROLE_CHEF_DEPARTEMENT = "CHEF_DEPARTEMENT";

    private final EnseignantRepository enseignantRepository;

    /** Périmètre KPI résolu pour l'appelant (upId/deptId null = vue globale). */
    public record KpiScope(String upId, String deptId) {
        public boolean global() {
            return upId == null && deptId == null;
        }
    }

    /** Résout le périmètre KPI de l'utilisateur connecté (JWT + fiche enseignant). */
    public KpiScope resolveScope() {
        CurrentUser user = currentUser();
        if (user.hasRole(ROLE_ADMIN)) {
            return new KpiScope(null, null);
        }
        if (user.hasRole(ROLE_CUP)) {
            String upId = findOwnFiche(user)
                    .map(e -> e.getUp() != null ? e.getUp().getId() : null)
                    .orElse(null);
            return new KpiScope(upId != null ? upId : NO_SCOPE_ID, null);
        }
        if (user.hasRole(ROLE_CHEF_DEPARTEMENT)) {
            String deptId = findOwnFiche(user)
                    .map(e -> e.getDept() != null ? e.getDept().getId() : null)
                    .orElse(null);
            return new KpiScope(null, deptId != null ? deptId : NO_SCOPE_ID);
        }
        // ANIMATEUR / RESPONSABLE_DOSSIER : vue globale (DASHBOARD_ADMIN_LIMITED).
        return new KpiScope(null, null);
    }

    /** Utilisateur connecté depuis le SecurityContext (JWT). */
    private CurrentUser currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof Jwt jwt)) {
            throw new AccessDeniedException("Authentification requise.");
        }
        return CurrentUser.fromJwt(jwt);
    }

    /** Fiche enseignant de l'utilisateur connecté (par userId puis email). */
    private Optional<Enseignant> findOwnFiche(CurrentUser user) {
        Optional<Enseignant> fiche = Optional.empty();
        if (user.userId() != null && !user.userId().isBlank()) {
            fiche = enseignantRepository.findByUserId(user.userId());
        }
        if (fiche.isEmpty() && user.email() != null && !user.email().isBlank()) {
            fiche = enseignantRepository.findByMailIgnoreCase(user.email());
        }
        return fiche;
    }
}