package esprit.pfe.serviceformation.services.animator;

import esprit.pfe.serviceformation.entities.Enseignant;
import esprit.pfe.serviceformation.entities.Formation;
import esprit.pfe.serviceformation.exception.AccessDeniedException;
import esprit.pfe.serviceformation.exception.ResourceNotFoundException;
import esprit.pfe.serviceformation.repositories.EnseignantRepository;
import esprit.pfe.serviceformation.repositories.FormationRepository;
import esprit.pfe.serviceformation.services.CurrentUser;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.stereotype.Service;

import java.util.Optional;

/**
 * Périmètre d'animation résolu côté backend (JAMAIS depuis le frontend).
 *
 * <ul>
 *   <li>ADMIN → périmètre global ;</li>
 *   <li>CUP → UP de sa fiche enseignant ;</li>
 *   <li>CHEF_DEPARTEMENT → département de sa fiche enseignant ;</li>
 *   <li>ENSEIGNANT / ANIMATEUR → son propre compte uniquement.</li>
 * </ul>
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class AnimatorScopeService {

    /** Rôles fonctionnels du workflow d'animation (claims JWT sans préfixe ROLE_). */
    private static final String ROLE_CHEF_DEPARTEMENT = "CHEF_DEPARTEMENT";
    private static final String ROLE_CUP = "CUP";

    private final EnseignantRepository enseignantRepository;
    private final FormationRepository formationRepository;

    /** Périmètre résolu pour l'utilisateur connecté. */
    public record ResolvedAnimatorScope(
            CurrentUser user,
            String upCode,
            String departmentCode,
            boolean global) {
    }

    /** Utilisateur connecté depuis le SecurityContext (JWT). */
    public CurrentUser currentUser() {
        Authentication auth = SecurityContextHolder.getContext().getAuthentication();
        if (auth == null || !auth.isAuthenticated() || !(auth.getPrincipal() instanceof Jwt jwt)) {
            throw new AccessDeniedException("Authentification requise.");
        }
        return CurrentUser.fromJwt(jwt);
    }

    /** Résout le périmètre UP / département de l'utilisateur connecté. */
    public ResolvedAnimatorScope resolveScope() {
        CurrentUser user = currentUser();
        if (user.isAdmin()) {
            return new ResolvedAnimatorScope(user, null, null, true);
        }
        Optional<Enseignant> fiche = findOwnFiche(user);
        if (user.hasRole(ROLE_CHEF_DEPARTEMENT)) {
            String deptId = fiche.map(e -> e.getDept() != null ? e.getDept().getId() : null).orElse(null);
            if (deptId == null) {
                // Deny-by-default : un chef sans département résolu n'a aucun périmètre.
                throw new AccessDeniedException(
                        "Périmètre indéterminé : aucun département rattaché à votre compte.");
            }
            return new ResolvedAnimatorScope(user, null, deptId, false);
        }
        if (user.hasRole(ROLE_CUP)) {
            String upId = fiche.map(e -> e.getUp() != null ? e.getUp().getId() : null).orElse(null);
            if (upId == null) {
                throw new AccessDeniedException(
                        "Périmètre indéterminé : aucune UP rattachée à votre compte.");
            }
            return new ResolvedAnimatorScope(user, upId, null, false);
        }
        return new ResolvedAnimatorScope(user, null, null, false);
    }

    /**
     * Vérifie que le responsable peut agir sur les propositions d'une formation
     * selon son périmètre (UP pour CUP, département pour chef, global pour ADMIN).
     */
    public void ensureCanManageFormation(Formation formation, ResolvedAnimatorScope scope) {
        if (scope.global()) {
            return;
        }
        if (scope.user().hasRole(ROLE_CUP)) {
            String formationUp = formation.getUp() != null ? formation.getUp().getId() : null;
            if (formationUp == null || !formationUp.equals(scope.upCode())) {
                throw new AccessDeniedException(
                        "Périmètre interdit : cette formation n'appartient pas à votre UP ("
                                + scope.upCode() + ").");
            }
            return;
        }
        if (scope.user().hasRole(ROLE_CHEF_DEPARTEMENT)) {
            String formationDept = formation.getDepartement() != null ? formation.getDepartement().getId() : null;
            if (formationDept == null || !formationDept.equals(scope.departmentCode())) {
                throw new AccessDeniedException(
                        "Périmètre interdit : cette formation n'appartient pas à votre département ("
                                + scope.departmentCode() + ").");
            }
        }
    }

    /** Vérifie qu'un CUP ne propose que des enseignants de son UP. */
    public void ensureProposerInScope(Enseignant proposer, ResolvedAnimatorScope scope) {
        if (scope.global()) {
            return;
        }
        if (scope.user().hasRole(ROLE_CUP)) {
            String proposerUp = proposer.getUp() != null ? proposer.getUp().getId() : null;
            if (proposerUp == null || !proposerUp.equals(scope.upCode())) {
                throw new AccessDeniedException(
                        "Périmètre interdit : cet enseignant n'appartient pas à votre UP ("
                                + scope.upCode() + ").");
            }
            return;
        }
        if (scope.user().hasRole(ROLE_CHEF_DEPARTEMENT)) {
            String proposerDept = proposer.getDept() != null ? proposer.getDept().getId() : null;
            if (proposerDept == null || !proposerDept.equals(scope.departmentCode())) {
                throw new AccessDeniedException(
                        "Périmètre interdit : cet enseignant n'appartient pas à votre département ("
                                + scope.departmentCode() + ").");
            }
        }
    }

    /** Charge une formation ou lève 404. */
    public Formation requireFormation(Long formationId) {
        return formationRepository.findById(formationId)
                .orElseThrow(() -> new ResourceNotFoundException(
                        "Formation introuvable : " + formationId));
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
