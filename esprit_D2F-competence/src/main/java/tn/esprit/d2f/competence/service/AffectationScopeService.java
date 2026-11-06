package tn.esprit.d2f.competence.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;
import tn.esprit.d2f.competence.dto.PerimetreAffectationDTO;
import tn.esprit.d2f.competence.repository.EnseignantScopePort;
import tn.esprit.d2f.competence.repository.EnseignantScopePort.Fiche;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Optional;
import java.util.Set;

/**
 * Périmètre d'<b>écriture</b> des affectations enseignant ↔ savoirs, résolu
 * côté serveur (JAMAIS depuis le frontend) :
 * <ul>
 *   <li>ADMIN → périmètre global ;</li>
 *   <li>CUP → les enseignants de son UP ;</li>
 *   <li>CHEF_DEPARTEMENT → les enseignants de son département ;</li>
 *   <li>autres rôles → périmètre vide (aucune écriture).</li>
 * </ul>
 *
 * <p>Le périmètre est déduit de la fiche enseignant de l'utilisateur connecté
 * (annuaire {@code formation.enseignants}, lu en lecture seule), exactement
 * comme {@code KpiScopeService} du service formation : la même personne est
 * donc CUP de la même UP dans les deux services.</p>
 *
 * <p><b>Deny-by-default</b> : un CUP/chef sans fiche, sans UP/département, ou
 * dont l'enseignant ciblé n'appartient pas au périmètre reçoit un 403 — jamais
 * un accès global implicite.</p>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AffectationScopeService {

    /** Id sentinelle ne matchant aucun enseignant : périmètre vide forcé. */
    public static final String NO_SCOPE_ID = "__perimetre_indetermine__";

    static final String ROLE_ADMIN = "ADMIN";
    static final String ROLE_CUP = "CUP";
    static final String ROLE_CHEF_DEPARTEMENT = "CHEF_DEPARTEMENT";

    private final EnseignantScopePort enseignantScopePort;

    /**
     * Périmètre résolu pour l'appelant.
     *
     * @param global        vrai pour un ADMIN : aucune restriction
     * @param upId          UP du CUP (jamais null si le périmètre vient d'une UP)
     * @param deptId        département du chef (jamais null si le périmètre vient d'un département)
     * @param enseignantIds identifiants des enseignants du périmètre (vide si global)
     */
    public record Perimetre(boolean global, String upId, String deptId, List<String> enseignantIds) {

        static Perimetre none() {
            return new Perimetre(false, null, null, List.of());
        }

        boolean empty() {
            return !global && upId == null && deptId == null;
        }
    }

    /** Périmètre de l'utilisateur connecté (JWT + fiche enseignant). */
    public Perimetre currentPerimetre() {
        Set<String> roles = currentRoles();

        if (roles.contains(ROLE_ADMIN)) {
            return new Perimetre(true, null, null, List.of());
        }
        if (!roles.contains(ROLE_CUP) && !roles.contains(ROLE_CHEF_DEPARTEMENT)) {
            // Rôle non habilité à écrire des affectations : périmètre vide.
            return Perimetre.none();
        }

        Optional<Fiche> own = enseignantScopePort.findOwnFiche(currentUserId(), currentEmail());
        if (own.isEmpty()) {
            log.warn("Périmètre d'affectation indéterminé : aucune fiche enseignant "
                    + "pour l'utilisateur connecté");
            return Perimetre.none();
        }

        String upId = roles.contains(ROLE_CUP)
                ? normalize(own.get().upId(), NO_SCOPE_ID)
                : null;
        String deptId = roles.contains(ROLE_CHEF_DEPARTEMENT)
                ? normalize(own.get().deptId(), NO_SCOPE_ID)
                : null;
        return new Perimetre(false, upId, deptId, findEnseignantIds(upId, deptId));
    }

    /**
     * Vérifie que l'appelant peut écrire une affectation pour cet enseignant.
     *
     * @throws AccessDeniedException si l'enseignant est hors du périmètre
     *                               (ou absent de l'annuaire)
     */
    public void assertCanManage(String enseignantId) {
        Perimetre perimetre = currentPerimetre();
        if (perimetre.global()) {
            return;
        }
        String cible = enseignantId == null ? "" : enseignantId.trim();
        if (cible.isEmpty() || perimetre.empty()) {
            throw new AccessDeniedException("Enseignant hors de votre périmètre d'affectation");
        }

        Optional<Fiche> fiche = enseignantScopePort.findById(cible);
        boolean upOk = isScopeMatch(perimetre.upId(), fiche.map(Fiche::upId).orElse(null));
        boolean deptOk = isScopeMatch(perimetre.deptId(), fiche.map(Fiche::deptId).orElse(null));
        if (!upOk && !deptOk) {
            log.warn("Affectation refusée hors périmètre : enseignant={}, up={}, dept={}",
                    cible, perimetre.upId(), perimetre.deptId());
            throw new AccessDeniedException(
                    "Enseignant hors de votre périmètre : seuls les enseignants de votre UP "
                            + "ou de votre département peuvent être affectés");
        }
    }

    /** Périmètre exposé au frontend (filtrage de l'affichage, jamais de décision). */
    public PerimetreAffectationDTO describePerimetre() {
        Perimetre perimetre = currentPerimetre();
        return PerimetreAffectationDTO.builder()
                .global(perimetre.global())
                .upId(perimetre.upId())
                .deptId(perimetre.deptId())
                .enseignantIds(new ArrayList<>(perimetre.enseignantIds()))
                .build();
    }

    // ── Résolution ───────────────────────────────────────────────────────────

    private Set<String> currentRoles() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated()) {
            throw new AccessDeniedException("Authentification requise.");
        }
        Set<String> roles = new LinkedHashSet<>();
        if (auth.getPrincipal() instanceof Jwt jwt) {
            String scope = jwt.getClaimAsString("scope");
            if (scope != null) {
                Arrays.stream(scope.split("\\s+"))
                        .map(AffectationScopeService::normalizeRole)
                        .filter(role -> !role.isEmpty())
                        .forEach(roles::add);
            }
        }
        // Repli : autorités chargées par Spring Security (tests, appels système).
        auth.getAuthorities().forEach(a -> {
            String role = normalizeRole(a.getAuthority());
            if (!role.isEmpty()) {
                roles.add(role);
            }
        });
        return roles;
    }

    private static String currentUserId() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            return normalize(jwt.getClaimAsString("userId"), "");
        }
        return "";
    }

    private static String currentEmail() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth != null && auth.getPrincipal() instanceof Jwt jwt) {
            return normalize(jwt.getClaimAsString("email"), "");
        }
        return "";
    }

    private static String normalizeRole(String authority) {
        if (authority == null) {
            return "";
        }
        String role = authority.trim().toUpperCase(Locale.ROOT);
        return role.startsWith("ROLE_") ? role.substring("ROLE_".length()) : role;
    }

    /**
     * Identifiants des enseignants du périmètre (pour l'affichage côté client).
     * Un CUP et un chef cumulés voient l'union des deux ensembles.
     */
    private List<String> findEnseignantIds(String upId, String deptId) {
        String up = isUsableScope(upId) ? upId : null;
        String dept = isUsableScope(deptId) ? deptId : null;
        if (up == null && dept == null) {
            return List.of();
        }
        return enseignantScopePort.findIds(up, dept);
    }

    private static boolean isUsableScope(String scope) {
        return scope != null && !scope.isBlank() && !NO_SCOPE_ID.equals(scope);
    }

    /** Rapprochement tolérant (codes UP / département saisis à la main). */
    private static boolean isScopeMatch(String expected, String actual) {
        return isUsableScope(expected) && actual != null && expected.equalsIgnoreCase(actual.trim());
    }

    private static String normalize(String value, String fallback) {
        return value == null || value.isBlank() ? fallback : value.trim();
    }
}
