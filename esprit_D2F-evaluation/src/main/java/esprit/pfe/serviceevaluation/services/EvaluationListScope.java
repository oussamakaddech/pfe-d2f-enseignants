package esprit.pfe.serviceevaluation.services;

import esprit.pfe.serviceevaluation.client.FormationClient;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;

/**
 * Périmètre de lecture des évaluations : global (ADMIN / ANIMATEUR) ou limité
 * aux évaluations de l'appelant.
 *
 * <p>Cette logique était dupliquée à l'identique (~45 lignes) dans
 * {@code EvaluationFormateurService} et {@code EvaluationGlobaleService} : une
 * correction sur l'une des copies ne suivait pas sur l'autre. Elle est extraite
 * ici, à comportement strictement inchangé.</p>
 */
final class EvaluationListScope {

    private static final String ROLE_ADMIN = "ROLE_ADMIN";
    private static final String ROLE_ANIMATEUR = "ROLE_ANIMATEUR";

    private EvaluationListScope() {
    }

    /** Périmètre de lecture : global (ADMIN/ANIMATEUR) ou évaluations personnelles. */
    record ListScope(boolean global, String ficheId) {
    }

    /** Périmètre de l'appelant courant, déduit du {@code SecurityContext}. */
    static ListScope resolve(FormationClient formationClient) {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            return new ListScope(false, null);
        }
        boolean global = auth.getAuthorities().stream().anyMatch(a ->
                ROLE_ADMIN.equals(a.getAuthority()) || ROLE_ANIMATEUR.equals(a.getAuthority()));
        if (global) {
            return new ListScope(true, null);
        }
        return new ListScope(false, resolveFicheId(formationClient, callerIdentity(auth)));
    }

    /** Identité de l'appelant : claim {@code email} du JWT, sinon nom du principal. */
    static String callerIdentity(Authentication auth) {
        Object principal = auth.getPrincipal();
        if (principal instanceof Jwt jwt) {
            String email = jwt.getClaimAsString("email");
            if (email != null && !email.isBlank()) {
                return email;
            }
        }
        return auth.getName();
    }

    /** Résout l'id de fiche via le service formation (accepte id ou mail). */
    static String resolveFicheId(FormationClient formationClient, String identity) {
        if (identity == null || identity.isBlank()) {
            return null;
        }
        try {
            Object found = formationClient.getEnseignantById(identity);
            if (found instanceof java.util.Map<?, ?> map) {
                Object id = map.get("id");
                return id != null ? String.valueOf(id) : null;
            }
            if (found instanceof String s && !s.isBlank()) {
                return s;
            }
            return null;
        } catch (Exception e) {
            return null;
        }
    }
}
